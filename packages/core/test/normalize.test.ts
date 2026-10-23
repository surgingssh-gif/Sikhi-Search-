import { describe, expect, it } from "vitest";
import { normalizeSearch, normalizeShabad, primaryEnglish } from "../src";
import type { RawSearchResponse, RawShabadResponse } from "../src/banidb/raw-types";
import shabadFixture from "./fixtures/shabad-1.json";
import searchFixture from "./fixtures/search-jealousy.json";

// Fixtures are unmodified responses recorded from api.banidb.com/v2.
const rawShabad = shabadFixture as unknown as RawShabadResponse;
const rawSearch = searchFixture as unknown as RawSearchResponse;

describe("normalizeShabad", () => {
  const shabad = normalizeShabad(rawShabad);

  it("keeps shabad metadata from BaniDB", () => {
    expect(shabad.shabadId).toBe(1);
    expect(shabad.ang).toBe(rawShabad.shabadInfo.pageNo);
    expect(shabad.source).toEqual({
      id: "G",
      english: rawShabad.shabadInfo.source.english,
      gurmukhi: rawShabad.shabadInfo.source.unicode,
    });
    expect(shabad.writer?.english).toBe(rawShabad.shabadInfo.writer?.english);
    expect(shabad.verses).toHaveLength(rawShabad.verses.length);
  });

  it("preserves Gurmukhi byte-for-byte, including verse markers", () => {
    shabad.verses.forEach((v, i) => {
      expect(v.gurmukhi).toBe(rawShabad.verses[i]!.verse.unicode);
    });
    expect(shabad.verses.some((v) => v.gurmukhi.includes("॥"))).toBe(true);
  });

  it("uses Unicode, never the legacy font-encoded field", () => {
    for (const v of shabad.verses) {
      expect(v.gurmukhi).toMatch(/[਀-੿]/);
    }
  });

  it("attributes translations and prefers BaniDB English first", () => {
    const first = primaryEnglish(shabad.verses[0]!);
    expect(first?.key).toBe("bdb");
    expect(first?.attribution).toBe("BaniDB (Khalis Foundation)");
    expect(first?.text).toBe((rawShabad.verses[0]!.translation!.en as Record<string, string>).bdb);
    const keys = shabad.verses[0]!.translations.filter((t) => t.language === "en").map((t) => t.key);
    expect(keys).toEqual(["bdb", "ssk", "ms"]);
  });

  it("includes English transliteration", () => {
    expect(shabad.verses[0]!.transliteration).toBe(rawShabad.verses[0]!.transliteration!.en);
  });
});

describe("normalizeSearch", () => {
  const result = normalizeSearch("jealousy", rawSearch);

  it("returns hits with Ang, shabad id and writer from each verse", () => {
    expect(result.totalResults).toBe(rawSearch.resultsInfo.totalResults);
    expect(result.hits.length).toBe(rawSearch.verses.length);
    result.hits.forEach((hit, i) => {
      const raw = rawSearch.verses[i]!;
      expect(hit.verse.verseId).toBe(raw.verseId);
      expect(hit.verse.shabadId).toBe(raw.shabadId);
      expect(hit.verse.ang).toBe(raw.pageNo ?? raw.source!.pageNo);
      expect(hit.writer?.english).toBe(raw.writer!.english);
    });
  });
});
