import type { NewsCategory, NewsItem } from "./api";

export const NEWS_SECTIONS: Record<string, { title: string; blurb: string; category?: NewsCategory }> = {
  sikhi: {
    title: "Sikhi",
    blurb: "Top Sikh news: the Akal Takht, the SGPC and gurdwaras, Sikh rights, and Sikh life from Punjab to the diaspora.",
    category: "panth",
  },
  punjab: { title: "Punjab", blurb: "Politics, farmers, water, rights and everyday life across Punjab.", category: "punjab" },
  latest: { title: "Latest", blurb: "Every story, newest first." },
};

/** Old section addresses that now live elsewhere. */
export const MOVED_SECTIONS: Record<string, string> = {
  panth: "sikhi",
  diaspora: "sikhi",
};

/** Stories with photos first, so the top of a page always has one to lead with. */
export function photoFirst(items: NewsItem[]): NewsItem[] {
  return [...items.filter((i) => i.image), ...items.filter((i) => !i.image)];
}

/** Takes stories off a list, skipping any already used elsewhere on the page. */
export function picker(items: NewsItem[]) {
  const used = new Set<string>();
  return (count: number, test: (i: NewsItem) => boolean = () => true): NewsItem[] => {
    const out: NewsItem[] = [];
    for (const i of items) {
      if (out.length >= count) break;
      if (used.has(i.id) || !test(i)) continue;
      used.add(i.id);
      out.push(i);
    }
    return out;
  };
}
