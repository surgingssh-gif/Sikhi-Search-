import { describe, expect, it } from "vitest";
import { ask, explore, GENERAL_KNOWLEDGE_LABEL, HISTORY_LABEL, retrieveCandidates } from "../src";
import { contextFor } from "../src/pipeline/retrieve";
import { expansion, fakeBanidb, fakeLlm, judgeAll, searchResult, shabad1 } from "./fakes";

const [hitA, hitB] = searchResult.hits.map((h) => h.verse) as [(typeof searchResult.hits)[0]["verse"], (typeof searchResult.hits)[0]["verse"]];

const answer = (text: string, basis = "gurbani") => ({ answer: text, basis, followUps: ["What is haumai?", "How does Naam help?"] });

describe("ask", () => {
  it("returns cited passages rendered from BaniDB data, not model text", async () => {
    const { llm } = fakeLlm({
      expand: () => expansion(),
      judge: judgeAll(),
      answer: [answer(`### What Gurbani teaches\nEnvy burns the one who holds it.\n[[verse:${hitA.verseId}]]`)],
    });
    const result = await ask({ llm, banidb: fakeBanidb() }, "What does Sikhi teach about jealousy?");

    expect(result.passages).toHaveLength(1);
    expect(result.passages[0]).toMatchObject({
      verseId: hitA.verseId,
      gurmukhi: hitA.gurmukhi,
      ang: hitA.ang,
      translation: hitA.translations[0],
    });
    expect(result.citationCheck).toEqual({ passedFirstTime: true, retried: false, sanitized: false });
    expect(result.sourceLabel).toBeNull();
    expect(result.segments.some((s) => s.type === "citation")).toBe(true);
    expect(result.usage.steps.map((s) => s.step)).toEqual(["expand", "judge", "answer"]);
  });

  it("never sends Gurmukhi to the models", async () => {
    const { llm, calls } = fakeLlm({
      expand: () => expansion(),
      judge: judgeAll(),
      answer: [answer(`[[verse:${hitA.verseId}]]`)],
    });
    await ask({ llm, banidb: fakeBanidb() }, "jealousy?");
    for (const c of calls) {
      for (const m of c.messages) expect(m.content).not.toMatch(/[਀-੿]/);
    }
  });

  it("asks the model to fix broken citations once", async () => {
    const { llm, calls } = fakeLlm({
      expand: () => expansion(),
      judge: judgeAll(),
      answer: [answer("See [[verse:424242]]."), answer(`See [[verse:${hitB.verseId}]].`)],
    });
    const result = await ask({ llm, banidb: fakeBanidb() }, "jealousy?");

    expect(result.citationCheck).toEqual({ passedFirstTime: false, retried: true, sanitized: false });
    expect(result.passages.map((p) => p.verseId)).toEqual([hitB.verseId]);
    const retry = calls.filter((c) => c.step === "answer")[1]!;
    expect(retry.messages.at(-1)!.content).toContain("424242");
  });

  it("strips what is still broken after the retry", async () => {
    const { llm } = fakeLlm({
      expand: () => expansion(),
      judge: judgeAll(),
      answer: [answer("Bad [[verse:1]] ਕਖਗ"), answer(`Still bad [[verse:1]] ਕਖਗ and good [[verse:${hitA.verseId}]]`)],
    });
    const result = await ask({ llm, banidb: fakeBanidb() }, "jealousy?");

    expect(result.citationCheck.sanitized).toBe(true);
    expect(result.answer).not.toContain("[[verse:1]]");
    expect(result.answer).not.toMatch(/[਀-੿]/);
    expect(result.answer).toContain(`[[verse:${hitA.verseId}]]`);
  });

  it("does not offer passages the judge rejected", async () => {
    const { llm, calls } = fakeLlm({
      expand: () => expansion(),
      judge: judgeAll([hitA.verseId]),
      answer: [answer(`[[verse:${hitB.verseId}]]`)],
    });
    await ask({ llm, banidb: fakeBanidb() }, "jealousy?");
    const prompt = calls.find((c) => c.step === "answer")!.messages.at(-1)!.content;
    expect(prompt).not.toContain(`id="${hitA.verseId}"`);
    expect(prompt).toContain(`id="${hitB.verseId}"`);
  });

  it("labels history answers and general-knowledge answers", async () => {
    const history = fakeLlm({ expand: () => expansion("history"), judge: judgeAll(), answer: [answer("In 1699...", "gurbani")] });
    expect((await ask({ llm: history.llm, banidb: fakeBanidb() }, "What happened at Vaisakhi 1699?")).sourceLabel).toBe(HISTORY_LABEL);

    const general = fakeLlm({ expand: () => expansion("practice"), judge: judgeAll(), answer: [answer("A dastaar is...", "general_knowledge")] });
    expect((await ask({ llm: general.llm, banidb: fakeBanidb() }, "Why do Sikhs wear a dastaar?")).sourceLabel).toBe(GENERAL_KNOWLEDGE_LABEL);
  });

  it("passes earlier turns to the answer model", async () => {
    const { llm, calls } = fakeLlm({ expand: () => expansion(), judge: judgeAll(), answer: [answer("More on that.")] });
    await ask({ llm, banidb: fakeBanidb() }, "Tell me more", [
      { role: "user", content: "What is envy?" },
      { role: "assistant", content: "Envy is..." },
    ]);
    const msgs = calls.find((c) => c.step === "answer")!.messages;
    expect(msgs.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
  });
});

describe("explore", () => {
  it("returns judged passages without calling the answer model", async () => {
    const { llm, calls } = fakeLlm({ expand: () => expansion(), judge: judgeAll([hitA.verseId]) });
    const result = await explore({ llm, banidb: fakeBanidb() }, "jealousy");
    expect(calls.map((c) => c.step)).toEqual(["expand", "judge"]);
    expect(result.passages.map((p) => p.verseId)).not.toContain(hitA.verseId);
    expect(result.passages.length).toBeGreaterThan(0);
    expect(result.passages[0]!.relevanceNote).toBe("Addresses envy directly.");
  });
});

describe("retrieveCandidates", () => {
  it("keeps one verse per shabad", async () => {
    const candidates = await retrieveCandidates(fakeBanidb(), ["jealousy", "envy"]);
    const shabadIds = candidates.map((c) => c.shabadId);
    expect(new Set(shabadIds).size).toBe(shabadIds.length);
    expect(candidates.every((c) => c.matchedTerms.length === 2)).toBe(true);
  });

  it("adds neighbouring lines as context, not the verse itself", () => {
    const target = shabad1.verses[4]!;
    const ctx = contextFor(shabad1, target.verseId, 1);
    expect(ctx.map((v) => v.verseId)).toEqual([shabad1.verses[3]!.verseId, shabad1.verses[5]!.verseId]);
  });
});
