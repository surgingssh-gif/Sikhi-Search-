import type { Verse } from "../types";

/**
 * Citation contract between the language model and the server.
 *
 * The model never writes Gurbani or Ang numbers of its own. It refers to a
 * retrieved verse with a marker like `[[verse:9224]]`, and the server renders
 * the Gurmukhi, translation, Ang and attribution from BaniDB data.
 *
 * This module checks that an answer keeps to that contract. It reports problems;
 * deciding whether to strip, regenerate or refuse is the answer pipeline's job.
 */

export const CITATION_PATTERN = /\[\[verse:(\d+)\]\]/g;

/**
 * Any run of Gurmukhi-block characters (U+0A00–U+0A7F) plus the danda marks
 * BaniDB uses (। ॥, which live in the Devanagari block), allowing spaces inside.
 */
const GURMUKHI_RUN = /[਀-੿।॥][਀-੿\s।॥]*/g;

/** "Ang 123", "ang 12", "Angs 4" — page references written in prose. */
const ANG_MENTION = /\bangs?\s+(\d{1,4})\b/gi;

export type Segment = { type: "text"; text: string } | { type: "citation"; verseId: number };

export interface CitationReport {
  ok: boolean;
  /** Verse ids cited, in first-appearance order, that were in the retrieved set. */
  cited: number[];
  /** Verse ids the model cited that were not retrieved for this answer. */
  unknownCitations: number[];
  /** Gurmukhi the model wrote itself. Always a violation: Gurbani is only rendered from BaniDB. */
  strayGurmukhi: string[];
  /** Ang numbers in the prose that don't match any cited verse. */
  angMismatches: number[];
}

/** Split an answer into prose and citation markers, for rendering. */
export function parseSegments(answer: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  for (const m of answer.matchAll(CITATION_PATTERN)) {
    const start = m.index;
    if (start > last) segments.push({ type: "text", text: answer.slice(last, start) });
    segments.push({ type: "citation", verseId: Number(m[1]) });
    last = start + m[0].length;
  }
  if (last < answer.length) segments.push({ type: "text", text: answer.slice(last) });
  return segments;
}

export function validateAnswer(answer: string, retrieved: Iterable<Verse>): CitationReport {
  const byId = new Map<number, Verse>();
  for (const v of retrieved) byId.set(v.verseId, v);

  const cited: number[] = [];
  const unknown: number[] = [];
  const prose: string[] = [];

  for (const seg of parseSegments(answer)) {
    if (seg.type === "text") {
      prose.push(seg.text);
      continue;
    }
    const list = byId.has(seg.verseId) ? cited : unknown;
    if (!list.includes(seg.verseId)) list.push(seg.verseId);
  }

  const proseText = prose.join(" ");
  const strayGurmukhi = [...proseText.matchAll(GURMUKHI_RUN)]
    .map((m) => m[0].trim())
    .filter((s) => s.length > 0);

  const citedAngs = new Set(cited.map((id) => byId.get(id)!.ang));
  const angMismatches = [...new Set([...proseText.matchAll(ANG_MENTION)].map((m) => Number(m[1])))].filter(
    (ang) => !citedAngs.has(ang),
  );

  return {
    ok: unknown.length === 0 && strayGurmukhi.length === 0 && angMismatches.length === 0,
    cited,
    unknownCitations: unknown,
    strayGurmukhi,
    angMismatches,
  };
}
