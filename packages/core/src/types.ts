/**
 * Domain types for Gurbani data as Ask Sikhi uses it.
 *
 * Every field here comes straight from BaniDB. Nothing in these types is ever
 * produced by a language model: answers refer to verses by `verseId`, and the
 * server fills in the text from these records.
 */

export type SourceId = "G" | "D" | "B" | "A" | "S" | "N" | "R";

export interface Translation {
  /** ISO-ish language code as BaniDB groups it: "en", "pu". */
  language: "en" | "pu";
  /** BaniDB's key for the translator/teeka, e.g. "bdb", "ssk", "ss". */
  key: string;
  /** Human-readable attribution. Falls back to the raw key when we have not verified the name. */
  attribution: string;
  text: string;
}

export interface Verse {
  verseId: number;
  shabadId: number;
  /** Ang (page) number in the source. */
  ang: number;
  lineNo: number | null;
  /** Gurmukhi in Unicode, exactly as BaniDB returns it (punctuation and verse markers included). */
  gurmukhi: string;
  larivaar: string;
  /** English (Latin-script) transliteration, when available. */
  transliteration: string | null;
  translations: Translation[];
}

export interface NamedRef {
  id: number;
  /** English name as BaniDB gives it, e.g. "Guru Nanak Dev Ji". */
  english: string;
  gurmukhi: string | null;
}

export interface Source {
  id: string;
  english: string;
  gurmukhi: string | null;
}

export interface Shabad {
  shabadId: number;
  ang: number;
  source: Source;
  writer: NamedRef | null;
  raag: NamedRef | null;
  verses: Verse[];
  navigation: { previous: number | null; next: number | null };
}

export interface SearchHit {
  verse: Verse;
  source: Source;
  writer: NamedRef | null;
  raag: NamedRef | null;
}

export interface SearchResult {
  query: string;
  totalResults: number;
  page: number;
  totalPages: number;
  hits: SearchHit[];
}
