import type { BaniDbClient } from "../banidb/client";
import { primaryEnglish } from "../banidb/normalize";
import type { ChatTurn, JsonLlm, LlmUsage } from "../ai/llm";
import { findUncitedReferences, parseSegments, sanitizeAnswer, validateAnswer, type Segment } from "../citations/validate";
import type { NamedRef, Source, Translation } from "../types";
import { answerText, buildAnswerPrompt, correctionPrompt, generateAnswer, type GeneratedAnswer, type Language } from "./answer";
import { expandQuestion, type Expansion } from "./expand";
import { judgeCandidates, type JudgedCandidate } from "./judge";
import { retrieveCandidates } from "./retrieve";

export interface PipelineDeps {
  llm: JsonLlm;
  banidb: Pick<BaniDbClient, "searchTranslations" | "getShabad">;
}

/** One line of a passage. All text comes from BaniDB. */
export interface PassageLine {
  verseId: number;
  ang: number;
  gurmukhi: string;
  transliteration: string | null;
  translation: Translation | null;
  translations: Translation[];
}

/** A Gurbani passage ready to render as a card: one complete sentence, which may span lines. */
export interface Passage {
  /** The verse the answer cites. Always one of `lines`. */
  verseId: number;
  shabadId: number;
  /** Ang of the cited verse. Lines can occasionally cross onto the next Ang; each line has its own. */
  ang: number;
  source: Source;
  writer: NamedRef | null;
  raag: NamedRef | null;
  lines: PassageLine[];
  /** Why the passage was judged relevant (model-written commentary, not scripture). */
  relevanceNote: string;
}

export interface UsageSummary {
  steps: LlmUsage[];
  totalCostUsd: number;
}

export interface AskResult {
  question: string;
  category: Expansion["category"];
  basis: GeneratedAnswer["basis"];
  /** Shown above the answer when parts of it are not verified against sources. */
  sourceLabel: string | null;
  /** The main answer paragraph, with inline citation markers split out. */
  summary: Segment[];
  /** Optional deeper sections shown below the Gurbani. */
  sections: { title: string; segments: Segment[] }[];
  /** All answer text as one string (summary then sections), for conversation history and reports. */
  answer: string;
  /** Every cited passage, in order of first citation. */
  passages: Passage[];
  followUps: string[];
  citationCheck: {
    passedFirstTime: boolean;
    retried: boolean;
    sanitized: boolean;
    /** Sentences that seem to draw on Gurbani that was not cited. Advisory, for reviewers. */
    uncitedReferences: string[];
  };
  usage: UsageSummary;
}

export interface ExploreResult {
  question: string;
  category: Expansion["category"];
  passages: Passage[];
  usage: UsageSummary;
}

export const GENERAL_KNOWLEDGE_LABEL = "This answer draws on history and general knowledge, not on Gurbani passages.";
export const PARTLY_GENERAL_LABEL = "Parts of this answer draw on general knowledge beyond the Gurbani shown.";
export const HISTORY_LABEL = "Historical details come from documented history, not from Gurbani. For specifics, see trusted Sikh historical sources.";

const MAX_QUESTION_CHARS = 500;
const MAX_HISTORY_TURNS = 6;

/** Pipeline stages, in order, for progress indicators. */
export type Stage = "understanding" | "searching" | "reading" | "writing" | "checking" | "researching";

export interface PipelineOptions {
  /** Called as each stage starts. */
  onStage?: (stage: Stage) => void;
  /** Language the answer is written in. Default English. */
  language?: Language;
}

export async function ask(
  deps: PipelineDeps,
  question: string,
  history: ChatTurn[] = [],
  options: PipelineOptions = {},
): Promise<AskResult> {
  const q = question.trim().slice(0, MAX_QUESTION_CHARS);
  const steps: LlmUsage[] = [];
  const recent = history.slice(-MAX_HISTORY_TURNS);
  const stage = options.onStage ?? (() => {});

  const { expansion, judged } = await findPassages(deps, q, recent, steps, stage);

  stage("writing");
  const language = options.language ?? "en";
  const check = { gurmukhiProse: language === "pa" };
  const messages: ChatTurn[] = [...recent, { role: "user", content: buildAnswerPrompt(q, expansion, judged, language) }];
  let { answer, usage } = await generateAnswer(deps.llm, messages);
  steps.push(usage);

  stage("checking");
  let report = validateAnswer(answerText(answer), judged.map((j) => j.verse), check);
  const passedFirstTime = report.ok;
  let retried = false;
  if (!report.ok) {
    retried = true;
    const retry = await generateAnswer(deps.llm, [
      ...messages,
      { role: "assistant", content: JSON.stringify(answer) },
      { role: "user", content: correctionPrompt(report, language) },
    ]);
    steps.push(retry.usage);
    answer = retry.answer;
    report = validateAnswer(answerText(answer), judged.map((j) => j.verse), check);
  }
  const sanitized = !report.ok;
  const clean = (t: string) => (sanitized ? sanitizeAnswer(t, report, check) : t.trim());
  const summary = clean(answer.summary);
  const sections = answer.sections
    .slice(0, 3)
    .map((s) => ({ title: s.title.trim(), body: clean(s.body) }))
    .filter((s) => s.title && s.body);
  const text = answerText({ summary, sections });

  const byId = new Map(judged.map((j) => [j.verse.verseId, j]));
  const passages = report.cited.map((id) => toPassage(byId.get(id)!));

  return {
    question: q,
    category: expansion.category,
    basis: answer.basis,
    sourceLabel: labelFor(expansion.category, answer.basis, language),
    summary: parseSegments(summary),
    sections: sections.map((s) => ({ title: s.title, segments: parseSegments(s.body) })),
    answer: text,
    passages,
    followUps: answer.followUps.slice(0, 3),
    citationCheck: { passedFirstTime, retried, sanitized, uncitedReferences: findUncitedReferences(text) },
    usage: summarize(steps),
  };
}

/** Explore mode: Gurbani first, with only a short relevance note per passage. No answer-model call. */
export async function explore(deps: PipelineDeps, question: string, options: PipelineOptions = {}): Promise<ExploreResult> {
  const q = question.trim().slice(0, MAX_QUESTION_CHARS);
  const steps: LlmUsage[] = [];
  const { expansion, judged } = await findPassages(deps, q, [], steps, options.onStage ?? (() => {}));
  return { question: q, category: expansion.category, passages: judged.map(toPassage), usage: summarize(steps) };
}

async function findPassages(deps: PipelineDeps, q: string, history: ChatTurn[], steps: LlmUsage[], stage: (s: Stage) => void) {
  stage("understanding");
  const { expansion, usage } = await expandQuestion(deps.llm, q, history);
  steps.push(usage);
  stage("searching");
  const candidates = await retrieveCandidates(deps.banidb, expansion.searchTerms);
  stage("reading");
  const judgement = await judgeCandidates(deps.llm, q, candidates);
  if (judgement.usage) steps.push(judgement.usage);
  return { expansion, judged: judgement.kept };
}

/** Punjabi versions of the source labels. Reviewed wording is welcome. */
const LABELS_PA = {
  general: "ਇਹ ਜਵਾਬ ਇਤਿਹਾਸ ਅਤੇ ਆਮ ਜਾਣਕਾਰੀ 'ਤੇ ਅਧਾਰਿਤ ਹੈ, ਗੁਰਬਾਣੀ ਦੀਆਂ ਪੰਕਤੀਆਂ 'ਤੇ ਨਹੀਂ।",
  partly: "ਇਸ ਜਵਾਬ ਦੇ ਕੁਝ ਹਿੱਸੇ ਦਿਖਾਈ ਗਈ ਗੁਰਬਾਣੀ ਤੋਂ ਇਲਾਵਾ ਆਮ ਜਾਣਕਾਰੀ 'ਤੇ ਅਧਾਰਿਤ ਹਨ।",
  history: "ਇਤਿਹਾਸਕ ਵੇਰਵੇ ਦਸਤਾਵੇਜ਼ੀ ਇਤਿਹਾਸ ਤੋਂ ਹਨ, ਗੁਰਬਾਣੀ ਤੋਂ ਨਹੀਂ। ਵਿਸਥਾਰ ਲਈ ਭਰੋਸੇਯੋਗ ਸਿੱਖ ਇਤਿਹਾਸਕ ਸਰੋਤ ਵੇਖੋ।",
};

export function labelFor(category: Expansion["category"], basis: GeneratedAnswer["basis"], language: Language = "en"): string | null {
  const pa = language === "pa";
  if (basis === "general_knowledge") return pa ? LABELS_PA.general : GENERAL_KNOWLEDGE_LABEL;
  if (category === "history") return pa ? LABELS_PA.history : HISTORY_LABEL;
  if (basis === "gurbani_and_general") return pa ? LABELS_PA.partly : PARTLY_GENERAL_LABEL;
  return null;
}

function toPassage(j: JudgedCandidate): Passage {
  return {
    verseId: j.verse.verseId,
    shabadId: j.shabadId,
    ang: j.verse.ang,
    source: j.source,
    writer: j.writer,
    raag: j.raag,
    lines: j.lines.map((v) => ({
      verseId: v.verseId,
      ang: v.ang,
      gurmukhi: v.gurmukhi,
      transliteration: v.transliteration,
      translation: primaryEnglish(v),
      translations: v.translations,
    })),
    relevanceNote: j.reason,
  };
}

function summarize(steps: LlmUsage[]): UsageSummary {
  return { steps, totalCostUsd: Number(steps.reduce((s, u) => s + u.costUsd, 0).toFixed(6)) };
}
