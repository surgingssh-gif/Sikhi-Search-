import { Hono, type Context } from "hono";
import { streamSSE } from "hono/streaming";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { cors } from "hono/cors";
import { z } from "zod";
import {
  ask,
  BaniDbError,
  BaniDbNotFoundError,
  discuss,
  explore,
  LlmRefusalError,
  NotASikhTopicError,
  HISTORY_EVENTS,
  eventsAround,
  calendarEvents,
  JANTRI_ATTRIBUTION,
  jantriCoversUntil,
  nanakshahiDate,
  HISTORY_COLLECTIONS,
  WIKIPEDIA_ATTRIBUTION,
  WikipediaError,
  type WikipediaClient,
  slugify,
  type BaniDbClient,
  type JsonLlm,
  type LibraryEntry,
  type Stage,
} from "@ask-sikhi/core";
import type { LibraryStoreLike } from "./library-store";
import type { NewsService } from "./news";
import { rateLimit } from "./rate-limit";

export interface AppDeps {
  banidb: Pick<BaniDbClient, "getShabad" | "searchTranslations" | "searchGurbani" | "getHukamnamaToday" | "getAng" | "getBanis" | "getBani">;
  /** Absent when no model credentials are configured; AI endpoints then return 503. */
  llm?: JsonLlm;
  /** Library storage and research. Research is absent without model credentials. */
  library?: { store: LibraryStoreLike; research?: (topic: string, onStage: (s: Stage) => void) => Promise<LibraryEntry> };
  /** Sikh history from Wikipedia. Absent in tests that don't need it. */
  wikipedia?: Pick<WikipediaClient, "search" | "summaries" | "article">;
  /** Sikh and Punjab news. */
  news?: Pick<NewsService, "latest" | "briefingToday"> & Partial<Pick<NewsService, "article">>;
  allowedOrigins?: string[];
  /** Per-client limit on AI endpoints, per minute. */
  aiRequestsPerMinute?: number;
}

/** Shown with every response that contains Gurbani. */
export const GURBANI_ATTRIBUTION = "Gurbani text, translations and transliterations from BaniDB by Khalis Foundation.";

const LanguageField = z.enum(["en", "pa"]).optional();

const AskBody = z.object({
  language: LanguageField,
  question: z.string().trim().min(3).max(500),
  /** Earlier turns, held by the client. The server stores no conversations. */
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .max(12)
    .optional(),
});

const ExploreBody = AskBody.pick({ question: true, language: true });

const DiscussBody = AskBody.extend({ shabadId: z.number().int().positive() });

const ResearchBody = z.object({ topic: z.string().trim().min(2).max(120) });

export function createApp({ banidb, llm, library, news, wikipedia, allowedOrigins = [], aiRequestsPerMinute = 10 }: AppDeps) {
  const app = new Hono();

  app.use("/v1/*", cors({ origin: allowedOrigins, allowMethods: ["GET", "POST"] }));

  app.get("/v1/health", (c) => c.json({ ok: true, ai: Boolean(llm) }));

  app.get("/v1/shabads/:id", async (c) => {
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id < 1) {
      return c.json({ error: "invalid_shabad_id" }, 400);
    }
    const shabad = await banidb.getShabad(id);
    c.header("cache-control", "public, max-age=3600");
    return c.json({ shabad, attribution: GURBANI_ATTRIBUTION });
  });

  app.get("/v1/hukamnama/today", async (c) => {
    const hukamnama = await banidb.getHukamnamaToday();
    c.header("cache-control", "public, max-age=600");
    return c.json({ ...hukamnama, attribution: GURBANI_ATTRIBUTION });
  });

  app.get("/v1/banis", async (c) => {
    c.header("cache-control", "public, max-age=86400");
    return c.json({ banis: await banidb.getBanis() });
  });

  app.get("/v1/banis/:id", async (c) => {
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id < 1) return c.json({ error: "invalid_bani_id" }, 400);
    c.header("cache-control", "public, max-age=86400");
    return c.json({ bani: await banidb.getBani(id), attribution: GURBANI_ATTRIBUTION });
  });

  // Searches go straight through to BaniDB, so readers get a generous limit but not an unlimited one.
  const searchLimit = rateLimit({ limit: 60, windowMs: 60_000 });

  app.get("/v1/search", searchLimit, async (c) => {
    const q = (c.req.query("q") ?? "").trim();
    const mode = c.req.query("mode") ?? "first-letters";
    if (!q || q.length > 100) return c.json({ error: "invalid_request" }, 400);
    if (mode !== "first-letters" && mode !== "words" && mode !== "meaning") return c.json({ error: "invalid_mode" }, 400);
    const page = Math.min(Math.max(Number(c.req.query("page")) || 1, 1), 50);
    const result = await banidb.searchGurbani(q, mode, { page, results: 20 });
    c.header("cache-control", "public, max-age=3600");
    return c.json({ ...result, attribution: GURBANI_ATTRIBUTION });
  });

  app.get("/v1/news", async (c) => {
    if (!news) return c.json({ items: [], failed: [], fetchedAt: null });
    const category = c.req.query("category");
    const limit = Math.min(Math.max(Number(c.req.query("limit")) || 60, 1), 400);
    const { items, failed, fetchedAt } = await news.latest();
    const filtered = category ? items.filter((i) => i.categories.includes(category as never)) : items;
    c.header("cache-control", "public, max-age=300");
    return c.json({ items: filtered.slice(0, limit), failed, fetchedAt });
  });

  // The opening paragraphs of one story, for its preview. Each one fetches a publisher's page, so it's limited.
  const articleLimit = rateLimit({ limit: 30, windowMs: 60_000 });
  app.get("/v1/news/article/:id", articleLimit, async (c) => {
    const id = c.req.param("id");
    if (!news?.article || !/^[\w-]{1,80}$/.test(id)) return c.json({ error: "not_found" }, 404);
    const article = await news.article(id);
    if (!article) return c.json({ error: "not_found" }, 404);
    c.header("cache-control", "public, max-age=3600");
    return c.json(article);
  });

  app.get("/v1/news/briefing", async (c) => {
    if (!news || !llm) return c.json({ error: "ai_not_configured" }, 503);
    const briefing = await news.briefingToday();
    c.header("cache-control", "public, max-age=600");
    return c.json({ generatedAt: briefing.generatedAt, lede: briefing.lede, bullets: briefing.bullets });
  });

  app.get("/v1/history", (c) => {
    // With ?date=YYYY-MM-DD: anniversaries around that day. Without: every event.
    const date = c.req.query("date");
    c.header("cache-control", "public, max-age=3600");
    if (!date) return c.json({ events: HISTORY_EVENTS });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return c.json({ error: "invalid_date" }, 400);
    const range = (v: string | undefined) => Math.min(Math.max(Number(v ?? 7) || 0, 0), 31);
    return c.json({ events: eventsAround(date, range(c.req.query("before")), range(c.req.query("after"))) });
  });

  app.get("/v1/history/collections", async (c) => {
    if (!wikipedia) return c.json({ collections: [] });
    const collections = await Promise.all(
      HISTORY_COLLECTIONS.map(async ({ titles, ...rest }) => ({ ...rest, items: await wikipedia.summaries(titles) })),
    );
    c.header("cache-control", "public, max-age=86400");
    return c.json({ collections, attribution: WIKIPEDIA_ATTRIBUTION });
  });

  app.get("/v1/history/search", searchLimit, async (c) => {
    const q = (c.req.query("q") ?? "").trim();
    if (q.length < 2 || q.length > 100) return c.json({ error: "invalid_request" }, 400);
    // Our own dated events first: every word of the query in the title or summary.
    const words = q.toLowerCase().split(/\s+/);
    const events = HISTORY_EVENTS.filter((e) => words.every((w) => `${e.title} ${e.summary}`.toLowerCase().includes(w)));
    const articles = wikipedia ? await wikipedia.search(q) : [];
    c.header("cache-control", "public, max-age=3600");
    return c.json({ events, articles, attribution: WIKIPEDIA_ATTRIBUTION });
  });

  app.get("/v1/history/article", async (c) => {
    const title = (c.req.query("title") ?? "").trim();
    if (!title || title.length > 200) return c.json({ error: "invalid_request" }, 400);
    if (!wikipedia) return c.json({ error: "not_found" }, 404);
    const article = await wikipedia.article(title);
    if (!article) return c.json({ error: "not_found" }, 404);
    c.header("cache-control", "public, max-age=86400");
    return c.json({ article, attribution: WIKIPEDIA_ATTRIBUTION });
  });

  app.get("/v1/calendar", (c) => {
    // The Nanakshahi date of ?date= (the reader's today) and the Jantri's days from then for ?days= days.
    const date = c.req.query("date") ?? new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return c.json({ error: "invalid_date" }, 400);
    const days = Math.min(Math.max(Number(c.req.query("days") ?? 60) || 0, 0), 400);
    const to = new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
    c.header("cache-control", "public, max-age=3600");
    return c.json({
      today: nanakshahiDate(date),
      events: calendarEvents(date, to),
      coversUntil: jantriCoversUntil(),
      attribution: JANTRI_ATTRIBUTION,
    });
  });

  app.get("/v1/library", async (c) => {
    if (!library) return c.json({ entries: [] });
    return c.json({ entries: await library.store.list() });
  });

  app.get("/v1/library/:slug", async (c) => {
    const entry = library ? await library.store.get(c.req.param("slug")) : null;
    return entry ? c.json({ entry }) : c.json({ error: "not_found" }, 404);
  });

  app.get("/v1/angs/:ang", async (c) => {
    const ang = Number(c.req.param("ang"));
    if (!Number.isInteger(ang) || ang < 1 || ang > 1430) {
      return c.json({ error: "invalid_ang", message: "Sri Guru Granth Sahib Ji has Angs 1 to 1430." }, 400);
    }
    const contents = await banidb.getAng(ang);
    c.header("cache-control", "public, max-age=3600");
    return c.json({ ...contents, attribution: GURBANI_ATTRIBUTION });
  });

  const aiLimit = rateLimit({ limit: aiRequestsPerMinute, windowMs: 60_000 });

  /**
   * With `Accept: text/event-stream` the response is Server-Sent Events:
   * `stage` events ({ stage }) as the pipeline progresses, then one `result`
   * (the same JSON as the plain response) or one `error` ({ error, message? }).
   */
  function respond(c: Context, run: (onStage: (s: Stage) => void) => Promise<object>, { attribution = true } = {}) {
    const finish = (result: object) => (attribution ? { ...result, attribution: GURBANI_ATTRIBUTION } : result);
    if (!(c.req.header("accept") ?? "").includes("text/event-stream")) {
      return run(() => {}).then((result) => c.json(finish(result)));
    }
    return streamSSE(c, async (stream) => {
      try {
        const result = await run((stage) => void stream.writeSSE({ event: "stage", data: JSON.stringify({ stage }) }));
        await stream.writeSSE({ event: "result", data: JSON.stringify(finish(result)) });
      } catch (err) {
        await stream.writeSSE({ event: "error", data: JSON.stringify(errorResponse(err).body) });
      }
    });
  }

  app.post("/v1/ask", aiLimit, async (c) => {
    if (!llm) return c.json({ error: "ai_not_configured" }, 503);
    const body = AskBody.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: "invalid_request", issues: body.error.issues }, 400);
    const { question, history = [], language = "en" } = body.data;
    return respond(c, (onStage) => ask({ llm, banidb }, question, history, { onStage, language }));
  });

  app.post("/v1/explore", aiLimit, async (c) => {
    if (!llm) return c.json({ error: "ai_not_configured" }, 503);
    const body = ExploreBody.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: "invalid_request", issues: body.error.issues }, 400);
    return respond(c, (onStage) => explore({ llm, banidb }, body.data.question, { onStage }));
  });

  app.post("/v1/discuss", aiLimit, async (c) => {
    if (!llm) return c.json({ error: "ai_not_configured" }, 503);
    const body = DiscussBody.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: "invalid_request", issues: body.error.issues }, 400);
    const { shabadId, question, history = [], language = "en" } = body.data;
    return respond(c, (onStage) => discuss({ llm, banidb }, shabadId, question, history, { onStage, language }));
  });

  // One research job per topic at a time, however many people ask at once.
  const inFlight = new Map<string, Promise<LibraryEntry>>();

  app.post("/v1/library/research", aiLimit, async (c) => {
    const body = ResearchBody.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: "invalid_request", issues: body.error.issues }, 400);
    if (!library) return c.json({ error: "ai_not_configured" }, 503);
    const topic = body.data.topic;
    const key = slugify(topic);
    const cached = await library.store.get(key);
    if (cached) return respond(c, async () => ({ entry: cached }), { attribution: false });
    const research = library.research;
    if (!research) return c.json({ error: "ai_not_configured" }, 503);
    return respond(
      c,
      async (onStage) => {
        let job = inFlight.get(key);
        if (!job) {
          job = research(topic, onStage)
            .then(async (entry) => {
              await library.store.put(entry, [key]);
              return entry;
            })
            .finally(() => inFlight.delete(key));
          inFlight.set(key, job);
        }
        return { entry: await job };
      },
      { attribution: false },
    );
  });

  app.notFound((c) => c.json({ error: "not_found" }, 404));

  app.onError((err, c) => {
    const { status, body } = errorResponse(err);
    return c.json(body, status);
  });

  return app;
}

function errorResponse(err: unknown): { status: ContentfulStatusCode; body: { error: string; message?: string } } {
  if (err instanceof WikipediaError) {
    console.error("Wikipedia error:", err.message);
    return { status: 502, body: { error: "upstream_unavailable" } };
  }
  if (err instanceof BaniDbNotFoundError) return { status: 404, body: { error: "not_found", message: err.message } };
  if (err instanceof BaniDbError) {
    console.error("BaniDB error:", err.message);
    return { status: 502, body: { error: "upstream_unavailable" } };
  }
  if (err instanceof NotASikhTopicError) {
    return { status: 422, body: { error: "not_sikh_topic", message: "The Library covers Sikhi, Sikh history and Punjab's Sikh heritage." } };
  }
  if (err instanceof LlmRefusalError) {
    return { status: 422, body: { error: "declined", message: "This question can't be answered here." } };
  }
  console.error(err);
  return { status: 500, body: { error: "internal_error" } };
}
