/**
 * The parts of BaniDB v2 responses we read, as observed from the live API
 * (https://api.banidb.com/v2). Fields we don't use are left out; everything is
 * optional-tolerant because BaniDB does not publish a strict schema.
 */

export interface RawGurmukhiText {
  gurmukhi?: string | null;
  unicode?: string | null;
}

export interface RawVerse {
  verseId: number;
  shabadId: number;
  pageNo?: number;
  lineNo?: number;
  verse: RawGurmukhiText;
  larivaar?: RawGurmukhiText;
  /** e.g. { en: { bdb, ms, ssk }, pu: { ss: {gurmukhi, unicode}, ft: {...} }, es, hi } */
  translation?: Record<string, Record<string, string | RawGurmukhiText | null> | undefined>;
  transliteration?: Record<string, string | null | undefined>;
  // Search results also carry these per verse:
  source?: RawSource;
  writer?: RawWriter;
  raag?: RawRaag;
}

export interface RawSource {
  sourceId: string;
  gurmukhi?: string | null;
  unicode?: string | null;
  english: string;
  pageNo?: number;
}

export interface RawWriter {
  writerId: number;
  gurmukhi?: string | null;
  unicode?: string | null;
  english: string;
}

export interface RawRaag {
  raagId: number;
  gurmukhi?: string | null;
  unicode?: string | null;
  english: string;
}

export interface RawShabadResponse {
  shabadInfo: {
    shabadId: number;
    pageNo: number;
    source: RawSource;
    raag?: RawRaag | null;
    writer?: RawWriter | null;
  };
  navigation?: { previous: number | null; next: number | null };
  verses: RawVerse[];
}

export interface RawSearchResponse {
  resultsInfo: {
    totalResults: number;
    pages: { page: number; totalPages: number };
  };
  verses: RawVerse[];
}

export interface RawErrorResponse {
  error: true;
  data?: { error?: string };
}

export interface RawHukamnamaResponse {
  date?: { gregorian?: { year: number; month: number; date: number } };
  shabads?: RawShabadResponse[];
}

export interface RawAngResponse {
  page?: RawVerse[];
}
