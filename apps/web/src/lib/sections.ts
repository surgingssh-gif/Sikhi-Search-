import type { NewsCategory, NewsItem } from "./api";

export const NEWS_SECTIONS: Record<string, { title: string; blurb: string; category?: NewsCategory }> = {
  panth: { title: "Panth", blurb: "Gurdwaras, the Takhts and the SGPC, Sikh rights and Sikh life around the world.", category: "panth" },
  punjab: { title: "Punjab", blurb: "Politics, farmers, water, rights and everyday life across Punjab.", category: "punjab" },
  diaspora: { title: "Diaspora", blurb: "Sikhs in Canada, the UK, the US, Australia and beyond.", category: "diaspora" },
  latest: { title: "Latest", blurb: "Every story, newest first." },
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
