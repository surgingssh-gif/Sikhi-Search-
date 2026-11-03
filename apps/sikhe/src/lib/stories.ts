import * as WebBrowser from "expo-web-browser";
import { Linking, Platform } from "react-native";
import type { NewsItem } from "./api";

/** Good or neutral news: crime, violence, accidents and feuds stay off the top. */
export const notNegative = (i: NewsItem) => i.tone !== "negative";
/** Sikh news that isn't crime, violence or a feud. */
export const isSikhNews = (i: NewsItem) => i.categories.includes("panth") && notNegative(i);

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

/** Panth news: skip negative stories unless they matter a great deal to readers. */
const panthic = (i: NewsItem) => i.categories.includes("panth") && (notNegative(i) || i.interest >= 3);

export const NEWS_SECTIONS: NewsSection[] = [
  {
    id: "top",
    label: "Top",
    blurb: "The best of today's Sikh news, America first.",
    stories: (items) => capPerPlace(ranked(items.filter((i) => isSikhNews(i) && i.interest >= 2)), 2),
  },
  {
    id: "america",
    label: "America",
    blurb: "Gurdwaras, celebrations, seva and Sikh Americans making news across the United States.",
    stories: (items) => ranked(items.filter((i) => panthic(i) && i.america)),
  },
  {
    id: "world",
    label: "Around the world",
    blurb: "Sikhs in Canada, the UK, Australia and beyond.",
    stories: (items) => ranked(items.filter((i) => panthic(i) && i.categories.includes("diaspora") && !i.america)),
  },
  {
    id: "panth",
    label: "Panth",
    blurb: "Sri Akal Takht Sahib, the SGPC, Sikh heritage and history, and the Panth in Punjab.",
    stories: (items) => ranked(items.filter((i) => panthic(i) && !i.categories.includes("diaspora") && i.interest >= 1)),
  },
  {
    id: "punjab",
    label: "Punjab",
    blurb: "Farming, water, culture and everyday life in Punjab, without the politics.",
    stories: (items) => ranked(items.filter((i) => i.categories.includes("punjab") && !i.categories.includes("panth") && notNegative(i) && (i.interest >= 1 || i.tone === "uplifting"))),
  },
  {
    id: "latest",
    label: "Latest",
    blurb: "All Sikh news, newest first.",
    stories: (items) => newest(items.filter(isSikhNews)),
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
