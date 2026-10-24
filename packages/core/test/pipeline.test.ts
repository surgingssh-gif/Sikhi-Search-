import { describe, expect, it, vi } from "vitest";
import { ask, explore, GENERAL_KNOWLEDGE_LABEL, HISTORY_LABEL, retrieveCandidates } from "../src";
import { contextFor, endsMidSentence, sentenceSpan, startsMidSentence } from "../src/pipeline/retrieve";
import { expansion, fakeBanidb, fakeLlm, judgeAll, searchResult, shabad1, shabad568 } from "./fakes";

const [hitA, hitB] = searchResult.hits.map((h) => h.verse) as [(typeof searchResult.hits)[0]["verse"], (typeof searchResult.hits)[0]["verse"]];

const answer = (summary: string, basis = "gurbani", sections: { title: string; body: string }[] = []) => ({
  summary,
  sections,
  basis,
  followUps: ["What is haumai?", "How does Naam help?"],
});

describe("ask", () => {
  it("returns cited passages rendered from BaniDB data, not model text", async () => {
    const { llm } = fakeLlm({
      expand: () => expansion(),
      judge: judgeAll(),
      answer: [answer(`Envy burns the one who holds it. [[verse:${hitA.verseId}]]`)],
    });
    const result = await ask({ llm, banidb: fakeBanidb() }, "What does Sikhi teach about jealousy?");

    expect(result.passages).toHaveLength(1);
    expect(result.passages[0]).toMatchObject({
      verseId: hitA.verseId,
      ang: hitA.ang,
      lines: [{ verseId: hitA.verseId, gurmukhi: hitA.gurmukhi, translation: hitA.translations[0] }],
    });
    expect(result.citationCheck).toEqual({ passedFirstTime: true, retried: false, sanitized: false, uncitedReferences: [] });
    expect(result.sourceLabel).toBeNull();
    expect(result.summary.some((s) => s.type === "citation")).toBe(true);
    expect(result.usage.steps.map((s) => s.step)).toEqual(["expand", "judge", "answer"]);
  });

  it("returns the main paragraph and deeper sections separately", async () => {
    const { llm } = fakeLlm({
      expand: () => expansion(),
      judge: judgeAll(),
      answer: [
        answer(`Envy hurts the one who holds it. [[verse:${hitA.verseId}]]`, "gurbani", [
          { title: "What Gurbani teaches", body: `Meeting the Guru, jealousy is forgotten. [[verse:${hitB.verseId}]]` },
          { title: "Applying it", body: "Notice comparison when it starts." },
          { title: "  ", body: "dropped: no title" },
        ]),
      ],
    });
    const result = await ask({ llm, banidb: fakeBanidb() }, "jealousy?");

    expect(result.summary[0]).toEqual({ type: "text", text: "Envy hurts the one who holds it. " });
    expect(result.sections.map((s) => s.title)).toEqual(["What Gurbani teaches", "Applying it"]);
    // Cards cover citations from anywhere in the answer, in order of first citation.
    expect(result.passages.map((p) => p.verseId)).toEqual([hitA.verseId, hitB.verseId]);
    expect(result.answer.startsWith("Envy hurts")).toBe(true);
    expect(result.answer).toContain("Applying it");
  });

  it("validates citations inside sections too", async () => {
    const { llm } = fakeLlm({
      expand: () => expansion(),
      judge: judgeAll(),
      answer: [
        answer("Fine summary.", "gurbani", [{ title: "More", body: "Bad [[verse:424242]]" }]),
        answer("Fine summary.", "gurbani", [{ title: "More", body: `Good [[verse:${hitA.verseId}]]` }]),
      ],
    });
    const result = await ask({ llm, banidb: fakeBanidb() }, "jealousy?");
    expect(result.citationCheck).toMatchObject({ passedFirstTime: false, retried: true, sanitized: false });
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

    expect(result.citationCheck).toMatchObject({ passedFirstTime: false, retried: true, sanitized: false });
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
    const candidates = await retrieveCandidates(fakeBanidb(), ["jealousy"]);
    const shabadIds = candidates.map((c) => c.shabadId);
    expect(candidates.length).toBe(searchResult.hits.length);
    expect(new Set(shabadIds).size).toBe(shabadIds.length);
  });

  it("drops BaniDB's substring matches ('jealous' inside 'jealousy')", async () => {
    // Every fixture line contains "jealousy"; none contains the whole word "jealous".
    expect(await retrieveCandidates(fakeBanidb(), ["jealous"])).toEqual([]);
  });

  it("ranks lines that match more of the search terms first", async () => {
    // Only one fixture line mentions both jealousy and hate.
    const [top, ...rest] = await retrieveCandidates(fakeBanidb(), ["jealousy", "hate"]);
    expect(top!.matchedTerms).toEqual(["jealousy", "hate"]);
    expect(rest.every((c) => c.matchedTerms.length === 1)).toBe(true);
  });

  it("returns nothing, without calling BaniDB, when there are no search terms", async () => {
    const banidb = { ...fakeBanidb(), searchTranslations: vi.fn() };
    expect(await retrieveCandidates(banidb, [])).toEqual([]);
    expect(banidb.searchTranslations).not.toHaveBeenCalled();
  });

  it("adds neighbouring lines as context, not the verse itself", () => {
    const target = shabad1.verses[4]!;
    const ctx = contextFor(shabad1, target.verseId, 1);
    expect(ctx.map((v) => v.verseId)).toEqual([shabad1.verses[3]!.verseId, shabad1.verses[5]!.verseId]);
  });
});

describe("sentenceSpan", () => {
  // Shabad 568 (Ang 189) splits sentences across lines, e.g. a line whose
  // translation begins "forget to feel jealous of others."
  const ids = shabad568.verses.map((v) => v.verseId);
  const idx = (n: number) => ids.indexOf(n);

  it("pulls in the start of a sentence that began on the previous line", () => {
    const fragment = shabad568.verses.find((v) => startsMidSentence(v.translations[0]!.text))!;
    const i = idx(fragment.verseId);
    expect(sentenceSpan(shabad568, fragment.verseId)).toEqual([i - 1, i]);
  });

  it("pulls in the end of a sentence that continues on the next line", () => {
    const opener = shabad568.verses.find((v, i) => i > 0 && endsMidSentence(v.translations[0]!.text))!;
    const i = idx(opener.verseId);
    expect(sentenceSpan(shabad568, opener.verseId)).toEqual([i, i + 1]);
  });

  it("leaves complete lines alone and never crosses a numbered verse marker", () => {
    for (const v of shabad568.verses) {
      const [start, end] = sentenceSpan(shabad568, v.verseId)!;
      for (let j = start; j < end; j++) expect(shabad568.verses[j]!.gurmukhi).not.toMatch(/॥[੦-੯]+॥/);
    }
    const complete = shabad568.verses.find((v) => !startsMidSentence(v.translations[0]!.text) && !endsMidSentence(v.translations[0]!.text))!;
    expect(sentenceSpan(shabad568, complete.verseId)).toEqual([idx(complete.verseId), idx(complete.verseId)]);
  });

  it("recognises mid-sentence translations", () => {
    expect(startsMidSentence("forget to feel jealous of others. ||1||")).toBe(true);
    expect(startsMidSentence("- they do not waver, here or hereafter. ||2||")).toBe(true);
    expect(startsMidSentence("They see none other than the Lord.")).toBe(false);
    expect(endsMidSentence("Those whose minds are imbued with the One Lord,")).toBe(true);
    expect(endsMidSentence("chant the Name of the Lord, Har, Har")).toBe(true);
    expect(endsMidSentence("The Creator is the Doer, the Cause of causes. ||1||Pause||")).toBe(false);
    expect(endsMidSentence("Gauree, Fifth Mehla:")).toBe(false);
  });
});
