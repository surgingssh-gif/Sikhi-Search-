import * as WebBrowser from "expo-web-browser";
import { Linking, Platform } from "react-native";
import type { NewsItem } from "./api";

/** Good or neutral news: crime, violence, accidents and feuds stay off the top. */
export const notNegative = (i: NewsItem) => i.tone !== "negative";
/** Sikh news that isn't crime, violence or a feud. */
export const isSikhNews = (i: NewsItem) => i.categories.includes("panth") && notNegative(i);
/** Published in the last three weeks. Some feeds republish old posts, and good news should be news. */
const recent = (i: NewsItem, now = Date.now()) => !i.publishedAt || now - new Date(i.publishedAt).getTime() < 21 * 86_400_000;
/** Good news about Sikhs proper: an achievement, seva, a celebration, heritage or young Sikhs. */
export const isGoodNews = (i: NewsItem) => i.tone === "uplifting" && i.kind !== null && i.kind !== "community" && recent(i);
/** Good news notable enough for the front: a story worth reading, not a notice or a press release. */
export const isFrontPage = (i: NewsItem) => isGoodNews(i) && (i.appeal ?? 1) >= 2;
/** Good news, or friendly everyday community news. */
export const isFriendly = (i: NewsItem) => i.tone !== "negative" && i.kind !== null && recent(i);
/** The harder news of the Panth: justice, disputes and dealings with governments. Kept apart from the good news. */
export const isHardNews = (i: NewsItem) => i.categories.includes("panth") && i.kind === null && i.interest >= 1;

/** Outlets with real newsrooms, whose stories tend to have the most substance. */
const MAJOR_OUTLET =
  /\b(associated press|ap news|new york times|washington post|nbc|cbs|abc news|npr|cnn|usa today|los angeles times|san francisco chronicle|reuters|pbs|time|bbc|guardian|independent|cbc|globe and mail|toronto star|ctv|abc \(australia\)|sbs)\b/i;

/**
 * How high a story goes: how notable it is above all, then how much a Sikh in
 * America wants it, good news, a real newsroom and freshness. A day's age
 * costs a fifth of a level of appeal.
 */
export function storyScore(i: NewsItem, now = Date.now()): number {
  const days = i.publishedAt ? Math.max(0, (now - new Date(i.publishedAt).getTime()) / 86_400_000) : 7;
  return (
    (i.appeal ?? 1) * 1.2 +
    i.interest * 0.5 +
    (i.tone === "uplifting" ? 0.3 : 0) +
    (i.tone === "negative" ? -2 : 0) +
    (MAJOR_OUTLET.test(i.source) ? 0.4 : 0) +
    (i.image ? 0.2 : 0) -
    days * 0.2
  );
}

/** Best stories first. */
export function ranked(items: NewsItem[], now = Date.now()): NewsItem[] {
  return items
    .map((i) => ({ i, s: storyScore(i, now) }))
    .sort((a, b) => b.s - a.s)
    .map(({ i }) => i);
}

const STOP = new Set(["the", "and", "for", "with", "from", "that", "this", "into", "after", "over", "sikh", "sikhs", "makes", "becomes", "first"]);
const wordsOf = (title: string) => new Set(title.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w)));

/**
 * Drops a story when an earlier one in the list has nearly the same headline,
 * so one event covered by four outlets shows once. Keeps the first, which in a
 * ranked list is the best.
 */
export function dedupe(items: NewsItem[]): NewsItem[] {
  const kept: { item: NewsItem; words: Set<string> }[] = [];
  for (const item of items) {
    const words = wordsOf(item.title);
    const same = kept.some((k) => {
      let shared = 0;
      for (const w of words) if (k.words.has(w)) shared++;
      return shared >= 3 && shared / Math.min(words.size, k.words.size) >= 0.5;
    });
    if (!same) kept.push({ item, words });
  }
  return kept.map((k) => k.item);
}

export const newest = (items: NewsItem[]) => [...items].sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));

/**
 * At most `perPlace` stories from one place, so a big event (a parade covered
 * by six outlets) doesn't fill the page.
 */
export function capPerPlace(items: NewsItem[], perPlace: number): NewsItem[] {
  const seen = new Map<string, number>();
  return items.filter((i) => {
    const place = i.place?.name;
    if (!place) return true;
    const n = seen.get(place) ?? 0;
    seen.set(place, n + 1);
    return n < perPlace;
  });
}

export interface NewsSection {
  id: string;
  label: string;
  blurb: string;
  stories: (items: NewsItem[]) => NewsItem[];
}

const ofKind = (kind: NonNullable<NewsItem["kind"]>) => (items: NewsItem[]) => dedupe(ranked(items.filter((i) => isFriendly(i) && i.kind === kind)));

/**
 * The news, by kind of good news. "Good news" leads everywhere; the harder
 * news of the Panth has its own clearly labelled section at the end.
 */
export const NEWS_SECTIONS: NewsSection[] = [
  {
    id: "top",
    label: "Good news",
    blurb: "The best of today's good news from the Sikh kaum, America first.",
    stories: (items) => {
      // Notable stories first; if a quiet day has too few, the best of the rest follow.
      const front = capPerPlace(dedupe(ranked(items.filter(isFrontPage))), 2);
      const rest = dedupe(ranked(items.filter((i) => isGoodNews(i) && !isFrontPage(i))));
      return front.length >= 12 ? front : [...front, ...rest];
    },
  },
  { id: "achievement", label: "Achievements", blurb: "Firsts, honours, elections and Sikhs excelling at what they do.", stories: ofKind("achievement") },
  { id: "seva", label: "Seva", blurb: "Langar, relief, charity and Sikhs serving their neighbours.", stories: ofKind("seva") },
  { id: "celebration", label: "Celebrations", blurb: "Gurpurabs, nagar kirtans, Vaisakhi, Bandi Chhor and festivals.", stories: ofKind("celebration") },
  { id: "heritage", label: "Heritage", blurb: "Gurdwaras restored, Sikh history, museums, books and films.", stories: ofKind("heritage") },
  { id: "youth", label: "Youth", blurb: "Students, scholarships, sport, gatka and young Sikhs.", stories: ofKind("youth") },
  { id: "community", label: "Community", blurb: "Everyday news from gurdwaras and sangats: open days, new gurdwaras, interfaith visits.", stories: ofKind("community") },
  { id: "latest", label: "Latest", blurb: "All the good and community news, newest first.", stories: (items) => dedupe(newest(items.filter(isFriendly))) },
  {
    id: "panth",
    label: "Panth news",
    blurb: "The harder news: justice, remembrance, disputes and the Panth's dealings with governments. Kept apart from the good news.",
    stories: (items) => dedupe(newest(items.filter(isHardNews))),
  },
];

/** Opens a story: in an in-app browser on a phone, a new tab on the web. */
export function openStory(item: Pick<NewsItem, "url">) {
  if (Platform.OS === "web") {
    Linking.openURL(item.url).catch(() => {});
    return;
  }
  WebBrowser.openBrowserAsync(item.url, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET }).catch(() => Linking.openURL(item.url));
}

/** "2h ago", "Yesterday", "Nov 3". */
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

export interface PlacePin {
  name: string;
  region: string;
  lat: number;
  lng: number;
  items: NewsItem[];
}

/** Stories grouped by where they happened, busiest places first. */
export function pinsFor(items: NewsItem[]): PlacePin[] {
  const byName = new Map<string, PlacePin>();
  for (const item of items) {
    if (!item.place) continue;
    const pin = byName.get(item.place.name) ?? { name: item.place.name, region: item.place.region, lat: item.place.lat, lng: item.place.lng, items: [] };
    pin.items.push(item);
    byName.set(item.place.name, pin);
  }
  return [...byName.values()].sort((a, b) => b.items.length - a.items.length);
}

/** A view of the map: Leaflet uses `zoom`, phone maps the span in degrees, `delta`. */
export interface MapRegion {
  label: string;
  lat: number;
  lng: number;
  zoom: number;
  delta: number;
}

/** Places a reader can jump the map to. America first. */
export const MAP_REGIONS: MapRegion[] = [
  { label: "America", lat: 39, lng: -97, zoom: 4, delta: 45 },
  { label: "Canada", lat: 52, lng: -100, zoom: 3, delta: 50 },
  { label: "UK", lat: 53.5, lng: -2.5, zoom: 5, delta: 10 },
  { label: "Punjab", lat: 30.9, lng: 75.4, zoom: 7, delta: 4 },
  { label: "World", lat: 28, lng: 10, zoom: 2, delta: 140 },
];
