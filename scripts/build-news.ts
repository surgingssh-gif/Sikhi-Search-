/**
 * The hourly news job. Fetches the feeds, has the model rate and summarise
 * the stories, writes today's edition note and the opening paragraphs of the
 * main stories, and saves it all as JSON files the website reads. Runs on
 * GitHub's computers (see .github/workflows/site.yml), so the news stays
 * fresh with no server of our own.
 *
 * Usage: tsx scripts/build-news.ts <output folder> [memory file]
 * Needs ANTHROPIC_API_KEY; without it the stories keep their keyword guesses.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { AnthropicJsonLlm, isNews, NewsService, type NewsMemory } from "@ask-sikhi/core";

const [outDir, memoryFile = ".news-memory.json"] = process.argv.slice(2);
if (!outDir) {
  console.error("Usage: tsx scripts/build-news.ts <output folder> [memory file]");
  process.exit(1);
}

/** How many stories get their opening paragraphs fetched for the preview. */
const PREVIEWS = 120;

async function readMemory(): Promise<NewsMemory | undefined> {
  try {
    return JSON.parse(await readFile(memoryFile, "utf8")) as NewsMemory;
  } catch {
    return undefined;
  }
}

const memory = await readMemory();
const llm = process.env.ANTHROPIC_API_KEY ? new AnthropicJsonLlm({}) : undefined;
const news = new NewsService({ ...(llm ? { llm } : {}), ...(memory ? { memory } : {}) });

console.log(memory ? `Reusing ${memory.ratings.length} ratings and ${memory.summaries.length} summaries from the last run.` : "No memory from a last run; starting fresh.");
console.log(llm ? "Rating and summarising with the model." : "No ANTHROPIC_API_KEY: keyword guesses only.");

// Fetch, then wait for the rating, link resolving and summaries to finish.
await news.latest();
await news.settled();
const { items, failed, fetchedAt } = await news.latest();
console.log(`${items.length} stories (${items.filter((i) => i.rated === "model").length} rated by the model, ${items.filter((i) => i.summary).length} summarised); feeds that failed: ${failed.join(", ") || "none"}.`);

await mkdir(path.join(outDir, "articles"), { recursive: true });
const write = (name: string, value: unknown) => writeFile(path.join(outDir, name), JSON.stringify(value));

await write("news.json", { items, failed, fetchedAt });

if (llm) {
  try {
    const briefing = await news.briefingToday();
    await write("briefing.json", { generatedAt: briefing.generatedAt, lede: briefing.lede, bullets: briefing.bullets });
  } catch (err) {
    console.error("The edition note couldn't be written:", err);
  }
}

// Opening paragraphs for the most important stories, a few pages at a time. Remembered stories aren't fetched again.
const good = items
  .filter(isNews)
  .sort((a, b) => b.appeal - a.appeal || b.interest - a.interest)
  .slice(0, PREVIEWS);
let next = 0;
let found = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (next < good.length) {
      const item = good[next++]!;
      const article = await news.article(item.id);
      if (!article) continue;
      if (article.paragraphs.length) found++;
      await write(`articles/${item.id}.json`, article);
    }
  }),
);
console.log(`Opening paragraphs for ${found} of ${good.length} stories.`);

await writeFile(memoryFile, JSON.stringify(news.memory()));
console.log(`Saved the news to ${outDir}.`);
