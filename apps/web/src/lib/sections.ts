import type { NewsCategory, NewsItem } from "./api";

export const inAmerica = (i: NewsItem) => i.america;
/** Good or neutral news: crime, violence, accidents and feuds stay off the front of the paper. */
export const notNegative = (i: NewsItem) => i.tone !== "negative";

export const NEWS_SECTIONS: Record<string, { title: string; blurb: string; category?: NewsCategory; filter?: (i: NewsItem) => boolean }> = {
  america: {
    title: "Sikhs in America",
    blurb: "Gurdwaras, celebrations, seva and Sikh Americans making news across the United States.",
    category: "panth",
    filter: inAmerica,
  },
  sikhi: {
    title: "Sikhi",
    blurb: "Top Sikh news from America, Canada, the UK and around the world, and from the Panth in Punjab.",
    category: "panth",
  },
  punjab: { title: "Punjab", blurb: "News from Punjab: politics, farming, water and everyday life.", category: "punjab" },
  latest: { title: "Latest", blurb: "Every story, newest first." },
};

/** Old section addresses that now live elsewhere. */
export const MOVED_SECTIONS: Record<string, string> = {
  panth: "sikhi",
  diaspora: "sikhi",
};

/**
 * How high a story goes on the page: what readers care about, good news, a
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

/** Stories with photos first, so the top of a page always has one to lead with. */
export function photoFirst(items: NewsItem[]): NewsItem[] {
  return [...items.filter((i) => i.image), ...items.filter((i) => !i.image)];
}

/**
 * Takes stories off a list, skipping any already used elsewhere on the page.
 * `perPlace` caps how many stories one place gets, so a big event (a parade
 * covered by six outlets) doesn't fill the page.
 */
export function picker(items: NewsItem[], { perPlace = Infinity }: { perPlace?: number } = {}) {
  const used = new Set<string>();
  const places = new Map<string, number>();
  return (count: number, test: (i: NewsItem) => boolean = () => true): NewsItem[] => {
    const out: NewsItem[] = [];
    for (const i of items) {
      if (out.length >= count) break;
      if (used.has(i.id) || !test(i)) continue;
      const place = i.place?.name;
      if (place && (places.get(place) ?? 0) >= perPlace) continue;
      used.add(i.id);
      if (place) places.set(place, (places.get(place) ?? 0) + 1);
      out.push(i);
    }
    return out;
  };
}
