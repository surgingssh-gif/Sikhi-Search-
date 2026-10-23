import { z } from "zod";
import type { ChatTurn, JsonLlm, LlmUsage } from "../ai/llm";

export const QUESTION_CATEGORIES = ["gurbani_concept", "practice", "history", "personal", "other"] as const;

export const ExpansionSchema = z.object({
  category: z
    .enum(QUESTION_CATEGORIES)
    .describe(
      "gurbani_concept: teachings/philosophy; practice: Sikh practices, rehat, articles of faith; history: events, people, dates; personal: the asker's own life situation; other: off-topic",
    ),
  concepts: z.array(z.string()).describe("Relevant Sikh concepts in transliterated Punjabi with a short English gloss, e.g. 'haumai (ego)'"),
  searchTerms: z
    .array(z.string())
    .describe(
      "3-8 single English words likely to appear in English translations of relevant Gurbani lines (older, literal wording: 'anxiety', 'worry', 'fear', 'ego', 'pride', 'envy', 'slander')",
    ),
});

export type Expansion = z.infer<typeof ExpansionSchema>;

const SYSTEM = `You help a Sikh learning tool find relevant Gurbani for a user's question.

Classify the question and turn it into search terms for an English full-word search over Gurbani translations (Sri Guru Granth Sahib Ji, mostly in the BaniDB and Sant Singh Khalsa translations).

Search terms:
- Single English words only. No phrases, no Punjabi.
- Prefer words those translations actually use. Modern words like "anxiety" or "jealousy" may appear rarely; add older equivalents ("worry", "anxious", "envy", "jealous", "fear", "ego", "pride", "attachment", "greed", "anger", "humility", "contentment", "Will", "Command", "Naam").
- Avoid words so common they match thousands of lines ("Lord", "God", "mind", "Guru", "Name") unless the question is about them.

If earlier conversation turns are given, use them only to understand what the latest question refers to.`;

export async function expandQuestion(
  llm: JsonLlm,
  question: string,
  history: ChatTurn[] = [],
): Promise<{ expansion: Expansion; usage: LlmUsage }> {
  const context = history.length
    ? `Earlier conversation:\n${history.map((t) => `${t.role}: ${t.content.slice(0, 600)}`).join("\n")}\n\n`
    : "";
  const { data, usage } = await llm.completeJson({
    step: "expand",
    tier: "fast",
    system: SYSTEM,
    messages: [{ role: "user", content: `${context}Question: ${question}` }],
    schema: ExpansionSchema,
    maxTokens: 2000,
  });
  const searchTerms = [...new Set(data.searchTerms.map((t) => t.trim().toLowerCase()).filter((t) => /^[a-z'-]{3,}$/.test(t)))].slice(0, 8);
  return { expansion: { ...data, searchTerms }, usage };
}
