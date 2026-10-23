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
  /** Nearby lines and the Rahao (central) line(s) of the shabad, in order. Excludes the verse itself. */
  context: Verse[];
}

export interface RetrieveOptions {
  maxCandidates?: number;
  resultsPerTerm?: number;
  /** Lines of context on each side of the matched verse. */
  contextRadius?: number;
}

const RAHAO = "ਰਹਾਉ";

export async function retrieveCandidates(
  banidb: Pick<BaniDbClient, "searchTranslations" | "getShabad">,
  searchTerms: string[],
  options: RetrieveOptions = {},
): Promise<Candidate[]> {
  const { maxCandidates = 12, resultsPerTerm = 15, contextRadius = 2 } = options;

  const searches = await Promise.allSettled(
    searchTerms.map((term) => banidb.searchTranslations(term, { results: resultsPerTerm }).then((r) => ({ term, r }))),
  );

  const byVerse = new Map<number, { hit: { verse: Verse; source: Source; writer: NamedRef | null; raag: NamedRef | null }; terms: string[]; firstRank: number }>();
  for (const s of searches) {
    if (s.status !== "fulfilled") continue;
    s.value.r.hits.forEach((hit, rank) => {
      const existing = byVerse.get(hit.verse.verseId);
      if (existing) {
        existing.terms.push(s.value.term);
        existing.firstRank = Math.min(existing.firstRank, rank);
      } else {
        byVerse.set(hit.verse.verseId, { hit, terms: [s.value.term], firstRank: rank });
      }
    });
  }
  if (byVerse.size === 0 && searches.every((s) => s.status === "rejected")) {
    throw (searches[0] as PromiseRejectedResult | undefined)?.reason ?? new Error("BaniDB search failed");
  }

  // Verses matched by more terms first; then by search rank. One verse per shabad.
  const ranked = [...byVerse.values()].sort((a, b) => b.terms.length - a.terms.length || a.firstRank - b.firstRank);
  const picked: typeof ranked = [];
  const seenShabads = new Set<number>();
  for (const r of ranked) {
    if (seenShabads.has(r.hit.verse.shabadId)) continue;
    seenShabads.add(r.hit.verse.shabadId);
    picked.push(r);
    if (picked.length >= maxCandidates) break;
  }

  const shabads = await mapLimit(picked, 4, (p) => banidb.getShabad(p.hit.verse.shabadId).catch(() => null));

  return picked.map((p, i) => ({
    verse: p.hit.verse,
    shabadId: p.hit.verse.shabadId,
    source: p.hit.source,
    writer: p.hit.writer,
    raag: p.hit.raag,
    matchedTerms: p.terms,
    context: contextFor(shabads[i] ?? null, p.hit.verse.verseId, contextRadius),
  }));
}

export function contextFor(shabad: Shabad | null, verseId: number, radius: number): Verse[] {
  if (!shabad) return [];
  const i = shabad.verses.findIndex((v) => v.verseId === verseId);
  if (i === -1) return [];
  const keep = new Set<number>();
  for (let j = Math.max(0, i - radius); j <= Math.min(shabad.verses.length - 1, i + radius); j++) keep.add(j);
  shabad.verses.forEach((v, j) => {
    if (v.gurmukhi.includes(RAHAO)) keep.add(j);
  });
  keep.delete(i);
  return [...keep].sort((a, b) => a - b).map((j) => shabad.verses[j]!);
}

/** Plain-text rendering of a candidate for model prompts. Gurmukhi is deliberately left out. */
export function describeCandidate(c: Candidate): string {
  const line = (v: Verse) => primaryEnglish(v)?.text ?? "(no English translation)";
  const ctx = c.context.map((v) => `  - ${v.gurmukhi.includes(RAHAO) ? "[Rahao] " : ""}${line(v)}`).join("\n");
  return [
    `<passage id="${c.verse.verseId}">`,
    `Source: ${c.source.english}, Ang ${c.verse.ang}${c.writer ? `, ${c.writer.english}` : ""}${c.raag ? `, ${c.raag.english}` : ""}`,
    `Line: ${line(c.verse)}`,
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
