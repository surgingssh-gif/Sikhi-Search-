import { Hono, type Context } from "hono";
import { streamSSE } from "hono/streaming";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { cors } from "hono/cors";
import { z } from "zod";
import {
  ask,
  BaniDbError,
  BaniDbNotFoundError,
  explore,
  LlmRefusalError,
  type BaniDbClient,
  type JsonLlm,
  type Stage,
} from "@ask-sikhi/core";
import { rateLimit } from "./rate-limit";

export interface AppDeps {
  banidb: Pick<BaniDbClient, "getShabad" | "searchTranslations">;
  /** Absent when no model credentials are configured; AI endpoints then return 503. */
  llm?: JsonLlm;
  allowedOrigins?: string[];
  /** Per-client limit on AI endpoints, per minute. */
  aiRequestsPerMinute?: number;
}

/** Shown with every response that contains Gurbani. */
export const GURBANI_ATTRIBUTION = "Gurbani text, translations and transliterations from BaniDB by Khalis Foundation.";

const AskBody = z.object({
  question: z.string().trim().min(3).max(500),
  /** Earlier turns, held by the client. The server stores no conversations. */
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .max(12)
    .optional(),
});

const ExploreBody = AskBody.pick({ question: true });

export function createApp({ banidb, llm, allowedOrigins = [], aiRequestsPerMinute = 10 }: AppDeps) {
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

  const aiLimit = rateLimit({ limit: aiRequestsPerMinute, windowMs: 60_000 });

  /**
   * With `Accept: text/event-stream` the response is Server-Sent Events:
   * `stage` events ({ stage }) as the pipeline progresses, then one `result`
   * (the same JSON as the plain response) or one `error` ({ error, message? }).
   */
  function respond(c: Context, run: (onStage: (s: Stage) => void) => Promise<object>) {
    if (!(c.req.header("accept") ?? "").includes("text/event-stream")) {
      return run(() => {}).then((result) => c.json({ ...result, attribution: GURBANI_ATTRIBUTION }));
    }
    return streamSSE(c, async (stream) => {
      try {
        const result = await run((stage) => void stream.writeSSE({ event: "stage", data: JSON.stringify({ stage }) }));
        await stream.writeSSE({ event: "result", data: JSON.stringify({ ...result, attribution: GURBANI_ATTRIBUTION }) });
      } catch (err) {
        await stream.writeSSE({ event: "error", data: JSON.stringify(errorResponse(err).body) });
      }
    });
  }

  app.post("/v1/ask", aiLimit, async (c) => {
    if (!llm) return c.json({ error: "ai_not_configured" }, 503);
    const body = AskBody.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: "invalid_request", issues: body.error.issues }, 400);
    const { question, history = [] } = body.data;
    return respond(c, (onStage) => ask({ llm, banidb }, question, history, { onStage }));
  });

  app.post("/v1/explore", aiLimit, async (c) => {
    if (!llm) return c.json({ error: "ai_not_configured" }, 503);
    const body = ExploreBody.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: "invalid_request", issues: body.error.issues }, 400);
    return respond(c, (onStage) => explore({ llm, banidb }, body.data.question, { onStage }));
  });

  app.notFound((c) => c.json({ error: "not_found" }, 404));

  app.onError((err, c) => {
    const { status, body } = errorResponse(err);
    return c.json(body, status);
  });

  return app;
}

function errorResponse(err: unknown): { status: ContentfulStatusCode; body: { error: string; message?: string } } {
  if (err instanceof BaniDbNotFoundError) return { status: 404, body: { error: "not_found", message: err.message } };
  if (err instanceof BaniDbError) {
    console.error("BaniDB error:", err.message);
    return { status: 502, body: { error: "upstream_unavailable" } };
  }
  if (err instanceof LlmRefusalError) {
    return { status: 422, body: { error: "declined", message: "This question can't be answered here." } };
  }
  console.error(err);
  return { status: 500, body: { error: "internal_error" } };
}
