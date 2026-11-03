import type { CalendarEvent, DatedHistoryEvent, Hukamnama, NanakshahiDate, NewsItem } from "@ask-sikhi/core";
import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import { Platform } from "react-native";

export type { CalendarEvent, NanakshahiDate, DatedHistoryEvent, HistoryEvent, Hukamnama, NewsItem, Shabad, Verse } from "@ask-sikhi/core";

/**
 * Where the API lives. EXPO_PUBLIC_API_URL wins; otherwise, in development, the
 * API is on the same computer as the Expo server, which a phone reaches by the
 * computer's network address rather than localhost.
 */
function apiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
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

export async function getJson<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`);
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
