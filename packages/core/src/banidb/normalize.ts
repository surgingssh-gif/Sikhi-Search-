import type { NamedRef, SearchResult, Shabad, Source, Translation, Verse } from "../types";
import type {
  RawGurmukhiText,
  RawRaag,
  RawSearchResponse,
  RawShabadResponse,
  RawSource,
  RawVerse,
  RawWriter,
} from "./raw-types";
import { BaniDbDataError } from "./errors";

/**
 * Attribution names for BaniDB translation keys. These match how BaniDB-based
 * apps (e.g. SikhiToTheMax) label them; confirm with Khalis Foundation before
 * launch. Keys not listed here are shown with their raw key rather than a guessed name.
 */
export const TRANSLATION_ATTRIBUTIONS: Record<string, Record<string, string>> = {
  en: {
    bdb: "BaniDB (Khalis Foundation)",
    ssk: "Dr. Sant Singh Khalsa",
    ms: "Dr. Manmohan Singh",
  },
  pu: {
    ss: "Prof. Sahib Singh",
    ft: "Faridkot Teeka",
    bdb: "BaniDB (Khalis Foundation)",
    ms: "Dr. Manmohan Singh",
  },
};

/**
 * Preferred order for English. `ms` is last on purpose: we have seen BaniDB
 * results where its text belonged to a neighbouring line.
 */
export const ENGLISH_PREFERENCE = ["bdb", "ssk", "ms"] as const;

const SUPPORTED_LANGUAGES = ["en", "pu"] as const;

function unicodeOf(text: RawGurmukhiText | string | null | undefined): string | null {
  if (text == null) return null;
  if (typeof text === "string") return text;
  // `gurmukhi` holds legacy font-encoded ASCII, never Unicode, so it is never used as a fallback.
  return text.unicode ?? null;
}

function normalizeTranslations(raw: RawVerse["translation"]): Translation[] {
  const out: Translation[] = [];
  for (const language of SUPPORTED_LANGUAGES) {
    const group = raw?.[language];
    if (!group) continue;
    const keys = Object.keys(group);
    if (language === "en") {
      keys.sort((a, b) => rank(a) - rank(b));
    }
    for (const key of keys) {
      const text = unicodeOf(group[key])?.trim();
      if (!text) continue;
      out.push({
        language,
        key,
        attribution: TRANSLATION_ATTRIBUTIONS[language]?.[key] ?? `BaniDB translation "${key}"`,
        text,
      });
    }
  }
  return out;
}

function rank(key: string): number {
  const i = (ENGLISH_PREFERENCE as readonly string[]).indexOf(key);
  return i === -1 ? ENGLISH_PREFERENCE.length : i;
}

export function normalizeVerse(raw: RawVerse, fallbackAng?: number): Verse {
  const gurmukhi = raw.verse?.unicode;
  if (!gurmukhi) {
    throw new BaniDbDataError(`Verse ${raw.verseId} has no Unicode Gurmukhi`);
  }
  const ang = raw.pageNo ?? raw.source?.pageNo ?? fallbackAng;
  if (ang == null) {
    throw new BaniDbDataError(`Verse ${raw.verseId} has no Ang number`);
  }
  const translit = raw.transliteration?.en ?? raw.transliteration?.english ?? null;
  return {
    verseId: raw.verseId,
    shabadId: raw.shabadId,
    ang,
    lineNo: raw.lineNo ?? null,
    gurmukhi,
    larivaar: raw.larivaar?.unicode ?? gurmukhi.replace(/\s+/g, ""),
    transliteration: translit?.trim() || null,
    translations: normalizeTranslations(raw.translation),
  };
}

function normalizeSource(raw: RawSource): Source {
  return { id: raw.sourceId, english: raw.english, gurmukhi: raw.unicode ?? null };
}

function normalizeNamed(raw: RawWriter | RawRaag | null | undefined, id: number | undefined): NamedRef | null {
  if (!raw || id == null || !raw.english) return null;
  return { id, english: raw.english, gurmukhi: raw.unicode ?? null };
}

export function normalizeShabad(raw: RawShabadResponse): Shabad {
  const info = raw.shabadInfo;
  return {
    shabadId: info.shabadId,
    ang: info.pageNo,
    source: normalizeSource(info.source),
    writer: normalizeNamed(info.writer, info.writer?.writerId),
    raag: normalizeNamed(info.raag, info.raag?.raagId),
    verses: raw.verses.map((v) => normalizeVerse(v, info.pageNo)),
    navigation: {
      previous: raw.navigation?.previous ?? null,
      next: raw.navigation?.next ?? null,
    },
  };
}

export function normalizeSearch(query: string, raw: RawSearchResponse): SearchResult {
  return {
    query,
    totalResults: raw.resultsInfo.totalResults,
    page: raw.resultsInfo.pages.page,
    totalPages: raw.resultsInfo.pages.totalPages,
    hits: raw.verses.map((v) => {
      if (!v.source) throw new BaniDbDataError(`Search hit ${v.verseId} has no source`);
      return {
        verse: normalizeVerse(v),
        source: normalizeSource(v.source),
        writer: normalizeNamed(v.writer, v.writer?.writerId),
        raag: normalizeNamed(v.raag, v.raag?.raagId),
      };
    }),
  };
}

/** The translation to show by default: first English one in preference order. */
export function primaryEnglish(verse: Verse): Translation | null {
  return verse.translations.find((t) => t.language === "en") ?? null;
}
