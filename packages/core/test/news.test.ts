import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { cleanSnippet, DEFAULT_FEEDS, NewsService, parseFeed, slugify, type NewsFeed } from "../src";

// Fixtures are real responses recorded from each publisher's RSS feed.
const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => readFileSync(path.join(here, "fixtures/news", name), "utf8");
const feed = (id: string) => DEFAULT_FEEDS.find((f) => f.id === id)!;

describe("parseFeed", () => {
  it("reads a Sikh outlet's feed as Panthic news with clean snippets", () => {
    const items = parseFeed(fixture("sikhsiyasat.xml"), feed("sikhsiyasat"));
    expect(items.length).toBeGreaterThan(10);
    for (const i of items) {
      expect(i.categories).toContain("panth");
      expect(i.url).toMatch(/^https?:\/\//);
      expect(i.snippet).not.toMatch(/<[a-z]/i);
      expect(i.snippet.length).toBeLessThanOrEqual(220);
    }
  });

  it("keeps only Punjab and Sikh stories from a general city feed", () => {
    const { mustMatch: _ignored, ...unfiltered } = feed("toi");
    const all = parseFeed(fixture("toi-chandigarh.xml"), unfiltered);
    const kept = parseFeed(fixture("toi-chandigarh.xml"), feed("toi"));
    expect(kept.length).toBeLessThan(all.length);
    for (const i of kept) expect(`${i.title} ${i.snippet}`).toMatch(/punjab|sikh|gurdwara|sgpc|akal takht|amritsar|akali|khalsa|harmandir|golden temple|jathedar/i);
  });

  it("filters the Punjabi-language feed with Gurmukhi keywords", () => {
    const kept = parseFeed(fixture("bbc-punjabi.xml"), feed("bbcpunjabi"));
    for (const i of kept) {
      expect(i.language).toBe("pa");
      expect(`${i.title} ${i.snippet}`).toMatch(/ਸਿੱਖ|ਪੰਜਾਬ|ਗੁਰਦੁਆਰ|ਗੁਰੂ|ਅਕਾਲ ਤਖ|ਸ਼੍ਰੋਮਣੀ|ਅੰਮ੍ਰਿਤਸਰ|ਦਰਬਾਰ ਸਾਹਿਬ|ਹਰਿਮੰਦਰ|ਖ਼ਾਲਸਾ|ਖਾਲਸਾ|ਜਥੇਦਾਰ/);
    }
  });
});

describe("cleanSnippet", () => {
  it("strips tags, entities and WordPress footers", () => {
    expect(cleanSnippet("<p>Sikh &#8220;sangat&#8221; gathers &amp; prays.</p><p>The post X appeared first on Y.</p>")).toBe(
      'Sikh "sangat" gathers & prays.',
    );
  });
});

describe("NewsService", () => {
  const rss = (titles: string[]) =>
    `<rss><channel>${titles.map((t, i) => `<item><title>${t}</title><link>https://example.org/${i}-${t.length}</link><pubDate>Sat, 24 Oct 2026 1${i}:00:00 GMT</pubDate></item>`).join("")}</channel></rss>`;
  const feeds: NewsFeed[] = [
    { id: "a", name: "A", url: "https://a.test/feed", language: "en", categories: ["panth"] },
    { id: "b", name: "B", url: "https://b.test/feed", language: "en", categories: ["punjab"] },
  ];

  it("skips a failing feed, removes duplicate stories, and caches", async () => {
    const fetch = vi.fn(async (url: string | URL | Request) =>
      String(url).startsWith("https://a.test")
        ? new Response(rss(["SGPC meets on Akal Takht matter", "Gurpurab celebrated in Amritsar"]))
        : new Response("down", { status: 503 }),
    );
    let now = 0;
    const service = new NewsService({ feeds, fetch, now: () => now });
    const first = await service.latest();
    expect(first.failed).toEqual(["b"]);
    expect(first.items.map((i) => i.title)).toEqual(["Gurpurab celebrated in Amritsar", "SGPC meets on Akal Takht matter"]);
    await service.latest();
    expect(fetch).toHaveBeenCalledTimes(2);
    now = 21 * 60 * 1000;
    await service.latest();
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it("drops the same story reported by two outlets", async () => {
    const fetch = vi.fn(async () => new Response(rss(["Punjab assembly passes resolution on river waters"])));
    const service = new NewsService({ feeds, fetch });
    expect((await service.latest()).items).toHaveLength(1);
  });
});

describe("slugify", () => {
  it("makes URL-safe slugs, including for Gurmukhi topics", () => {
    expect(slugify("Zafarnama")).toBe("zafarnama");
    expect(slugify("Saka Nankana Sahib (1921)")).toBe("saka-nankana-sahib-1921");
    expect(slugify("ਜ਼ਫ਼ਰਨਾਮਾ")).toMatch(/^t-[a-z0-9]+$/);
  });
});
