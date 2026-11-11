import * as WebBrowser from "expo-web-browser";
import { Linking, Platform } from "react-native";
import type { NewsItem } from "./api";
import { isNear, type Area } from "./area";

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
/** Hard news our readers want: rights, justice, the Khalistan movement and Punjab. */
export const isHardNews = (i: NewsItem) => (i.beat ?? null) !== null && i.interest >= 1 && recent(i);
/** Everything the front page draws on: the good news and the hard news. */
export const isTopNews = (i: NewsItem) => isGoodNews(i) || isHardNews(i);
/** Good, community and hard news: every story worth a reader's time. */
export const isAnyNews = (i: NewsItem) => isFriendly(i) || isHardNews(i);

/** Outlets with real newsrooms, whose stories tend to have the most substance. */
const MAJOR_OUTLET =
  /\b(associated press|ap news|new york times|washington post|nbc|cbs|abc news|npr|cnn|usa today|los angeles times|san francisco chronicle|reuters|pbs|time|bbc|guardian|independent|cbc|globe and mail|toronto star|ctv|abc \(australia\)|sbs)\b/i;

/**
 * How high a story goes: how important it is above all, good news or bad, then
 * how much our readers want it, a trusted newsroom and freshness.
 */
export function storyScore(i: Story, now = Date.now()): number {
  const days = i.publishedAt ? Math.max(0, (now - new Date(i.publishedAt).getTime()) / 86_400_000) : 7;
  return (
    (i.appeal ?? 1) * 1.2 +
    i.interest * 0.5 +
    (i.tone === "uplifting" ? 0.2 : 0) +
    (MAJOR_OUTLET.test(i.source) || SIKH_OUTLET.test(i.source) ? 0.4 : 0) +
    (i.image ? 0.2 : 0) +
    coverage(i) +
    // Fresh stories rise, so the front page turns over every day instead of holding last week's biggest story.
    (days < 1 ? 0.8 : days < 2 ? 0.4 : 0) -
    days * 0.45
  );
}

/** Best stories first. */
export function ranked<T extends NewsItem>(items: T[], now = Date.now()): T[] {
  return items
    .map((i) => ({ i, s: storyScore(i, now) }))
    .sort((a, b) => b.s - a.s)
    .map(({ i }) => i);
}

const STOP = new Set(["the", "and", "for", "with", "from", "that", "this", "into", "after", "over", "sikh", "sikhs", "makes", "becomes", "first"]);
const wordsOf = (title: string) => new Set(title.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w)));

/** A story, with the other outlets that covered the same event. */
export type Story = NewsItem & { also?: string[] };

/**
 * Aggregators, rewrite sites and Indian TV channels and outlets that repeat the
 * Indian government's line on Sikhs: fine to list under "also covered by",
 * but another outlet's version should lead.
 */
const AGGREGATOR = /\b(inshorts|msn|yahoo|newsbreak|dailyhunt|latestly|babushahi|zee|news18|india tv|ommcom|devdiscourse|republic|times now|opindia|organiser|wion|firstpost|ani|ians)\b/i;

/** Sikh outlets, which tell the community's side of a story. */
const SIKH_OUTLET = /\b(sikh24|sikh siyasat|khalsa vox|sikh coalition|saldef|sikh press association|united sikhs|world sikh organization|sikh federation|sikh foundation|baaz|sikh news network|jaago)\b/i;

/** Which outlet's version of a story to show: a real newsroom or a Sikh outlet, then one with a summary and a photo. */
function sourceRank(i: NewsItem): number {
  return (
    (MAJOR_OUTLET.test(i.source) ? 2 : 0) +
    // On hard news, the community's own reporting leads.
    (SIKH_OUTLET.test(i.source) ? (i.beat ? 2.5 : 1) : 0) -
    (AGGREGATOR.test(i.source) ? 2 : 0) +
    (i.summary ? 0.5 : 0) +
    (i.image ? 0.5 : 0)
  );
}

/**
 * One event covered by several outlets becomes one story, shown from the
 * best outlet, with the others' names in `also`. Stories are the same event
 * when the model gave them the same event slug, or their headlines share
 * most of their words. The group keeps the place of its highest-ranked story.
 */
export function dedupe(items: NewsItem[]): Story[] {
  const groups: { members: NewsItem[]; words: Set<string>[]; events: Set<string> }[] = [];
  for (const item of items) {
    const words = wordsOf(item.title);
    const group = groups.find(
      (g) =>
        (item.event && g.events.has(item.event)) ||
        g.words.some((w) => {
          let shared = 0;
          for (const x of words) if (w.has(x)) shared++;
          return shared >= 3 && shared / Math.min(words.size, w.size) >= 0.5;
        }),
    );
    if (group) {
      group.members.push(item);
      group.words.push(words);
      if (item.event) group.events.add(item.event);
    } else {
      groups.push({ members: [item], words: [words], events: new Set(item.event ? [item.event] : []) });
    }
  }
  return groups.map(({ members }) => {
    const best = [...members].sort((a, b) => sourceRank(b) - sourceRank(a))[0]!;
    const others = members.filter((m) => m !== best);
    const story: Story = {
      ...best,
      // The group's strongest rating, and its summary and photo if the shown outlet lacks them.
      appeal: Math.max(...members.map((m) => m.appeal ?? 1)),
      interest: Math.max(...members.map((m) => m.interest)),
      summary: best.summary ?? others.find((m) => m.summary)?.summary ?? null,
      image: best.image ?? others.find((m) => m.image)?.image ?? null,
    };
    const also = [...new Set(others.map((m) => m.source).filter((s) => s !== best.source))];
    if (also.length) story.also = also;
    return story;
  });
}

/** Stories covered by more outlets rise: wide coverage means a story matters. */
const coverage = (i: Story) => Math.min(3, i.also?.length ?? 0) * 0.25;

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

/** Hard news rather than good news. */
const isHard = (i: NewsItem) => !i.kind && (i.beat ?? null) !== null;

/** How many of the first stories are balanced; the rest keep their ranking. */
const BALANCED = 30;

/**
 * Reorders the top of a ranked list so it mixes hard news and good news, and
 * no one section (Khalistan, Seva...) fills it. Each place goes to the best
 * story left, after a penalty for a story of a side that's already ahead and
 * for each story already picked from its section. A story far more important
 * than the rest still leads.
 */
export function balanced<T extends NewsItem>(items: T[], now = Date.now()): T[] {
  const left = items.slice(0, BALANCED * 2).map((i) => ({ i, score: storyScore(i, now) }));
  const out: T[] = [];
  const perSection = new Map<string, number>();
  let hard = 0;
  let good = 0;
  while (left.length && out.length < BALANCED) {
    let best = 0;
    let bestValue = -Infinity;
    left.forEach((c, n) => {
      const h = isHard(c.i);
      const section = h ? `beat:${c.i.beat}` : `kind:${c.i.kind}`;
      let value = c.score - (perSection.get(section) ?? 0) * 0.7;
      // Hard news is never more than one story ahead of the good news; the good may run two ahead.
      if (h && hard > good) value -= 1.6 * (hard - good);
      if (!h && good > hard + 1) value -= 0.8 * (good - hard - 1);
      if (value > bestValue) {
        bestValue = value;
        best = n;
      }
    });
    const [{ i }] = left.splice(best, 1);
    out.push(i);
    if (isHard(i)) hard++;
    else good++;
    const section = isHard(i) ? `beat:${i.beat}` : `kind:${i.kind}`;
    perSection.set(section, (perSection.get(section) ?? 0) + 1);
  }
  const picked = new Set(out);
  return [...out, ...items.filter((i) => !picked.has(i))];
}

/** Groups one event's coverage, then ranks the groups, so wide coverage counts. */
const grouped = (items: NewsItem[]) => ranked(dedupe(ranked(items)));

const ofKind = (kind: NonNullable<NewsItem["kind"]>) => (items: NewsItem[]) => grouped(items.filter((i) => isFriendly(i) && i.kind === kind));
const onBeat = (beat: NonNullable<NewsItem["beat"]>) => (items: NewsItem[]) => grouped(items.filter((i) => isHardNews(i) && i.beat === beat));

/**
 * The news. "Top stories" ranks the good news and the hard news together, by
 * how much they matter; "Good news" keeps only the good. Then the beats of
 * hard news, then the kinds of good news.
 */
export const NEWS_SECTIONS: NewsSection[] = [
  {
    id: "top",
    label: "Top stories",
    blurb: "What matters most to the Sikh kaum today, good news and hard news.",
    // One ranking: how important a story is counts, and so does how fresh,
    // so today's story can lead over last week's big one. Then balanced, so the top mixes hard and good news.
    stories: (items) => balanced(capPerPlace(grouped(items.filter(isTopNews)), 2)),
  },
  {
    id: "good",
    label: "Good news",
    blurb: "Only the good news: achievements, seva, celebrations, heritage and young Sikhs.",
    stories: (items) => capPerPlace(grouped(items.filter(isGoodNews)), 2),
  },
  { id: "khalistan", label: "Khalistan", blurb: "The movement, referendums, diaspora activism, and governments' dealings with Sikhs.", stories: onBeat("khalistan") },
  { id: "justice", label: "Justice", blurb: "1984, Bandi Singhs and political prisoners, transnational repression, and the cases of Sikh activists.", stories: onBeat("justice") },
  { id: "rights", label: "Rights", blurb: "Hate crimes, discrimination, attacks on Sikhs and gurdwaras, and the turban and kirpan.", stories: onBeat("rights") },
  { id: "punjab", label: "Punjab", blurb: "Farmers, water, drugs, migration, and the SGPC and Akal Takht.", stories: onBeat("punjab") },
  { id: "achievement", label: "Achievements", blurb: "Firsts, honours, elections and Sikhs excelling at what they do.", stories: ofKind("achievement") },
  { id: "seva", label: "Seva", blurb: "Langar, relief, charity and Sikhs serving their neighbours.", stories: ofKind("seva") },
  { id: "celebration", label: "Celebrations", blurb: "Gurpurabs, nagar kirtans, Vaisakhi, Bandi Chhor and festivals.", stories: ofKind("celebration") },
  { id: "heritage", label: "Heritage", blurb: "Gurdwaras restored, Sikh history, museums, books and films.", stories: ofKind("heritage") },
  { id: "youth", label: "Youth", blurb: "Students, scholarships, sport, gatka and young Sikhs.", stories: ofKind("youth") },
  { id: "community", label: "Community", blurb: "Everyday news from gurdwaras and sangats: open days, new gurdwaras, interfaith visits.", stories: ofKind("community") },
  { id: "latest", label: "Latest", blurb: "All the news, newest first.", stories: (items) => dedupe(newest(items.filter(isAnyNews))) },
];

/** The news from the reader's area, best first. */
export function nearSection(area: Area): NewsSection {
  return {
    id: "near",
    label: "Near you",
    blurb: `News from Sikhs in ${area.label}: ${area.towns}.`,
    stories: (items) => grouped(items.filter((i) => isAnyNews(i) && isNear(i, area))),
  };
}

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
