import type { BaniDbClient } from "../banidb/client";
import { primaryEnglish } from "../banidb/normalize";
import type { ChatTurn, JsonLlm, LlmUsage } from "../ai/llm";
import { findUncitedReferences, parseSegments, sanitizeAnswer, validateAnswer, type Segment } from "../citations/validate";
import type { NamedRef, Source, Translation } from "../types";
import { buildAnswerPrompt, correctionPrompt, generateAnswer, type GeneratedAnswer } from "./answer";
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
  answer: string;
  segments: Segment[];
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

export const GENERAL_KNOWLEDGE_LABEL = "General knowledge: not verified against Sikh sources.";
export const PARTLY_GENERAL_LABEL = "Parts of this answer are general knowledge, not verified against Sikh sources.";
export const HISTORY_LABEL = "Historical details here are general knowledge, not verified against Sikh sources.";

const MAX_QUESTION_CHARS = 500;
const MAX_HISTORY_TURNS = 6;

export async function ask(deps: PipelineDeps, question: string, history: ChatTurn[] = []): Promise<AskResult> {
  const q = question.trim().slice(0, MAX_QUESTION_CHARS);
  const steps: LlmUsage[] = [];
  const recent = history.slice(-MAX_HISTORY_TURNS);

  const { expansion, judged } = await findPassages(deps, q, recent, steps);

  const messages: ChatTurn[] = [...recent, { role: "user", content: buildAnswerPrompt(q, expansion, judged) }];
  let { answer, usage } = await generateAnswer(deps.llm, messages);
  steps.push(usage);

  let report = validateAnswer(answer.answer, judged.map((j) => j.verse));
  const passedFirstTime = report.ok;
  let retried = false;
  if (!report.ok) {
    retried = true;
    const retry = await generateAnswer(deps.llm, [
      ...messages,
      { role: "assistant", content: JSON.stringify(answer) },
      { role: "user", content: correctionPrompt(report) },
    ]);
    steps.push(retry.usage);
    answer = retry.answer;
    report = validateAnswer(answer.answer, judged.map((j) => j.verse));
  }
  const sanitized = !report.ok;
  const text = sanitized ? sanitizeAnswer(answer.answer, report) : answer.answer;

  const byId = new Map(judged.map((j) => [j.verse.verseId, j]));
  const passages = report.cited.map((id) => toPassage(byId.get(id)!));

  return {
    question: q,
    category: expansion.category,
    basis: answer.basis,
    sourceLabel: labelFor(expansion.category, answer.basis),
    answer: text,
    segments: parseSegments(text),
    passages,
    followUps: answer.followUps.slice(0, 3),
    citationCheck: { passedFirstTime, retried, sanitized, uncitedReferences: findUncitedReferences(text) },
    usage: summarize(steps),
  };
}

/** Explore mode: Gurbani first, with only a short relevance note per passage. No answer-model call. */
export async function explore(deps: PipelineDeps, question: string): Promise<ExploreResult> {
  const q = question.trim().slice(0, MAX_QUESTION_CHARS);
  const steps: LlmUsage[] = [];
  const { expansion, judged } = await findPassages(deps, q, [], steps);
  return { question: q, category: expansion.category, passages: judged.map(toPassage), usage: summarize(steps) };
}

async function findPassages(deps: PipelineDeps, q: string, history: ChatTurn[], steps: LlmUsage[]) {
  const { expansion, usage } = await expandQuestion(deps.llm, q, history);
  steps.push(usage);
  const candidates = await retrieveCandidates(deps.banidb, expansion.searchTerms);
  const judgement = await judgeCandidates(deps.llm, q, candidates);
  if (judgement.usage) steps.push(judgement.usage);
  return { expansion, judged: judgement.kept };
}

export function labelFor(category: Expansion["category"], basis: GeneratedAnswer["basis"]): string | null {
  if (basis === "general_knowledge") return GENERAL_KNOWLEDGE_LABEL;
  if (category === "history") return HISTORY_LABEL;
  if (basis === "gurbani_and_general") return PARTLY_GENERAL_LABEL;
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
