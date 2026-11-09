import type { HistoryEvent, WikiArticle, WikiSummary } from "@ask-sikhi/core";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getJson } from "./api";

export type { WikiArticle, WikiSection, WikiSummary } from "@ask-sikhi/core";

const DAY = 24 * 60 * 60_000;

export interface HistoryCollection {
  id: string;
  title: string;
  blurb: string;
  items: WikiSummary[];
}

export function useHistoryCollections() {
  return useQuery({
    queryKey: ["history-collections"],
    queryFn: () => getJson<{ collections: HistoryCollection[]; attribution: string }>("/v1/history/collections"),
    staleTime: DAY,
  });
}

export function useHistorySearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ["history-search", q],
    queryFn: () => getJson<{ events: HistoryEvent[]; articles: WikiSummary[]; attribution: string }>(`/v1/history/search?q=${encodeURIComponent(q)}`),
    enabled: q.length >= 2,
    staleTime: DAY,
    placeholderData: keepPreviousData,
  });
}

export function useArticle(title: string) {
  return useQuery({
    queryKey: ["article", title],
    queryFn: () => getJson<{ article: WikiArticle; attribution: string }>(`/v1/history/article?title=${encodeURIComponent(title)}`),
    enabled: title.length > 0,
    staleTime: DAY,
  });
}

/** Every dated event in our own timeline. */
export function useTimeline() {
  return useQuery({ queryKey: ["timeline"], queryFn: () => getJson<{ events: HistoryEvent[] }>("/v1/history"), staleTime: DAY });
}

/** Periods of Sikh history, for the timeline. A year belongs to the last era that starts at or before it. */
export const ERAS = [
  { from: 1469, title: "The Gurus", blurb: "Guru Nanak Dev Ji to Guru Gobind Singh Ji, 1469 to 1708" },
  { from: 1708, title: "Banda Singh and the Misls", blurb: "The Khalsa's fight for Punjab, 1708 to 1799" },
  { from: 1799, title: "The Sikh Empire", blurb: "Maharaja Ranjit Singh's Punjab, 1799 to 1849" },
  { from: 1849, title: "Under British rule", blurb: "Reform, the Ghadar movement and the gurdwaras won back, 1849 to 1947" },
  { from: 1947, title: "Partition and Punjab", blurb: "A homeland divided and rebuilt, 1947 to 1983" },
  { from: 1984, title: "1984 and after", blurb: "Remembrance, justice and the Panth today" },
] as const;

export function eraOf(year: number) {
  return [...ERAS].reverse().find((e) => year >= e.from) ?? ERAS[0];
}

/** "30 May 1606". */
export function eventDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${d} ${new Date(Date.UTC(2000, m! - 1, 1)).toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" })} ${y}`;
}

/** "Today · 7 years ago" or "Monday, Nov 9 · 7 years ago", for this week's anniversaries. */
export function anniversaryLabel(e: { date: string; daysAway: number; yearsAgo: number }, today: string): string {
  const day =
    e.daysAway === 0
      ? "Today"
      : // Counted from today, so an anniversary just after New Year gets next year's weekday.
        new Date(new Date(`${today}T12:00:00`).getTime() + e.daysAway * 86_400_000).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  return `${day} · ${e.yearsAgo} years ago`;
}
