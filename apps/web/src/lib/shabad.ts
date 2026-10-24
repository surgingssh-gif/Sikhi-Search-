import type { Verse } from "./api";

/** Section headings such as "Pauree:" or "Dhanaasaree, Fourth Mehla:" rather than lines of Gurbani. */
export function isHeading(v: Verse): boolean {
  const t = v.translations.find((x) => x.language === "en")?.text.trim() ?? "";
  return t.length > 0 && t.length < 60 && t.endsWith(":");
}

/** The first `n` lines of actual text, skipping headings. */
export function openingLines(verses: Verse[], n: number): Verse[] {
  return verses.filter((v) => !isHeading(v)).slice(0, n);
}

export function englishOf(v: Verse): string {
  return v.translations.find((x) => x.language === "en")?.text ?? "";
}
