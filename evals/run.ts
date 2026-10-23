/**
 * Runs the evaluation questions through the real pipeline and writes a report
 * for human review. Costs real money: check the estimate it prints.
 *
 *   npm run eval                          # all questions, default models
 *   npm run eval -- --limit 3             # first 3 questions
 *   npm run eval -- --only hukam,anxiety  # specific question ids
 *   npm run eval -- --answer-model claude-sonnet-5-5
 *   npm run eval -- --mode explore        # Gurbani-first mode (no answer model)
 *   npm run eval -- --concurrency 3       # run questions in parallel
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { AnthropicJsonLlm, ask, BaniDbClient, explore, type AskResult, type ExploreResult, type Passage } from "@ask-sikhi/core";

interface EvalQuestion {
  id: string;
  category: string;
  question: string;
  expectedShabadIds: number[];
  notes: string;
}

const here = path.dirname(fileURLToPath(import.meta.url));
const { values } = parseArgs({
  options: {
    limit: { type: "string" },
    only: { type: "string" },
    "answer-model": { type: "string" },
    "fast-model": { type: "string" },
    mode: { type: "string", default: "ask" },
    concurrency: { type: "string" },
  },
});

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set. Add it to .env (see .env.example).");
  process.exit(1);
}

let questions = (JSON.parse(readFileSync(path.join(here, "questions.json"), "utf8")) as { questions: EvalQuestion[] }).questions;
if (values.only) {
  const ids = new Set(values.only.split(","));
  questions = questions.filter((q) => ids.has(q.id));
}
if (values.limit) questions = questions.slice(0, Number(values.limit));

const models: { answer?: string; fast?: string } = {};
if (values["answer-model"]) models.answer = values["answer-model"];
if (values["fast-model"]) models.fast = values["fast-model"];
const llm = new AnthropicJsonLlm({ models });
const deps = { llm, banidb: new BaniDbClient() };
const mode = values.mode === "explore" ? "explore" : "ask";

type Outcome = { q: EvalQuestion; result?: AskResult | ExploreResult; error?: string; ms: number };
const outcomes: Outcome[] = [];

console.log(`Running ${questions.length} question(s), mode=${mode}, answer=${llm.models.answer}, fast=${llm.models.fast}`);
const concurrency = Math.max(1, Number(values.concurrency ?? 1));
let nextIndex = 0;
const slots: Outcome[] = new Array(questions.length);
await Promise.all(
  Array.from({ length: Math.min(concurrency, questions.length) }, async () => {
    while (nextIndex < questions.length) {
      const i = nextIndex++;
      const q = questions[i]!;
      const start = Date.now();
      try {
        const result = mode === "ask" ? await ask(deps, q.question) : await explore(deps, q.question);
        slots[i] = { q, result, ms: Date.now() - start };
        console.log(`  ✓ ${q.id}  ${result.passages.length} passage(s)  $${result.usage.totalCostUsd.toFixed(4)}  ${((Date.now() - start) / 1000).toFixed(1)}s`);
      } catch (err) {
        slots[i] = { q, error: (err as Error).message, ms: Date.now() - start };
        console.log(`  ✗ ${q.id}  ${(err as Error).message}`);
      }
    }
  }),
);
outcomes.push(...slots);

const ok = outcomes.filter((o) => o.result);
const totalCost = ok.reduce((s, o) => s + o.result!.usage.totalCostUsd, 0);
const withGurbani = ok.filter((o) => o.result!.passages.length > 0).length;
const askResults = ok.map((o) => o.result).filter((r): r is AskResult => r !== undefined && "answer" in r);
const retried = askResults.filter((r) => r.citationCheck.retried).length;
const sanitized = askResults.filter((r) => r.citationCheck.sanitized).length;
const expectedHits = ok.filter((o) => o.q.expectedShabadIds.length > 0);
const hitCount = expectedHits.filter((o) => o.result!.passages.some((p) => o.q.expectedShabadIds.includes(p.shabadId))).length;

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outDir = path.join(here, "results");
mkdirSync(outDir, { recursive: true });
const base = path.join(outDir, `${stamp}-${mode}-${llm.models.answer}`);
writeFileSync(`${base}.json`, JSON.stringify({ mode, models: llm.models, outcomes }, null, 2));
writeFileSync(`${base}.md`, report());

console.log(`\n${ok.length}/${outcomes.length} answered, ${withGurbani} with Gurbani, ${retried} citation retries, ${sanitized} sanitized`);
if (expectedHits.length) console.log(`Expected shabad found: ${hitCount}/${expectedHits.length}`);
console.log(`Total cost ≈ $${totalCost.toFixed(4)} (avg $${(totalCost / Math.max(ok.length, 1)).toFixed(4)}/question)`);
console.log(`Report: ${path.relative(process.cwd(), base)}.md`);

function report(): string {
  const lines = [
    `# Ask Sikhi eval: ${mode}`,
    ``,
    `- Date: ${new Date().toISOString()}`,
    `- Models: answer \`${llm.models.answer}\`, fast \`${llm.models.fast}\``,
    `- Answered: ${ok.length}/${outcomes.length}; with Gurbani: ${withGurbani}; citation retries: ${retried}; sanitized: ${sanitized}`,
    expectedHits.length ? `- Expected shabad found: ${hitCount}/${expectedHits.length}` : "",
    `- Estimated cost: $${totalCost.toFixed(4)} total, $${(totalCost / Math.max(ok.length, 1)).toFixed(4)} per question`,
    ``,
    `Reviewer checklist per question: accurate? respectful? Gurbani genuinely relevant in context? scripture vs. interpretation clear? differing views fair? label correct?`,
    ``,
  ];
  for (const o of outcomes) {
    lines.push(`---`, ``, `## ${o.q.id}: ${o.q.question}`, ``);
    if (o.q.notes) lines.push(`> Reviewer note: ${o.q.notes}`, ``);
    if (o.error || !o.result) {
      lines.push(`**Error:** ${o.error}`, ``);
      continue;
    }
    const r = o.result;
    lines.push(`Category: \`${r.category}\` · ${(o.ms / 1000).toFixed(1)}s · $${r.usage.totalCostUsd.toFixed(4)}`);
    if ("answer" in r) {
      const { uncitedReferences, ...check } = r.citationCheck;
      lines.push(`Basis: \`${r.basis}\`${r.sourceLabel ? ` · Label: _${r.sourceLabel}_` : ""} · ${wordCount(r)} words · Citation check: ${JSON.stringify(check)}`, ``);
      if (uncitedReferences.length) lines.push(`> ⚠️ Possible uncited Gurbani: ${uncitedReferences.map((s) => `"${s}"`).join(" ")}`, ``);
      const byId = new Map(r.passages.map((p) => [p.verseId, p]));
      for (const seg of r.segments) {
        if (seg.type === "text") lines.push(seg.text);
        else lines.push(card(byId.get(seg.verseId)));
      }
      if (r.followUps.length) lines.push(``, `Follow-ups: ${r.followUps.map((f) => `"${f}"`).join(", ")}`);
    } else {
      for (const p of r.passages) lines.push(card(p));
    }
    lines.push(``);
  }
  return lines.filter((l) => l !== undefined).join("\n");
}

function card(p: Passage | undefined): string {
  if (!p) return "\n> (missing passage)\n";
  const angs = [...new Set(p.lines.map((l) => l.ang))].join("–");
  return [
    ``,
    `> **${p.lines.map((l) => l.gurmukhi).join(" ")}**  `,
    p.lines.some((l) => l.transliteration) ? `> _${p.lines.map((l) => l.transliteration ?? "").join(" ")}_  ` : "",
    `> ${p.lines.map((l) => l.translation?.text ?? "(no translation)").join(" ")}  `,
    `> — ${p.source.english}, Ang ${angs}${p.writer ? `, ${p.writer.english}` : ""} · shabad ${p.shabadId} · ${p.lines.length} line(s) · translation: ${p.lines[0]?.translation?.attribution ?? "n/a"}  `,
    `> _Why selected: ${p.relevanceNote}_`,
    ``,
  ]
    .filter(Boolean)
    .join("\n");
}

export function wordCount(r: AskResult): number {
  return r.segments.filter((s) => s.type === "text").map((s) => (s.type === "text" ? s.text : "")).join(" ").split(/\s+/).filter(Boolean).length;
}
