import type { CalendarEvent, DatedHistoryEvent, Edition, EditionSummary, Hukamnama, NanakshahiDate, NewsItem } from "@ask-sikhi/core";
import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import { Platform } from "react-native";

export type { CalendarEvent, Edition, EditionArticle, EditionBrief, EditionParagraph, EditionSource, EditionSummary, NanakshahiDate, DatedHistoryEvent, HistoryEvent, Hukamnama, NewsItem, Shabad, Verse } from "@ask-sikhi/core";

/**
 * Where the API lives. EXPO_PUBLIC_API_URL wins; otherwise, in development, the
 * API is on the same computer as the Expo server, which a phone reaches by the
 * computer's network address rather than localhost.
 */
function apiUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  // A host such as Render passes a bare host name ("sikhe-api.onrender.com"): that means https.
  if (configured) return /^https?:\/\//.test(configured) ? configured.replace(/\/$/, "") : `https://${configured}`;
  if (Platform.OS !== "web") {
    const host = Constants.expoConfig?.hostUri?.split(":")[0];
    if (host) return `http://${host}:8787`;
  }
  return "http://localhost:8787";
}

export const API_URL = apiUrl();

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
  }
}

const FRIENDLY: Record<string, string> = {
  rate_limited: "You've asked several questions in a row. Please wait a minute and try again.",
  ai_not_configured: "This isn't available right now.",
  upstream_unavailable: "BaniDB, the Gurbani source, couldn't be reached. Please try again shortly.",
  not_found: "That couldn't be found.",
  network: "Couldn't reach Sikhe. Check your connection and try again.",
  internal_error: "Something went wrong on our side. Please try again.",
};

export function friendlyError(err: unknown): string {
  if (err instanceof ApiError) return FRIENDLY[err.code] ?? err.message;
  return FRIENDLY.network!;
}

/** On the free hosted site there's no server: the app answers its own API requests (see local-api). */
export const STATIC = process.env.EXPO_PUBLIC_STATIC === "1";

export async function getJson<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = STATIC ? await (await import("./local-api")).localRequest(path) : await fetch(`${API_URL}${path}`);
  } catch {
    throw new ApiError("network");
  }
  const body = (await res.json().catch(() => null)) as (T & { error?: string; message?: string }) | null;
  if (!res.ok || !body) throw new ApiError(body?.error ?? "internal_error", body?.message);
  return body;
}

/** Today's date where the reader is, as YYYY-MM-DD. */
export function localDate(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function useHukamnama() {
  return useQuery({
    queryKey: ["hukamnama"],
    queryFn: () => getJson<Hukamnama & { attribution: string }>("/v1/hukamnama/today"),
    staleTime: 10 * 60_000,
  });
}

export function useNews(limit = 250) {
  return useQuery({
    queryKey: ["news", limit],
    queryFn: () => getJson<{ items: NewsItem[]; fetchedAt: string | null }>(`/v1/news?limit=${limit}`),
    staleTime: 5 * 60_000,
  });
}

/** An issue of the magazine: the latest, or one day's. Null when there is none yet. */
export function useEdition(date = "latest") {
  return useQuery({
    queryKey: ["edition", date],
    queryFn: async () => {
      try {
        return await getJson<Edition>(`/v1/editions/${date}`);
      } catch (err) {
        if (err instanceof ApiError && err.code === "not_found") return null;
        throw err;
      }
    },
    staleTime: 10 * 60_000,
  });
}

/** Every issue of the magazine, newest first. */
export function useEditions() {
  return useQuery({
    queryKey: ["editions"],
    queryFn: async () => (await getJson<{ editions: EditionSummary[] }>("/v1/editions")).editions,
    staleTime: 10 * 60_000,
  });
}

/** Sikh history anniversaries around a day. */
export function useHistoryAround(date: string, before = 0, after = 6) {
  return useQuery({
    queryKey: ["history", date, before, after],
    queryFn: () => getJson<{ events: DatedHistoryEvent[] }>(`/v1/history?date=${date}&before=${before}&after=${after}`),
    staleTime: 60 * 60_000,
  });
}

export interface CalendarResponse {
  /** Null outside the years the SGPC has printed a Jantri for. */
  today: NanakshahiDate | null;
  events: CalendarEvent[];
  coversUntil: string;
  attribution: string;
}

export function calendarPath(date: string, days: number) {
  return `/v1/calendar?date=${date}&days=${days}`;
}

/** The Sikh calendar from `date` for `days` days. */
export function useCalendar(date: string, days = 60) {
  return useQuery({
    queryKey: ["calendar", date, days],
    queryFn: () => getJson<CalendarResponse>(calendarPath(date, days)),
    staleTime: 60 * 60_000,
  });
}

export interface Briefing {
  /** One sentence opening today's edition. */
  lede?: string;
  generatedAt: string;
  bullets: { text: string; itemIds: string[] }[];
}

/** The day's news in a few lines, written by the model each morning. Null when AI isn't set up. */
export function useBriefing() {
  return useQuery({
    queryKey: ["briefing"],
    queryFn: () => getJson<Briefing>("/v1/news/briefing").catch((err) => (err instanceof ApiError && err.code === "ai_not_configured" ? null : Promise.reject(err))),
    staleTime: 30 * 60_000,
  });
}
