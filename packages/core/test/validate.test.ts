import { describe, expect, it } from "vitest";
import { findUncitedReferences, normalizeShabad, parseSegments, validateAnswer } from "../src";
import type { RawShabadResponse } from "../src/banidb/raw-types";
import shabadFixture from "./fixtures/shabad-1.json";

const verses = normalizeShabad(shabadFixture as unknown as RawShabadResponse).verses;
const [v1, v2] = verses as [(typeof verses)[0], (typeof verses)[0]];

describe("parseSegments", () => {
  it("splits prose and citation markers in order", () => {
    expect(parseSegments(`Intro [[verse:${v1.verseId}]] outro`)).toEqual([
      { type: "text", text: "Intro " },
      { type: "citation", verseId: v1.verseId },
      { type: "text", text: " outro" },
    ]);
  });
});

describe("validateAnswer", () => {
  it("accepts an answer that only cites retrieved verses", () => {
    const report = validateAnswer(
      `Hukam is described here [[verse:${v1.verseId}]] and here [[verse:${v2.verseId}]] [[verse:${v1.verseId}]].`,
      verses,
    );
    expect(report).toEqual({ ok: true, cited: [v1.verseId, v2.verseId], unknownCitations: [], strayGurmukhi: [], angMismatches: [] });
  });

  it("flags citations of verses that were not retrieved", () => {
    const report = validateAnswer("See [[verse:999999]].", verses);
    expect(report.ok).toBe(false);
    expect(report.unknownCitations).toEqual([999999]);
  });

  it("flags any Gurmukhi the model wrote itself, even a copy of a real line", () => {
    const report = validateAnswer(`As Gurbani says: ${v2.gurmukhi} [[verse:${v2.verseId}]]`, verses);
    expect(report.ok).toBe(false);
    expect(report.strayGurmukhi).toEqual([v2.gurmukhi.trim()]);
  });

  it("flags Ang numbers that don't belong to a cited verse", () => {
    const ok = validateAnswer(`On Ang ${v1.ang} [[verse:${v1.verseId}]]`, verses);
    expect(ok.angMismatches).toEqual([]);

    const bad = validateAnswer(`On Ang ${v1.ang + 100} [[verse:${v1.verseId}]]`, verses);
    expect(bad.ok).toBe(false);
    expect(bad.angMismatches).toEqual([v1.ang + 100]);
  });

  it("allows transliterated Sikh terms in Latin script", () => {
    expect(validateAnswer("Haumai and hukam are central ideas here.", verses).ok).toBe(true);
  });
});

describe("findUncitedReferences", () => {
  it("flags sentences that lean on Gurbani that wasn't cited", () => {
    const text = `Ego blinds us. [[verse:${v1.verseId}]]\n\nMany Sikhs also recall a teaching found elsewhere in Gurbani: ego carries its own cure. Practise humility.`;
    expect(findUncitedReferences(text)).toEqual(["Many Sikhs also recall a teaching found elsewhere in Gurbani: ego carries its own cure."]);
  });

  it("doesn't flag a sentence that introduces the card right after it", () => {
    const text = `Intro. [[verse:${v1.verseId}]]\n\nIn another shabad, worry is forgotten.\n\n[[verse:${v2.verseId}]]\n\nClosing thought.`;
    expect(findUncitedReferences(text)).toEqual([]);
  });

  it("leaves ordinary explanation alone", () => {
    expect(findUncitedReferences(`My reading is that envy hurts the one who holds it. [[verse:${v1.verseId}]]`)).toEqual([]);
  });
});
