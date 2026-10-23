import { serve } from "@hono/node-server";
import { BaniDbClient } from "@ask-sikhi/core";
import { createApp } from "./app";

const port = Number(process.env.PORT ?? 8787);
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const banidb = new BaniDbClient(process.env.BANIDB_BASE_URL ? { baseUrl: process.env.BANIDB_BASE_URL } : {});
const app = createApp({ banidb, allowedOrigins });

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Ask Sikhi API listening on http://localhost:${info.port}`);
});
