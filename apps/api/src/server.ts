import path from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { AnthropicJsonLlm, BaniDbClient, NewsService, researchEntry, WikipediaClient, type BaniSummary, type ModelTier } from "@ask-sikhi/core";
import { createApp } from "./app";
import { FileLibraryStore } from "./library-store";

const here = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 8787);
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const banidb = new BaniDbClient(process.env.BANIDB_BASE_URL ? { baseUrl: process.env.BANIDB_BASE_URL } : {});

const models: Partial<Record<ModelTier, string>> = {};
if (process.env.ANSWER_MODEL) models.answer = process.env.ANSWER_MODEL;
if (process.env.FAST_MODEL) models.fast = process.env.FAST_MODEL;
const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);
const llm = hasKey ? new AnthropicJsonLlm({ models }) : undefined;

// Library entries are cached as files so each topic is researched once.
const libraryDir = process.env.LIBRARY_DIR ?? path.resolve(here, "../data/library");
let banis: BaniSummary[] | null = null;
const library = {
  store: new FileLibraryStore(libraryDir),
  ...(hasKey
    ? {
        research: async (topic: string, onStage: (s: "researching" | "writing") => void) => {
          banis ??= await banidb.getBanis();
          return researchEntry(topic, { banis, onStage, ...(process.env.LIBRARY_MODEL ? { model: process.env.LIBRARY_MODEL } : {}) });
        },
      }
    : {}),
};

const news = new NewsService(llm ? { llm } : {});

const app = createApp({
  banidb,
  allowedOrigins,
  library,
  news,
  wikipedia: new WikipediaClient(),
  ...(llm ? { llm } : {}),
  ...(process.env.AI_REQUESTS_PER_MINUTE ? { aiRequestsPerMinute: Number(process.env.AI_REQUESTS_PER_MINUTE) } : {}),
});

// Keep the news fresh even when nobody is reading: refresh it now and check every 10 minutes (it refetches once the 20-minute cache is stale),
// so stories are fetched, rated and summarised before the first reader of the day arrives.
const warm = () => void news.latest().catch((err: unknown) => console.error("News refresh failed:", err));
warm();
setInterval(warm, 10 * 60 * 1000).unref();

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Ask Sikhi API listening on http://localhost:${info.port}`);
  console.log(llm ? `AI answers: ${llm.models.answer} (fast steps: ${llm.models.fast})` : "AI answers disabled: set ANTHROPIC_API_KEY in .env");
  console.log(`Library entries stored in ${libraryDir}`);
});
