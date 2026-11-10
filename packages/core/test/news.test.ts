import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { cleanSnippet, DEFAULT_FEEDS, guessRating, imageFrom, NewsService, parseFeed, placeFor, resolveGoogleNewsUrl, slugify, type NewsFeed } from "../src";
import { fakeLlm } from "./fakes";

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

  it("reads a Google News search: publisher as source, no snippet or photo, only stories about Sikhs", () => {
    const items = parseFeed(fixture("google-news-us.xml"), feed("gnews-us"));
    expect(items.length).toBeGreaterThan(40);
    const parade = items.find((i) => i.title === "Yuba City Sikh festival celebrates 47th year this weekend")!;
    expect(parade.source).toBe("KCRA");
    expect(parade.snippet).toBe("");
    expect(parade.image).toBeNull();
    expect(parade.place?.name).toBe("Yuba City");
    expect(parade.categories).toContain("diaspora");
    expect(parade).toMatchObject({ interest: 3, tone: "uplifting", rated: "guess" });
    for (const i of items) expect(i.title).not.toMatch(/ - [A-Z][\w .]+$/);
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
    const service = new NewsService({ feeds, fetch, now: () => now, maxPreviewFetches: 0 });
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
    const service = new NewsService({ feeds, fetch, maxPreviewFetches: 0 });
    expect((await service.latest()).items).toHaveLength(1);
  });
});

describe("guessRating", () => {
  const sikh = { panthic: true, sikhOutlet: false };
  it("rates good news about Sikhs in America highest", () => {
    expect(guessRating("Gold domes now welcome worshippers at new Sikh temple", { ...sikh, region: "United States" })).toEqual({ interest: 3, tone: "uplifting", kind: "community", appeal: 1, america: true });
  });
  it("marks crime and violence negative and lowers its interest", () => {
    expect(guessRating("Firing outside gurdwara in Ludhiana's Jagraon, masked man leaves threat letter", { ...sikh, region: "Punjab" })).toEqual({
      interest: 0,
      tone: "negative",
      kind: null,
      appeal: 0,
      america: false,
    });
  });
  it("guesses the kind of good news", () => {
    const kindOf = (t: string) => guessRating(t, { ...sikh, region: "United States" }).kind;
    expect(kindOf("Sikh volunteers serve langar to flood victims")).toBe("seva");
    expect(kindOf("Thousands celebrate Vaisakhi at Yuba City parade")).toBe("celebration");
    expect(kindOf("Jyot Singh becomes first Sikh elected to Georgia Assembly")).toBe("achievement");
    expect(kindOf("Sikh students win scholarship")).toBe("youth");
    // Bad news, and news that isn't about Sikhs, is never good news.
    expect(kindOf("Sikh man attacked outside gurdwara")).toBeNull();
    expect(kindOf("On Bandi Chhor Divas, Akal Takht jathedar calls for release of Sikh prisoners")).toBeNull();
    expect(guessRating("Punjab CM Mann celebrates Diwali with employees", { panthic: false, sikhOutlet: false, region: "Punjab" }).kind).toBeNull();
  });
  it("gives Indian politics without a Sikh angle little interest", () => {
    expect(guessRating("Pakistan minister invites Punjab CM Mann", { panthic: false, sikhOutlet: false, region: "Punjab" }).interest).toBe(0);
  });
});

describe("NewsService ratings", () => {
  const rss = (titles: string[]) =>
    `<rss><channel>${titles.map((t, i) => `<item><title>${t}</title><link>https://example.org/${i}</link><pubDate>Sat, 24 Oct 2026 1${i}:00:00 GMT</pubDate></item>`).join("")}</channel></rss>`;
  const feeds: NewsFeed[] = [{ id: "a", name: "A", url: "https://a.test/feed", language: "en", categories: ["panth"] }];

  it("shows keyword guesses at once, then the model's ratings, dropping duplicates", async () => {
    const fetch = vi.fn(async () => new Response(rss(["Sikh parade draws thousands in Yuba City", "Yuba City hosts annual Sikh festival", "Gurdwara holds langar"])));
    const { llm, calls } = fakeLlm({
      "news-rating": (req) => {
        const ids = [...String(req.messages[0]!.content).matchAll(/\[(\w+)\]/g)].map((m) => m[1]!);
        // Oldest first: parade, festival, langar.
        return {
          ratings: [
            { id: ids[0], interest: 3, tone: "uplifting", kind: "celebration", appeal: 3, america: true, duplicateOf: null },
            { id: ids[1], interest: 3, tone: "uplifting", kind: "celebration", appeal: 2, america: true, duplicateOf: ids[0] },
            { id: ids[2], interest: 2, tone: "neutral", kind: "seva", appeal: 1, america: true, duplicateOf: null },
          ],
        };
      },
    });
    // The model answers only when the test says so, to see the page before it does.
    let answer!: () => void;
    const gate = new Promise<void>((resolve) => (answer = resolve));
    const slowLlm: typeof llm = { completeJson: async (req) => (await gate, llm.completeJson(req)) };
    const service = new NewsService({ feeds, fetch, llm: slowLlm, maxPreviewFetches: 0 });
    const first = await service.latest();
    expect(first.items).toHaveLength(3);
    expect(first.items.every((i) => i.rated === "guess")).toBe(true);
    answer();
    await service.settled();
    const after = await service.latest();
    expect(after.items.map((i) => i.title)).toEqual(["Gurdwara holds langar", "Sikh parade draws thousands in Yuba City"]);
    expect(after.items[1]).toMatchObject({ interest: 3, tone: "uplifting", kind: "celebration", appeal: 3, rated: "model" });
    expect(calls).toHaveLength(1);
  });

  it("keeps the keyword guesses when the model fails", async () => {
    const fetch = vi.fn(async () => new Response(rss(["Gurdwara holds langar"])));
    const { llm } = fakeLlm({ "news-rating": () => ({ nope: true }) });
    const service = new NewsService({ feeds, fetch, llm, maxPreviewFetches: 0 });
    await service.latest();
    await service.settled();
    expect((await service.latest()).items[0]!.rated).toBe("guess");
  });
});

describe("slugify", () => {
  it("makes URL-safe slugs, including for Gurmukhi topics", () => {
    expect(slugify("Zafarnama")).toBe("zafarnama");
    expect(slugify("Saka Nankana Sahib (1921)")).toBe("saka-nankana-sahib-1921");
    expect(slugify("ਜ਼ਫ਼ਰਨਾਮਾ")).toMatch(/^t-[a-z0-9]+$/);
  });
});

describe("placeFor", () => {
  it("prefers the most specific place in the headline", () => {
    expect(placeFor("Belgian Sikh Community to Host Key Dialogue in Sint-Truiden", "")?.name).toBe("Sint-Truiden");
    expect(placeFor("Punjab police arrest two in Mansa", "")?.name).toBe("Mansa");
  });

  it("falls back to the snippet, and knows Sikh institutions' homes", () => {
    expect(placeFor("Community gathers for remembrance", "Sangat met in Surrey, B.C. on Sunday")?.name).toBe("Surrey");
    expect(placeFor("SGPC honours students", "")?.name).toBe("Amritsar");
  });

  it("matches Gurmukhi place names", () => {
    expect(placeFor("ਲੁਧਿਆਣਾ ਵਿੱਚ ਨਗਰ ਕੀਰਤਨ", "")?.name).toBe("Ludhiana");
  });

  it("does not treat the Congress party or the word 'us' as places in the US", () => {
    expect(placeFor("Punjab Congress meets on alliance", "")?.name).toBe("Punjab");
    expect(placeFor("Join us for kirtan", "")).toBeNull();
  });
});

describe("imageFrom", () => {
  it("reads photos from real feeds", () => {
    const withPhotos = parseFeed(fixture("toi-chandigarh.xml"), { ...feed("toi"), mustMatch: /./ });
    expect(withPhotos.length).toBeGreaterThan(0);
    expect(withPhotos.every((i) => i.image?.startsWith("https://"))).toBe(true);
  });

  it("upgrades BBC's small thumbnails", () => {
    const items = parseFeed(fixture("bbc-punjabi.xml"), { ...feed("bbcpunjabi"), mustMatch: /./ });
    expect(items.some((i) => i.image?.includes("/ace/ws/800/"))).toBe(true);
  });

  it("asks Times of India for an 800px photo, not the original", () => {
    expect(imageFrom({ enclosure: { "@_url": "https://static.toiimg.com/photo/msid-135197171,imgsize-2692216.cms", "@_type": "image/jpeg" } })).toBe(
      "https://static.toiimg.com/thumb/msid-135197171,width-800,resizemode-4/photo.jpg",
    );
  });

  it("skips video embeds and uses an <img> in the HTML", () => {
    expect(imageFrom({ "media:content": { "@_url": "https://www.youtube.com/embed/x" } })).toBeNull();
    expect(imageFrom({ description: '<p><img src="https://example.org/a.jpg" /></p>' })).toBe("https://example.org/a.jpg");
  });
});

describe("Google News links", () => {
  const link = "https://news.google.com/rss/articles/CBMiABC123?oc=5";
  const article = "https://www.example-paper.com/news/sikh-volunteers-serve-langar";
  // A stand-in for Google: the article page carries a signature, the decoding endpoint answers with the publisher's URL.
  const google = (answer = article) =>
    vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const u = String(url);
      if (u === "https://news.google.com/rss/articles/CBMiABC123") return new Response('<html><c-wiz><div data-n-a-sg="SIG" data-n-a-ts="1700000000"></div></c-wiz></html>');
      if (u.includes("batchexecute")) {
        const req = decodeURIComponent(String(init?.body).slice("f.req=".length));
        expect(req).toContain("CBMiABC123");
        expect(req).toContain("SIG");
        return new Response(`)]}'\n\n${JSON.stringify([["wrb.fr", "Fbv4je", JSON.stringify(["garturlres", answer, 1])]])}`);
      }
      if (u === article) return new Response('<html><head><meta property="og:image" content="https://www.example-paper.com/photo.jpg"></head></html>');
      return new Response("", { status: 404 });
    });

  it("follows a Google News link to the publisher's article", async () => {
    expect(await resolveGoogleNewsUrl(link, google() as unknown as typeof fetch)).toBe(article);
  });

  it("gives up quietly when Google doesn't answer", async () => {
    const fetch = vi.fn(async () => new Response("", { status: 500 }));
    expect(await resolveGoogleNewsUrl(link, fetch as unknown as typeof globalThis.fetch)).toBeNull();
    expect(await resolveGoogleNewsUrl("https://example.org/not-google", fetch as unknown as typeof globalThis.fetch)).toBeNull();
  });

  it("points Google News stories at the publisher, with its photo, in the background", async () => {
    const goog = google();
    const fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) =>
      String(url) === "https://feed.test/rss"
        ? new Response(`<rss><channel><item><title>Sikh volunteers serve langar - Example Paper</title><link>${link}</link><source url="https://www.example-paper.com">Example Paper</source><pubDate>Sat, 24 Oct 2026 10:00:00 GMT</pubDate></item></channel></rss>`)
        : goog(url, init),
    );
    const feeds: NewsFeed[] = [{ id: "g", name: "Google News", url: "https://feed.test/rss", language: "en", categories: ["panth"], aggregator: true }];
    const service = new NewsService({ feeds, fetch: fetch as unknown as typeof globalThis.fetch, maxPreviewFetches: 0 });
    const first = await service.latest();
    expect(first.items[0]).toMatchObject({ url: link, image: null });
    await service.settled();
    expect((await service.latest()).items[0]).toMatchObject({ url: article, image: "https://www.example-paper.com/photo.jpg", source: "Example Paper" });
  });
});
