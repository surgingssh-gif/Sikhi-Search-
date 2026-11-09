import { describe, expect, it, vi } from "vitest";
import {
  BaniDbError,
  BaniDbNotFoundError,
  normalizeShabad,
  NotASikhTopicError,
  type JsonLlm,
  type LibraryEntry,
  type NewsItem,
  type RawShabadResponse,
} from "@ask-sikhi/core";
import { MemoryLibraryStore } from "../src/library-store";
import { createApp, GURBANI_ATTRIBUTION } from "../src/app";
import shabadFixture from "../../../packages/core/test/fixtures/shabad-1.json";

const shabad = normalizeShabad(shabadFixture as unknown as RawShabadResponse);
const emptySearch = async (query: string) => ({ query, totalResults: 0, page: 0, totalPages: 0, hits: [] });
const banidbWith = (getShabad: (id: number) => Promise<typeof shabad>) => ({
  getShabad,
  searchTranslations: emptySearch,
  searchGurbani: emptySearch,
  getHukamnamaToday: async () => ({ date: "2026-10-24", shabads: [shabad] }),
  getAng: async (ang: number) => ({ ang, shabads: [] }),
  getBanis: async () => [{ baniId: 2, name: "japujee saahib", gurmukhi: "ਜਪੁਜੀ ਸਾਹਿਬ" }],
  getBani: async (id: number) => ({ baniId: id, name: "japujee saahib", gurmukhi: "ਜਪੁਜੀ ਸਾਹਿਬ", source: null, writer: null, raag: null, verses: [] }),
});

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  ({ method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) }) as const;

describe("GET /v1/shabads/:id", () => {
  it("returns the shabad with attribution", async () => {
    const getShabad = vi.fn(async () => shabad);
    const app = createApp({ banidb: banidbWith(getShabad) });

    const res = await app.request("/v1/shabads/1");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ shabad, attribution: GURBANI_ATTRIBUTION });
    expect(getShabad).toHaveBeenCalledWith(1);
  });

  it("rejects non-numeric ids", async () => {
    const getShabad = vi.fn(async () => shabad);
    const app = createApp({ banidb: banidbWith(getShabad) });
    expect((await app.request("/v1/shabads/abc")).status).toBe(400);
    expect(getShabad).not.toHaveBeenCalled();
  });

  it("returns 404 when BaniDB has no such shabad", async () => {
    const app = createApp({ banidb: banidbWith(async () => Promise.reject(new BaniDbNotFoundError("nope"))) });
    expect((await app.request("/v1/shabads/99999999")).status).toBe(404);
  });

  it("returns 502 when BaniDB is unavailable", async () => {
    const app = createApp({ banidb: banidbWith(async () => Promise.reject(new BaniDbError("down", 503))) });
    const res = await app.request("/v1/shabads/1");
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "upstream_unavailable" });
  });
});

describe("POST /v1/ask and /v1/explore", () => {
  // With no search hits the pipeline makes two model calls (expand, answer) and cites nothing.
  const llm: JsonLlm = {
    completeJson: async (req) => ({
      data: req.schema.parse(
        req.step === "expand"
          ? { category: "practice", concepts: [], searchTerms: ["dastaar"] }
          : { summary: "A dastaar is...", sections: [], basis: "general_knowledge", followUps: [] },
      ),
      usage: { step: req.step, model: "fake", inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0, costUsd: 0 },
    }),
  };

  it("answers with attribution and a source label", async () => {
    const app = createApp({ banidb: banidbWith(async () => shabad), llm });
    const res = await app.request("/v1/ask", post("/v1/ask", { question: "Why do Sikhs wear a dastaar?" }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json).toMatchObject({ basis: "general_knowledge", attribution: GURBANI_ATTRIBUTION, passages: [] });
    expect(json.sourceLabel).toBeTruthy();
  });

  it("streams progress stages then the result when asked for event-stream", async () => {
    const app = createApp({ banidb: banidbWith(async () => shabad), llm });
    const res = await app.request("/v1/ask", post("/v1/ask", { question: "Why do Sikhs wear a dastaar?" }, { accept: "text/event-stream" }));
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const text = await res.text();
    const events = [...text.matchAll(/event: (\w+)\ndata: (.*)\n/g)].map((m) => ({ event: m[1], data: JSON.parse(m[2]!) }));
    expect(events.filter((e) => e.event === "stage").map((e) => e.data.stage)).toEqual([
      "understanding",
      "searching",
      "reading",
      "writing",
      "checking",
    ]);
    expect(events.at(-1)).toMatchObject({ event: "result", data: { basis: "general_knowledge", attribution: GURBANI_ATTRIBUTION } });
  });

  it("reports pipeline failures as an error event when streaming", async () => {
    const failing: JsonLlm = { completeJson: async () => Promise.reject(new Error("boom")) };
    const app = createApp({ banidb: banidbWith(async () => shabad), llm: failing });
    const res = await app.request("/v1/ask", post("/v1/ask", { question: "What is Hukam?" }, { accept: "text/event-stream" }));
    expect(await res.text()).toContain('event: error\ndata: {"error":"internal_error"}');
  });

  it("validates the question", async () => {
    const app = createApp({ banidb: banidbWith(async () => shabad), llm });
    expect((await app.request("/v1/ask", post("/v1/ask", { question: "" }))).status).toBe(400);
    expect((await app.request("/v1/ask", post("/v1/ask", { question: "x".repeat(501) }))).status).toBe(400);
    expect((await app.request("/v1/explore", post("/v1/explore", {}))).status).toBe(400);
  });

  it("returns 503 when no model is configured", async () => {
    const app = createApp({ banidb: banidbWith(async () => shabad) });
    expect((await app.request("/v1/ask", post("/v1/ask", { question: "What is Hukam?" }))).status).toBe(503);
  });

  it("rate limits each client", async () => {
    const app = createApp({ banidb: banidbWith(async () => shabad), llm, aiRequestsPerMinute: 2 });
    const send = (ip: string) => app.request("/v1/explore", post("/v1/explore", { question: "What is Hukam?" }, { "x-forwarded-for": ip }));
    expect((await send("1.1.1.1")).status).toBe(200);
    expect((await send("1.1.1.1")).status).toBe(200);
    const limited = await send("1.1.1.1");
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBeTruthy();
    expect((await send("2.2.2.2")).status).toBe(200);
  });
});

describe("Discuss Gurbani routes", () => {
  const discussLlm: JsonLlm = {
    completeJson: async (req) => ({
      data: req.schema.parse({ reply: "This shabad is about trust.", followUps: [] }),
      usage: { step: req.step, model: "fake", inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0, costUsd: 0 },
    }),
  };

  it("returns today's Hukamnama", async () => {
    const app = createApp({ banidb: banidbWith(async () => shabad) });
    const res = await app.request("/v1/hukamnama/today");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ date: "2026-10-24", shabads: [{ shabadId: shabad.shabadId }], attribution: GURBANI_ATTRIBUTION });
  });

  it("validates Ang numbers", async () => {
    const app = createApp({ banidb: banidbWith(async () => shabad) });
    expect((await app.request("/v1/angs/0")).status).toBe(400);
    expect((await app.request("/v1/angs/1431")).status).toBe(400);
    expect((await app.request("/v1/angs/abc")).status).toBe(400);
    expect((await app.request("/v1/angs/473")).status).toBe(200);
  });

  it("discusses a shabad", async () => {
    const app = createApp({ banidb: banidbWith(async () => shabad), llm: discussLlm });
    const res = await app.request("/v1/discuss", post("/v1/discuss", { shabadId: 1, question: "What is this about?" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ shabadId: 1, answer: "This shabad is about trust." });
  });

  it("requires a shabad id and a question", async () => {
    const app = createApp({ banidb: banidbWith(async () => shabad), llm: discussLlm });
    expect((await app.request("/v1/discuss", post("/v1/discuss", { question: "What is this about?" }))).status).toBe(400);
    expect((await app.request("/v1/discuss", post("/v1/discuss", { shabadId: 1 }))).status).toBe(400);
  });
});

describe("Library routes", () => {
  const entry = (slug: string): LibraryEntry => ({
    slug,
    topic: slug,
    title: "Zafarnama",
    titleGurmukhi: "ਜ਼ਫ਼ਰਨਾਮਾ",
    kind: "bani",
    summary: "A letter.",
    facts: [],
    sections: [],
    related: [],
    sources: [{ title: "Example", url: "https://example.org", site: "example.org" }],
    baniId: null,
    generatedAt: "2026-10-25T00:00:00.000Z",
    model: "fake",
    reviewed: false,
    usage: { costUsd: 0, searches: 0 },
  });
  const research = (topic: string) => post("/v1/library/research", { topic });

  it("researches a topic once, then serves it from the store", async () => {
    const fn = vi.fn(async () => entry("zafarnama"));
    const store = new MemoryLibraryStore();
    const app = createApp({ banidb: banidbWith(async () => shabad), library: { store, research: fn } });

    const first = await app.request("/v1/library/research", research("Zafarnama letter"));
    expect(first.status).toBe(200);
    expect(((await first.json()) as { entry: LibraryEntry }).entry.slug).toBe("zafarnama");
    await app.request("/v1/library/research", research("Zafarnama letter"));
    expect(fn).toHaveBeenCalledTimes(1);

    // Found by its own slug and by the topic that was typed.
    expect((await app.request("/v1/library/zafarnama")).status).toBe(200);
    expect((await app.request("/v1/library/zafarnama-letter")).status).toBe(200);
    const list = (await (await app.request("/v1/library")).json()) as { entries: unknown[] };
    expect(list.entries).toHaveLength(1);
  });

  it("runs one research job when several people ask at once", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const fn = vi.fn(async () => {
      await gate;
      return entry("chamkaur");
    });
    const app = createApp({ banidb: banidbWith(async () => shabad), library: { store: new MemoryLibraryStore(), research: fn } });
    const a = app.request("/v1/library/research", research("Chamkaur"));
    const b = app.request("/v1/library/research", research("Chamkaur"));
    release();
    expect((await a).status).toBe(200);
    expect((await b).status).toBe(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("declines topics outside Sikhi", async () => {
    const app = createApp({
      banidb: banidbWith(async () => shabad),
      library: { store: new MemoryLibraryStore(), research: async (t) => Promise.reject(new NotASikhTopicError(t)) },
    });
    const res = await app.request("/v1/library/research", research("best pizza"));
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ error: "not_sikh_topic" });
  });

  it("returns 404 for unknown entries and 503 without research", async () => {
    const app = createApp({ banidb: banidbWith(async () => shabad), library: { store: new MemoryLibraryStore() } });
    expect((await app.request("/v1/library/nothing-here")).status).toBe(404);
    expect((await app.request("/v1/library/research", research("Zafarnama"))).status).toBe(503);
  });

  it("lists banis and returns one", async () => {
    const app = createApp({ banidb: banidbWith(async () => shabad) });
    expect(await (await app.request("/v1/banis")).json()).toMatchObject({ banis: [{ baniId: 2 }] });
    expect((await app.request("/v1/banis/2")).status).toBe(200);
    expect((await app.request("/v1/banis/x")).status).toBe(400);
  });
});

describe("News routes", () => {
  const stubLlm: JsonLlm = { completeJson: async () => Promise.reject(new Error("unused")) };
  const item = (id: string, categories: NewsItem["categories"]): NewsItem => ({
    id,
    title: `Story ${id}`,
    url: `https://example.org/${id}`,
    source: "Example",
    feedId: "example",
    language: "en",
    publishedAt: null,
    snippet: "",
    categories,
    image: null,
    place: null,
    interest: 2,
    tone: "neutral",
    america: false,
    rated: "guess",
  });
  const news = {
    latest: async () => ({ items: [item("a", ["panth"]), item("b", ["punjab"]), item("c", ["panth", "diaspora"])], failed: [], fetchedAt: "2026-10-25T00:00:00.000Z" }),
    briefingToday: async () => ({ generatedAt: "2026-10-25T00:00:00.000Z", bullets: [{ text: "A story.", itemIds: ["a"] }], usage: null }),
  };

  it("filters by category and limits", async () => {
    const app = createApp({ banidb: banidbWith(async () => shabad), news });
    const panth = (await (await app.request("/v1/news?category=panth")).json()) as { items: NewsItem[] };
    expect(panth.items.map((i) => i.id)).toEqual(["a", "c"]);
    const one = (await (await app.request("/v1/news?limit=1")).json()) as { items: NewsItem[] };
    expect(one.items).toHaveLength(1);
  });

  it("serves the briefing only when a model is configured", async () => {
    expect((await createApp({ banidb: banidbWith(async () => shabad), news }).request("/v1/news/briefing")).status).toBe(503);
    const res = await createApp({ banidb: banidbWith(async () => shabad), news, llm: stubLlm }).request("/v1/news/briefing");
    expect(await res.json()).toMatchObject({ bullets: [{ itemIds: ["a"] }] });
  });
});

describe("CORS", () => {
  it("allows configured origins only", async () => {
    const app = createApp({ banidb: banidbWith(async () => shabad), allowedOrigins: ["http://localhost:3000"] });
    const allowed = await app.request("/v1/health", { headers: { origin: "http://localhost:3000" } });
    expect(allowed.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
    const other = await app.request("/v1/health", { headers: { origin: "https://evil.example" } });
    expect(other.headers.get("access-control-allow-origin")).toBeNull();
  });
});

describe("GET /v1/history", () => {
  const app = createApp({ banidb: banidbWith(async () => null as never) });

  it("lists anniversaries around a date", async () => {
    const res = await app.request("/v1/history?date=2026-11-01&before=1&after=0");
    expect(res.status).toBe(200);
    const { events } = (await res.json()) as { events: { id: string; daysAway: number }[] };
    expect(events.map((e) => e.id)).toEqual(expect.arrayContaining(["indira-gandhi-assassination", "november-1984", "punjab-reorganised"]));
    expect(events.every((e) => e.daysAway <= 0 && e.daysAway >= -1)).toBe(true);
  });

  it("rejects a malformed date", async () => {
    expect((await app.request("/v1/history?date=yesterday")).status).toBe(400);
  });
});

describe("GET /v1/calendar", () => {
  const app = createApp({ banidb: banidbWith(async () => null as never) });

  it("gives today's Nanakshahi date and the Jantri days ahead", async () => {
    const res = await app.request("/v1/calendar?date=2026-11-03&days=30");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { today: { label: string }; events: { id: string; date: string }[]; coversUntil: string };
    expect(body.today.label).toBe("18 Katak 558");
    expect(body.events.map((e) => e.id)).toEqual(expect.arrayContaining(["bandi-chhor-divas", "parkash-guru-nanak"]));
    expect(body.events.every((e) => e.date >= "2026-11-03" && e.date <= "2026-12-03")).toBe(true);
    expect(body.coversUntil).toBe("2027-03-14");
  });

  it("rejects a malformed date", async () => {
    expect((await app.request("/v1/calendar?date=soon")).status).toBe(400);
  });
});

describe("GET /v1/search", () => {
  it("passes the query and mode to BaniDB", async () => {
    const searchGurbani = vi.fn(emptySearch);
    const app = createApp({ banidb: { ...banidbWith(async () => shabad), searchGurbani } });
    const res = await app.request("/v1/search?q=skmk&mode=first-letters&page=2");
    expect(res.status).toBe(200);
    expect(searchGurbani).toHaveBeenCalledWith("skmk", "first-letters", { page: 2, results: 20 });
  });

  it("rejects an empty query or an unknown mode", async () => {
    const app = createApp({ banidb: banidbWith(async () => shabad) });
    expect((await app.request("/v1/search?q=")).status).toBe(400);
    expect((await app.request("/v1/search?q=waheguru&mode=fuzzy")).status).toBe(400);
  });
});
