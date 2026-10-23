import { serve } from "@hono/node-server";
import { AnthropicJsonLlm, BaniDbClient, type ModelTier } from "@ask-sikhi/core";
import { createApp } from "./app";

const port = Number(process.env.PORT ?? 8787);
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const banidb = new BaniDbClient(process.env.BANIDB_BASE_URL ? { baseUrl: process.env.BANIDB_BASE_URL } : {});

const models: Partial<Record<ModelTier, string>> = {};
if (process.env.ANSWER_MODEL) models.answer = process.env.ANSWER_MODEL;
if (process.env.FAST_MODEL) models.fast = process.env.FAST_MODEL;
const llm = process.env.ANTHROPIC_API_KEY ? new AnthropicJsonLlm({ models }) : undefined;

const app = createApp({
  banidb,
  allowedOrigins,
  ...(llm ? { llm } : {}),
  ...(process.env.AI_REQUESTS_PER_MINUTE ? { aiRequestsPerMinute: Number(process.env.AI_REQUESTS_PER_MINUTE) } : {}),
});

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Ask Sikhi API listening on http://localhost:${info.port}`);
  console.log(llm ? `AI answers: ${llm.models.answer} (fast steps: ${llm.models.fast})` : "AI answers disabled: set ANTHROPIC_API_KEY in .env");
});
