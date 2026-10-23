import type { z } from "zod";
import { normalizeSearch, normalizeShabad, type JsonLlm, type JsonRequest, type LlmUsage } from "../src";
import type { RawSearchResponse, RawShabadResponse } from "../src/banidb/raw-types";
import searchFixture from "./fixtures/search-jealousy.json";
import shabadFixture from "./fixtures/shabad-1.json";
import shabad568Fixture from "./fixtures/shabad-568.json";

export const searchResult = normalizeSearch("jealousy", searchFixture as unknown as RawSearchResponse);
export const shabad1 = normalizeShabad(shabadFixture as unknown as RawShabadResponse);
export const shabad568 = normalizeShabad(shabad568Fixture as unknown as RawShabadResponse);

/** BaniDB stand-in: every search returns the recorded "jealousy" results; shabads come from the shabad-1 fixture. */
export function fakeBanidb() {
  return {
    searchTranslations: async (query: string) => ({ ...searchResult, query }),
    getShabad: async (id: number) => (id === 1 ? shabad1 : Promise.reject(new Error("not in fixtures"))),
  };
}

type Responder = (req: JsonRequest<z.ZodType>) => unknown;

/** Scripted model: each step name maps to a function (or a queue of values) producing that step's JSON. */
export function fakeLlm(script: Record<string, Responder | unknown[]>) {
  const calls: JsonRequest<z.ZodType>[] = [];
  const llm: JsonLlm = {
    async completeJson<S extends z.ZodType>(req: JsonRequest<S>) {
      calls.push(req);
      const entry = script[req.step];
      if (entry === undefined) throw new Error(`No scripted response for step "${req.step}"`);
      const raw = Array.isArray(entry) ? entry.shift() : (entry as Responder)(req);
      if (raw === undefined) throw new Error(`Script for "${req.step}" ran out`);
      const usage: LlmUsage = { step: req.step, model: "fake", inputTokens: 100, outputTokens: 10, cacheReadTokens: 0, cacheWriteTokens: 0, costUsd: 0.001 };
      return { data: req.schema.parse(raw) as z.infer<S>, usage };
    },
  };
  return { llm, calls };
}

export const expansion = (category = "gurbani_concept") => ({
  category,
  concepts: ["eirkha (envy)"],
  searchTerms: ["jealousy", "envy"],
});

/** Mark every candidate in the judge prompt relevant (3) except the ids listed as irrelevant. */
export const judgeAll =
  (irrelevant: number[] = []) =>
  (req: JsonRequest<z.ZodType>) => {
    const text = req.messages.at(-1)!.content;
    const ids = [...text.matchAll(/<passage id="(\d+)">/g)].map((m) => Number(m[1]));
    return {
      judgements: ids.map((id) => ({
        id,
        relevance: irrelevant.includes(id) ? 0 : 3,
        reason: irrelevant.includes(id) ? "Only shares a word." : "Addresses envy directly.",
      })),
    };
  };
