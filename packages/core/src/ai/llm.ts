import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { estimateCostUsd } from "./pricing";

/**
 * Two tiers of model work:
 * - "fast": question expansion and relevance judging (cheap, many per question)
 * - "answer": writing the final answer (one per question)
 */
export type ModelTier = "fast" | "answer";

export interface LlmUsage {
  step: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd: number;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface JsonRequest<S extends z.ZodType> {
  step: string;
  tier: ModelTier;
  /** Stable instructions. Cached, so keep it free of per-request values. */
  system: string;
  /**
   * Reference material that stays the same for a whole conversation (e.g. the
   * shabad being discussed). Sent as a second, separately cached system block.
   */
  context?: string;
  messages: ChatTurn[];
  schema: S;
  maxTokens?: number;
}

export interface JsonLlm {
  completeJson<S extends z.ZodType>(req: JsonRequest<S>): Promise<{ data: z.infer<S>; usage: LlmUsage }>;
}

export class LlmRefusalError extends Error {
  constructor(readonly category: string | null) {
    super(`Model declined the request${category ? ` (${category})` : ""}`);
    this.name = "LlmRefusalError";
  }
}

export class LlmOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmOutputError";
  }
}

export interface AnthropicJsonLlmOptions {
  client?: Anthropic;
  models?: Partial<Record<ModelTier, string>>;
}

export const DEFAULT_MODELS: Record<ModelTier, string> = {
  fast: "claude-haiku-5-5",
  answer: "claude-sonnet-5-5",
};

const EFFORT: Record<ModelTier, "low" | "medium"> = { fast: "low", answer: "medium" };

/** Models that accept the server-side `fallbacks: "default"` refusal fallback. */
function supportsDefaultFallback(model: string): boolean {
  return /^claude-(opus-5|sonnet-5-5|fable-5)/.test(model);
}

export class AnthropicJsonLlm implements JsonLlm {
  private readonly client: Anthropic;
  readonly models: Record<ModelTier, string>;

  constructor(options: AnthropicJsonLlmOptions = {}) {
    this.client = options.client ?? new Anthropic();
    this.models = { ...DEFAULT_MODELS, ...options.models };
  }

  async completeJson<S extends z.ZodType>(req: JsonRequest<S>): Promise<{ data: z.infer<S>; usage: LlmUsage }> {
    const model = this.models[req.tier];
    const fallback = supportsDefaultFallback(model);

    const response = await this.client.beta.messages.parse({
      model,
      max_tokens: req.maxTokens ?? 16000,
      system: [
        { type: "text", text: req.system, cache_control: { type: "ephemeral" } },
        ...(req.context ? [{ type: "text" as const, text: req.context, cache_control: { type: "ephemeral" as const } }] : []),
      ],
      messages: req.messages,
      output_config: { effort: EFFORT[req.tier], format: betaZodOutputFormat(req.schema) },
      ...(fallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    });

    if (response.stop_reason === "refusal") {
      throw new LlmRefusalError(response.stop_details?.category ?? null);
    }
    if (response.stop_reason === "max_tokens") {
      throw new LlmOutputError(`${req.step}: output hit max_tokens`);
    }
    if (response.parsed_output == null) {
      throw new LlmOutputError(`${req.step}: model output did not match the schema`);
    }

    const u = response.usage;
    const usage: LlmUsage = {
      step: req.step,
      model: response.model,
      inputTokens: u.input_tokens,
      outputTokens: u.output_tokens,
      cacheReadTokens: u.cache_read_input_tokens ?? 0,
      cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
      costUsd: 0,
    };
    usage.costUsd = estimateCostUsd(usage);
    return { data: response.parsed_output as z.infer<S>, usage };
  }
}
