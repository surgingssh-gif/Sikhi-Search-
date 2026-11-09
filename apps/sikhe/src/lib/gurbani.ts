import type { AngContents, Bani, BaniSummary, GurbaniSearchMode, SearchResult, Shabad, Verse } from "@ask-sikhi/core";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getJson } from "./api";

export type { Bani, BaniSummary, BaniVerse, GurbaniSearchMode, SearchHit, SearchResult } from "@ask-sikhi/core";

type WithAttribution<T> = T & { attribution: string };

const DAY = 24 * 60 * 60_000;

export function useShabad(id: number) {
  return useQuery({
    queryKey: ["shabad", id],
    queryFn: () => getJson<WithAttribution<{ shabad: Shabad }>>(`/v1/shabads/${id}`),
    enabled: Number.isInteger(id) && id > 0,
    staleTime: DAY,
  });
}

export interface AngText {
  ang: number;
  /** Each shabad on the Ang, with only the lines that fall on it. */
  shabads: Shabad[];
  attribution: string;
}

/** The full text of an Ang: its shabads, each cut to the lines printed on that page. */
export function useAng(ang: number) {
  return useQuery({
    queryKey: ["ang", ang],
    queryFn: async (): Promise<AngText> => {
      const contents = await getJson<WithAttribution<AngContents>>(`/v1/angs/${ang}`);
      const shabads = await Promise.all(contents.shabads.map((s) => getJson<{ shabad: Shabad }>(`/v1/shabads/${s.shabadId}`)));
      return {
        ang,
        shabads: shabads.map(({ shabad }) => ({ ...shabad, verses: shabad.verses.filter((v) => v.ang === ang) })),
        attribution: contents.attribution,
      };
    },
    enabled: Number.isInteger(ang) && ang >= 1 && ang <= LAST_ANG,
    staleTime: DAY,
  });
}

export function useBanis() {
  return useQuery({ queryKey: ["banis"], queryFn: () => getJson<{ banis: BaniSummary[] }>("/v1/banis"), staleTime: DAY });
}

export function useBani(id: number) {
  return useQuery({
    queryKey: ["bani", id],
    queryFn: () => getJson<WithAttribution<{ bani: Bani }>>(`/v1/banis/${id}`),
    enabled: Number.isInteger(id) && id > 0,
    staleTime: DAY,
  });
}

/**
 * The mode a search starts in: Gurmukhi words or English meaning when the
 * query has spaces, otherwise first letters.
 */
export function guessMode(query: string): GurbaniSearchMode {
  const q = query.trim();
  const gurmukhi = /[਀-੿]/.test(q);
  if (!/\s/.test(q)) return "first-letters";
  return gurmukhi ? "words" : "meaning";
}

export function useGurbaniSearch(query: string, mode: GurbaniSearchMode) {
  const q = query.trim();
  return useQuery({
    queryKey: ["search", q, mode],
    queryFn: () => getJson<WithAttribution<SearchResult>>(`/v1/search?q=${encodeURIComponent(q)}&mode=${mode}`),
    enabled: q.length >= 2,
    staleTime: DAY,
    placeholderData: keepPreviousData,
  });
}

export const LAST_ANG = 1430;

/** Nitnem banis by BaniDB id, in the order they are usually recited. */
export const NITNEM = [2, 4, 6, 9, 10, 21, 23];

/** Familiar English names for banis whose BaniDB names are transliterations. */
const NAMES: Record<number, string> = {
  2: "Japji Sahib",
  4: "Jaap Sahib",
  6: "Tav Prasad Savaiye",
  9: "Chaupai Sahib",
  10: "Anand Sahib",
  21: "Rehras Sahib",
  23: "Kirtan Sohila",
  24: "Ardas",
  31: "Sukhmani Sahib",
  34: "Sidh Gosht",
  29: "Akal Ustat",
  11: "Laavan",
};

/** When each Nitnem bani is recited. */
export const NITNEM_TIME: Record<number, string> = {
  2: "Amritvela",
  4: "Amritvela",
  6: "Amritvela",
  9: "Amritvela",
  10: "Amritvela",
  21: "Evening",
  23: "Before sleep",
};

export function baniTitle(b: Pick<BaniSummary, "baniId" | "name">): string {
  return NAMES[b.baniId] ?? b.name.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** A heading line, such as "Pauree:" or "Dhanaasaree, Fourth Mehla:". */
export function isHeading(v: Verse): boolean {
  const t = (v.translations.find((x) => x.language === "en")?.text ?? "").trim();
  return t.length > 0 && t.length < 60 && t.endsWith(":");
}
