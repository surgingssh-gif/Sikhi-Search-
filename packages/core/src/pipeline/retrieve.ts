import type { BaniDbClient } from "../banidb/client";
import { primaryEnglish } from "../banidb/normalize";
import type { NamedRef, Shabad, Source, Verse } from "../types";

/** A verse found by search, with enough of its shabad around it to judge it fairly. */
export interface Candidate {
  verse: Verse;
  shabadId: number;
  source: Source;
  writer: NamedRef | null;
  raag: NamedRef | null;
  /** Search terms that found this verse. */
  matchedTerms: string[];
  /**
   * The lines shown together on the card: the matched verse plus any lines
   * needed to complete its sentence (BaniDB often splits one sentence across
   * two lines). Always contains `verse`.
   */
  lines: Verse[];
  /** Nearby lines and the Rahao (central) line(s) of the shabad, in order. Excludes `lines`. */
  context: Verse[];
}

export interface RetrieveOptions {
  maxCandidates?: number;
  resultsPerTerm?: number;
  /** Lines of context on each side of the matched verse. */
  contextRadius?: number;
}

const RAHAO = "ਰਹਾਉ";

interface VerseMatch {
  hit: { verse: Verse; source: Source; writer: NamedRef | null; raag: NamedRef | null };
  terms: string[];
  score: number;
  order: number;
}

export async function retrieveCandidates(
  banidb: Pick<BaniDbClient, "searchTranslations" | "getShabad">,
  searchTerms: string[],
  options: RetrieveOptions = {},
): Promise<Candidate[]> {
  const { maxCandidates = 20, resultsPerTerm = 500, contextRadius = 2 } = options;
  if (searchTerms.length === 0) return [];

  const searches = await Promise.allSettled(
    searchTerms.map((term) => banidb.searchTranslations(term, { results: resultsPerTerm }).then((r) => ({ term, r }))),
  );
  if (searches.every((s) => s.status === "rejected")) {
    throw (searches[0] as PromiseRejectedResult).reason;
  }

  // BaniDB's "full word" translation search matches substrings ("meat" finds
  // "permeating") and returns results in Ang order, so keep only true
  // whole-word matches and rank them ourselves. Rarer terms count for more.
  const byVerse = new Map<number, VerseMatch>();
  const termWeight = new Map<string, number>();
  let order = 0;
  for (const s of searches) {
    if (s.status !== "fulfilled") continue;
    const word = wholeWord(s.value.term);
    const hits = s.value.r.hits.filter((h) => matchesTranslation(h.verse, word));
    const weight = 1 / Math.log2(2 + hits.length);
    termWeight.set(s.value.term, weight);
    for (const hit of hits) {
      const existing = byVerse.get(hit.verse.verseId);
      if (existing) {
        existing.terms.push(s.value.term);
        existing.score += weight;
      } else {
        byVerse.set(hit.verse.verseId, { hit, terms: [s.value.term], score: weight, order: order++ });
      }
    }
  }

  // A shabad that returns to a term in several lines is likely about it, so
  // each term scores weight × (1 + ½·log2(lines in the shabad matching it)).
  // The log keeps long compositions from winning on length alone. Each
  // shabad is represented by its best line; ties keep search order.
  const byShabad = new Map<number, { best: VerseMatch; lineCounts: Map<string, number> }>();
  for (const m of byVerse.values()) {
    let s = byShabad.get(m.hit.verse.shabadId);
    if (!s) byShabad.set(m.hit.verse.shabadId, (s = { best: m, lineCounts: new Map() }));
    else if (m.score > s.best.score) s.best = m;
    for (const t of m.terms) s.lineCounts.set(t, (s.lineCounts.get(t) ?? 0) + 1);
  }
  const shabadScore = (s: { lineCounts: Map<string, number> }) =>
    [...s.lineCounts].reduce((sum, [t, n]) => sum + termWeight.get(t)! * (1 + 0.5 * Math.log2(n)), 0);
  const picked = [...byShabad.values()]
    .map((s) => ({ s, score: shabadScore(s) }))
    .sort((a, b) => b.score - a.score || a.s.best.order - b.s.best.order)
    .slice(0, maxCandidates)
    .map(({ s }) => s.best);

  const shabads = await mapLimit(picked, 4, (p) => banidb.getShabad(p.hit.verse.shabadId).catch(() => null));

  return picked.map((p, i) => {
    const shabad = shabads[i] ?? null;
    const span = sentenceSpan(shabad, p.hit.verse.verseId);
    return {
      verse: p.hit.verse,
      shabadId: p.hit.verse.shabadId,
      source: p.hit.source,
      writer: p.hit.writer,
      raag: p.hit.raag,
      matchedTerms: p.terms,
      lines: span ? shabad!.verses.slice(span[0], span[1] + 1) : [p.hit.verse],
      context: contextFor(shabad, p.hit.verse.verseId, contextRadius, span),
    };
  });
}

function wholeWord(term: string): RegExp {
  return new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
}

/** Whole-word match against the English translations we trust line-by-line (not `ms`, see ENGLISH_PREFERENCE). */
function matchesTranslation(v: Verse, word: RegExp): boolean {
  return v.translations.some((t) => t.language === "en" && t.key !== "ms" && word.test(t.text));
}

/** Max lines added on each side to complete a sentence. */
const MAX_SENTENCE_EXTENSION = 2;
/** A numbered verse marker like ॥੧॥ or ॥੪॥੪੮॥੧੧੭॥ ends a couplet or stanza. */
const NUMBERED_MARKER = /॥[੦-੯]+॥/;

/** Index range [start, end] of the lines that complete the verse's sentence, or null if the verse isn't in the shabad. */
export function sentenceSpan(shabad: Shabad | null, verseId: number): [number, number] | null {
  if (!shabad) return null;
  const i = shabad.verses.findIndex((v) => v.verseId === verseId);
  if (i === -1) return null;
  const vs = shabad.verses;
  let start = i;
  while (
    i - start < MAX_SENTENCE_EXTENSION &&
    start > 0 &&
    startsMidSentence(englishOf(vs[start]!)) &&
    !NUMBERED_MARKER.test(vs[start - 1]!.gurmukhi)
  ) {
    start--;
  }
  let end = i;
  while (
    end - i < MAX_SENTENCE_EXTENSION &&
    end < vs.length - 1 &&
    !NUMBERED_MARKER.test(vs[end]!.gurmukhi) &&
    endsMidSentence(englishOf(vs[end]!))
  ) {
    end++;
  }
  return [start, end];
}

function englishOf(v: Verse): string {
  return primaryEnglish(v)?.text ?? "";
}

/** "forget to feel jealous of others." or "- they do not waver" continue the line before. */
export function startsMidSentence(text: string): boolean {
  return /^\s*([a-z]|[-–—…])/.test(text);
}

/** "Those whose minds are imbued with the One Lord," continues on the next line. */
export function endsMidSentence(text: string): boolean {
  // Verse markers ("||1||", "||1||Pause||") only ever appear at the end of a translation.
  const t = text.replace(/\s*\|\|.*$/, "").trim();
  if (!t) return false;
  return !/[.!?:;"'”’)~]$/.test(t);
}

export function contextFor(shabad: Shabad | null, verseId: number, radius: number, span: [number, number] | null = null): Verse[] {
  if (!shabad) return [];
  const i = shabad.verses.findIndex((v) => v.verseId === verseId);
  if (i === -1) return [];
  const [start, end] = span ?? [i, i];
  const keep = new Set<number>();
  for (let j = Math.max(0, start - radius); j <= Math.min(shabad.verses.length - 1, end + radius); j++) keep.add(j);
  shabad.verses.forEach((v, j) => {
    if (v.gurmukhi.includes(RAHAO)) keep.add(j);
  });
  for (let j = start; j <= end; j++) keep.delete(j);
  return [...keep].sort((a, b) => a - b).map((j) => shabad.verses[j]!);
}

/** Plain-text rendering of a candidate for model prompts. Gurmukhi is deliberately left out. */
export function describeCandidate(c: Candidate): string {
  const line = (v: Verse) => primaryEnglish(v)?.text ?? "(no English translation)";
  const ctx = c.context.map((v) => `  - ${v.gurmukhi.includes(RAHAO) ? "[Rahao] " : ""}${line(v)}`).join("\n");
  return [
    `<passage id="${c.verse.verseId}">`,
    `Source: ${c.source.english}, Ang ${c.verse.ang}${c.writer ? `, ${c.writer.english}` : ""}${c.raag ? `, ${c.raag.english}` : ""}`,
    `Line: ${c.lines.map(line).join(" ")}`,
    c.context.length ? `Surrounding lines in the shabad:\n${ctx}` : "",
    `</passage>`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!);
    }
  });
  await Promise.all(workers);
  return out;
}
