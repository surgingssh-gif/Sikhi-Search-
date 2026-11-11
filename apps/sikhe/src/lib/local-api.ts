import { createApp } from "@ask-sikhi/api/app";
import { BaniDbClient, WikipediaClient, type NewsItem } from "@ask-sikhi/core";

/**
 * The API, run inside the app, for the free hosted site where there's no
 * server. Gurbani and history come straight from BaniDB and Wikipedia, just
 * as the server would fetch them; the news comes from the files the hourly
 * job writes next to the site (see scripts/build-news.ts). There's no model
 * key here, so Ask is turned off.
 */

/** Where the site lives on its host, such as "/Sikhi-Search-" on GitHub Pages. */
const BASE = (process.env.EXPO_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");

async function data<T>(name: string): Promise<T | null> {
  try {
    // The job rewrites these every hour, so skip the browser's copy.
    const res = await fetch(`${BASE}/data/${name}`, { cache: "no-cache" });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

const news = {
  latest: async () => (await data<{ items: NewsItem[]; failed: string[]; fetchedAt: string }>("news.json")) ?? { items: [], failed: [], fetchedAt: new Date().toISOString() },
  briefingToday: async () => {
    const b = await data<{ generatedAt: string; lede: string; bullets: { text: string; itemIds: string[] }[] }>("briefing.json");
    if (!b) throw new Error("No edition note yet");
    return { ...b, usage: null };
  },
  article: (id: string) => data<{ id: string; url: string; paragraphs: string[] }>(`articles/${id}.json`),
};

let app: ReturnType<typeof createApp> | null = null;

/** Answers an API request in the app, as the server would. */
export function localRequest(path: string): Promise<Response> {
  app ??= createApp({ banidb: new BaniDbClient(), wikipedia: new WikipediaClient(), news });
  return Promise.resolve(app.request(path));
}
