import type { LlmUsage } from "./llm";

/**
 * USD per million tokens, Anthropic first-party API rates as of Oct 2026.
 * Estimates only: check https://www.anthropic.com/pricing before relying on them.
 */
const PRICES: Record<string, { input: number; output: number }> = {
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
};

const CACHE_READ_MULTIPLIER = 0.1;
const CACHE_WRITE_MULTIPLIER = 1.25;

export function estimateCostUsd(u: Omit<LlmUsage, "costUsd" | "step">): number {
  const key = Object.keys(PRICES).find((k) => u.model.startsWith(k));
  if (!key) return 0;
  const p = PRICES[key]!;
  const input =
    u.inputTokens * p.input +
    u.cacheReadTokens * p.input * CACHE_READ_MULTIPLIER +
    u.cacheWriteTokens * p.input * CACHE_WRITE_MULTIPLIER;
  return (input + u.outputTokens * p.output) / 1_000_000;
}
