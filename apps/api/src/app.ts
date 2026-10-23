import { Hono } from "hono";
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

  app.post("/v1/ask", aiLimit, async (c) => {
    if (!llm) return c.json({ error: "ai_not_configured" }, 503);
    const body = AskBody.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: "invalid_request", issues: body.error.issues }, 400);
    const result = await ask({ llm, banidb }, body.data.question, body.data.history ?? []);
    return c.json({ ...result, attribution: GURBANI_ATTRIBUTION });
  });

  app.post("/v1/explore", aiLimit, async (c) => {
    if (!llm) return c.json({ error: "ai_not_configured" }, 503);
    const body = ExploreBody.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: "invalid_request", issues: body.error.issues }, 400);
    const result = await explore({ llm, banidb }, body.data.question);
    return c.json({ ...result, attribution: GURBANI_ATTRIBUTION });
  });

  app.notFound((c) => c.json({ error: "not_found" }, 404));

  app.onError((err, c) => {
    if (err instanceof BaniDbNotFoundError) return c.json({ error: "not_found", message: err.message }, 404);
    if (err instanceof BaniDbError) {
      console.error("BaniDB error:", err.message);
      return c.json({ error: "upstream_unavailable" }, 502);
    }
    if (err instanceof LlmRefusalError) {
      return c.json({ error: "declined", message: "This question can't be answered here." }, 422);
    }
    console.error(err);
    return c.json({ error: "internal_error" }, 500);
  });

  return app;
}
