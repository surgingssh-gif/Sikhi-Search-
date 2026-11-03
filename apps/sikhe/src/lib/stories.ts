import type { NewsItem } from "./api";

/** Sikh news that isn't crime, violence or a feud. */
export const isSikhNews = (i: NewsItem) => i.categories.includes("panth") && i.tone !== "negative";

/**
 * How high a story goes: what a Sikh in America wants to read, good news, a
 * photo, and freshness. A day's age costs about a quarter of a level of interest.
 */
export function storyScore(i: NewsItem, now = Date.now()): number {
  const days = i.publishedAt ? Math.max(0, (now - new Date(i.publishedAt).getTime()) / 86_400_000) : 7;
  return i.interest + (i.tone === "uplifting" ? 0.5 : 0) + (i.tone === "negative" ? -2 : 0) + (i.image ? 0.3 : 0) - days * 0.25;
}

/** Best stories first. */
export function ranked(items: NewsItem[], now = Date.now()): NewsItem[] {
  return items
    .map((i) => ({ i, s: storyScore(i, now) }))
    .sort((a, b) => b.s - a.s)
    .map(({ i }) => i);
}

/** "2h ago", "Yesterday", "3 Nov". */
export function timeAgo(iso: string | null, now = Date.now()): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  const mins = Math.round((now - t) / 60_000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
