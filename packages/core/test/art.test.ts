import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { drawMap, illustrateEdition, mapPlaceOf, type ImageMaker } from "../src/magazine/art";
import type { Edition, EditionArticle } from "../src";
import { fakeLlm } from "./fakes";

const article = (extra: Partial<EditionArticle> = {}): EditionArticle => ({
  slug: "masters-meet",
  kicker: "Achievement",
  headline: "At 104, a runner leads Punjab's masters meet",
  dek: "Athletes aged 35 to 104 met in Ferozepur.",
  paragraphs: [
    { text: "Athletes from across Punjab gathered at the stadium in Ferozepur for two days.", sources: ["a"] },
    { text: "The oldest, at 104, ran the 100 metres.", sources: ["a"] },
  ],
  pullQuote: null,
  sources: [
    { id: "x", outlet: "The Tribune", title: "Punjab", url: "https://example.org/x", publishedAt: null, place: "Punjab", at: { lat: 31, lng: 75 } },
    { id: "a", outlet: "Khalsa Vox", title: "Masters meet", url: "https://example.org/a", publishedAt: null, place: "Ferozepur", at: { lat: 30.92, lng: 74.61 } },
  ],
  tone: "good",
  readMinutes: 2,
  ...extra,
});

// Drawing a map reads the world map and takes a few seconds.
describe("maps", { timeout: 60_000 }, () => {
  it("maps the town the story names, never a whole country or a town it doesn't mention", () => {
    expect(mapPlaceOf(article())).toEqual({ name: "Ferozepur", lat: 30.92, lng: 74.61 });
    expect(mapPlaceOf(article({ dek: "Athletes aged 35 to 104 met.", paragraphs: [{ text: "Athletes gathered in Punjab.", sources: ["a"] }] }))).toBeNull();
    // A source tagged only with its country: the first town the story names.
    const barrie = article({ headline: "Teens charged after attack on a bus", dek: "Police in Barrie say three were charged.", sources: [{ ...article().sources[0]!, place: "Canada", at: { lat: 56, lng: -106 } }] });
    expect(mapPlaceOf(barrie)).toMatchObject({ name: "Barrie" });
  });

  it("draws a small, labelled engraved map", () => {
    const svg = drawMap({ name: "Ferozepur", lat: 30.92, lng: 74.61 });
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("FEROZEPUR");
    expect(svg).toContain("PAKISTAN");
    expect(svg).toContain("Amritsar");
    expect(svg.length).toBeLessThan(150_000);
  });
});

describe("illustrateEdition", { timeout: 60_000 }, () => {
  const edition = (): Edition => ({ date: "2026-11-16", issue: 7, generatedAt: "", articles: [article(), article({ slug: "second", headline: "A second story" })], briefs: [], costUsd: 0 });
  const painter = (): ImageMaker & { count: number } => {
    const p = { count: 0, async paint() { p.count++; return { data: Buffer.from("picture"), mediaType: "image/webp" as const }; } };
    return p;
  };
  const brief = { scene: "Running shoes on a cinder track at dawn.", alt: "Shoes on a track.", caption: "An illustration of a morning race." };

  it("draws maps, paints and checks illustrations, and leaves out a picture that fails twice", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "sikhe-art-"));
    let reviews = 0;
    const { llm } = fakeLlm({
      "edition-art": () => brief,
      // The first story's picture passes; the second's fails both times.
      "edition-art-review": () => (++reviews === 1 ? { ok: true, problems: [] } : { ok: false, problems: ["It contains lettering"] }),
    });
    const images = painter();
    const e = edition();
    await illustrateEdition(e, { llm, images, dir });
    const [first, second] = e.articles;
    expect(first!.art).toEqual({ file: "2026-11-16/masters-meet.webp", alt: brief.alt, caption: brief.caption });
    expect(await readFile(path.join(dir, first!.art!.file), "utf8")).toBe("picture");
    expect(first!.map?.file).toBe("2026-11-16/masters-meet-map.svg");
    expect(await readFile(path.join(dir, first!.map!.file), "utf8")).toContain("FEROZEPUR");
    expect(second!.art).toBeNull();
    expect(images.count).toBe(3);

    // A second run leaves what was tried alone.
    await illustrateEdition(e, { llm, images, dir });
    expect(images.count).toBe(3);
  });

  it("draws only maps without an image model", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "sikhe-art-"));
    const e = edition();
    await illustrateEdition(e, { llm: fakeLlm({}).llm, dir });
    expect(e.articles[0]!.map).not.toBeNull();
    expect(e.articles[0]!.art).toBeUndefined();
  });
});
