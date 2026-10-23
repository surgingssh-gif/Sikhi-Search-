import { Hono } from "hono";
import { cors } from "hono/cors";
import { BaniDbClient, BaniDbError, BaniDbNotFoundError } from "@ask-sikhi/core";

export interface AppDeps {
  banidb: Pick<BaniDbClient, "getShabad">;
  allowedOrigins?: string[];
}

/** Shown with every response that contains Gurbani. */
export const GURBANI_ATTRIBUTION = "Gurbani text, translations and transliterations from BaniDB by Khalis Foundation.";

export function createApp({ banidb, allowedOrigins = [] }: AppDeps) {
  const app = new Hono();

  app.use("/v1/*", cors({ origin: allowedOrigins, allowMethods: ["GET", "POST"] }));

  app.get("/v1/health", (c) => c.json({ ok: true }));

  app.get("/v1/shabads/:id", async (c) => {
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id < 1) {
      return c.json({ error: "invalid_shabad_id" }, 400);
    }
    const shabad = await banidb.getShabad(id);
    c.header("cache-control", "public, max-age=3600");
    return c.json({ shabad, attribution: GURBANI_ATTRIBUTION });
  });

  app.notFound((c) => c.json({ error: "not_found" }, 404));

  app.onError((err, c) => {
    if (err instanceof BaniDbNotFoundError) return c.json({ error: "not_found", message: err.message }, 404);
    if (err instanceof BaniDbError) {
      console.error("BaniDB error:", err.message);
      return c.json({ error: "upstream_unavailable" }, 502);
    }
    console.error(err);
    return c.json({ error: "internal_error" }, 500);
  });

  return app;
}
