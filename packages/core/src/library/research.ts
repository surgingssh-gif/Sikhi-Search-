import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { estimateCostUsd } from "../ai/pricing";
import type { LlmUsage } from "../ai/llm";
import type { BaniSummary } from "../types";

/**
 * Library entries: short reference articles on Sikh topics (banis, events,
 * people, places, concepts). The model researches with web search and writes
 * only from what it found; the sources shown are the pages it actually
 * retrieved, never URLs it wrote itself.
 */

export const ENTRY_KINDS = ["bani", "event", "person", "place", "concept", "practice", "institution", "other"] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];

export interface LibrarySource {
  title: string;
  url: string;
  site: string;
}

export interface LibraryEntry {
  slug: string;
  /** What the person searched for. */
  topic: string;
  title: string;
  titleGurmukhi: string | null;
  kind: EntryKind;
  summary: string;
  facts: { label: string; value: string }[];
  sections: { title: string; body: string }[];
  related: string[];
  sources: LibrarySource[];
  /** Set when the entry is about a bani BaniDB has, so the real text can be shown. */
  baniId: number | null;
  generatedAt: string;
  model: string;
  /** Becomes true once a knowledgeable reviewer has checked the entry. */
  reviewed: boolean;
  usage: { costUsd: number; searches: number };
}

export class NotASikhTopicError extends Error {
  constructor(readonly topic: string) {
    super(`"${topic}" isn't a Sikh topic the Library covers`);
    this.name = "NotASikhTopicError";
  }
}

const EntrySchema = z.object({
  notSikhTopic: z.boolean(),
  title: z.string(),
  titleGurmukhi: z.string().nullable(),
  kind: z.enum(ENTRY_KINDS),
  summary: z.string(),
  facts: z.array(z.object({ label: z.string(), value: z.string() })).max(8),
  sections: z.array(z.object({ title: z.string(), body: z.string() })).max(5),
  related: z.array(z.string()).max(8),
  usedSources: z.array(z.string()),
  baniId: z.number().int().nullable(),
});

export const LIBRARY_SYSTEM = `You write entries for the Library of Ask Sikhi, a reference made for Sikhs who already know the basics and want depth.

## Research first
Use web search before writing: at least 2 searches, one of them aimed at Sikh scholarly or community sources, and at most 4. Prefer Sikh scholarly and community sources such as the Sikh Research Institute (SikhRI), The Sikh Encyclopedia, Punjabi University publications, SGPC, SikhiWiki and Sikh academic work, alongside reputable encyclopaedias, universities and established news outlets for recent events. Write only what your sources support. Where reliable sources disagree, say so briefly in plain terms (e.g. "accounts differ on the date"), without commenting on how a source is formatted or edited. Never invent dates, names, numbers or quotations.

## Voice and perspective
- Write for Sikhs: use Sikh terms naturally (Guru Sahib, Panth, Khalsa, shaheed, gurpurab) and the respect Sikhs use (Guru Gobind Singh Ji, Sri Guru Granth Sahib Ji).
- Tell Sikh history as the Sikh community remembers it, grounded in documented facts. Name violence and persecution against Sikhs plainly; do not soften it as "riots" or "clashes". Do not false-balance documented events. Never blame an entire religion, nation or community, and never encourage violence.
- Do not quote Gurbani or any Sikh scripture (including the Dasam Granth and the Zafarnama) in any script. Describe and paraphrase instead; the app shows real text separately.

## Output
When your research is done, reply with only a JSON object, no other text, matching:
{
  "notSikhTopic": boolean,          // true if the topic has nothing to do with Sikhi, Sikh history or Punjab's Sikh heritage; then other fields can be minimal
  "title": string,                  // the usual English name, e.g. "Zafarnama"
  "titleGurmukhi": string | null,   // the name in Gurmukhi if it has one, e.g. "ਜ਼ਫ਼ਰਨਾਮਾ"
  "kind": "bani" | "event" | "person" | "place" | "concept" | "practice" | "institution" | "other",
  "summary": string,                // 60-100 words: what it is and why it matters to Sikhs
  "facts": [{ "label": string, "value": string }],     // 3-6 key facts, e.g. Written by, Date, Place, Language
  "sections": [{ "title": string, "body": string }],   // 2-4 sections of 60-150 words, Markdown paragraphs or short lists, no headings
  "related": [string],              // 3-6 related Library topics
  "usedSources": [string],          // URLs of the search results you actually relied on
  "baniId": number | null           // if the topic is one of the BaniDB banis listed below, its ID; otherwise null
}

## BaniDB banis (ID: name)
`;

export interface ResearchOptions {
  client?: Anthropic;
  model?: string;
  banis: BaniSummary[];
  maxSearches?: number;
  onStage?: (stage: "researching" | "writing") => void;
}

export function slugify(topic: string): string {
  const ascii = topic
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  if (ascii) return ascii;
  // Non-Latin topics (e.g. Gurmukhi): a stable short hash.
  let h = 0;
  for (const ch of topic) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return `t-${h.toString(36)}`;
}

function siteOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** The JSON object in the model's final text, tolerating stray text around it. */
function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON object in the model's reply");
  return JSON.parse(text.slice(start, end + 1));
}

export async function researchEntry(topic: string, options: ResearchOptions): Promise<LibraryEntry> {
  const client = options.client ?? new Anthropic();
  const model = options.model ?? "claude-sonnet-5-5";
  const stage = options.onStage ?? (() => {});
  const baniList = options.banis.map((b) => `${b.baniId}: ${b.name} (${b.gurmukhi})`).join("\n");

  type Params = Parameters<typeof client.beta.messages.create>[0];
  const messages: Params["messages"] = [{ role: "user", content: `Write the Library entry for: ${topic}` }];
  const found = new Map<string, LibrarySource>();
  const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, searches: 0 };
  let finalText = "";

  stage("researching");
  // Server-side tools can pause a long turn; continue it a few times if so.
  for (let turn = 0; turn < 4; turn++) {
    const response = await client.beta.messages.create({
      model,
      max_tokens: 8000,
      system: [{ type: "text", text: LIBRARY_SYSTEM + baniList, cache_control: { type: "ephemeral" } }],
      messages,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: options.maxSearches ?? 4 }],
      output_config: { effort: "medium" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    } as Params & { stream?: false });

    usage.input += response.usage.input_tokens;
    usage.output += response.usage.output_tokens;
    usage.cacheRead += response.usage.cache_read_input_tokens ?? 0;
    usage.cacheWrite += response.usage.cache_creation_input_tokens ?? 0;
    usage.searches += response.usage.server_tool_use?.web_search_requests ?? 0;

    let sawResults = false;
    for (const block of response.content) {
      if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
        sawResults = true;
        for (const r of block.content) {
          if (r.type === "web_search_result" && r.url && !found.has(r.url)) {
            found.set(r.url, { title: r.title || siteOf(r.url), url: r.url, site: siteOf(r.url) });
          }
        }
      } else if (block.type === "text") {
        finalText += block.text;
      }
    }
    if (sawResults) stage("writing");

    if (response.stop_reason === "refusal") throw new Error("The model declined to write this entry");
    if (response.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: response.content as never });
    finalText = "";
  }

  const parsed = EntrySchema.parse(extractJson(finalText));
  if (parsed.notSikhTopic) throw new NotASikhTopicError(topic);

  // Keep only sources the model actually saw; if it listed none we recognise, show everything it retrieved.
  const used = parsed.usedSources.map((u) => found.get(u)).filter((s): s is LibrarySource => Boolean(s));
  const sources = (used.length ? used : [...found.values()]).slice(0, 10);
  const baniId = parsed.baniId != null && options.banis.some((b) => b.baniId === parsed.baniId) ? parsed.baniId : null;

  const llmUsage: Omit<LlmUsage, "costUsd" | "step"> = {
    model,
    inputTokens: usage.input,
    outputTokens: usage.output,
    cacheReadTokens: usage.cacheRead,
    cacheWriteTokens: usage.cacheWrite,
  };
  const WEB_SEARCH_USD = 0.01;

  return {
    slug: slugify(parsed.title || topic),
    topic,
    title: parsed.title || topic,
    titleGurmukhi: parsed.titleGurmukhi,
    kind: parsed.kind,
    summary: parsed.summary,
    facts: parsed.facts,
    sections: parsed.sections,
    related: parsed.related,
    sources,
    baniId,
    generatedAt: new Date().toISOString(),
    model,
    reviewed: false,
    usage: {
      costUsd: Number((estimateCostUsd(llmUsage) + usage.searches * WEB_SEARCH_USD).toFixed(4)),
      searches: usage.searches,
    },
  };
}
