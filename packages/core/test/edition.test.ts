import { describe, expect, it } from "vitest";
import { alternate, editionDate, paragraphProblems, writeEdition, type NewsItem } from "../src";
import { fakeLlm } from "./fakes";

const source =
  "Three Sikh volunteers from the Gurdwara Sahib served 1,200 free meals on Sunday. \"We do this because seva is at the heart of our faith,\" said Harjit Kaur, the committee's secretary, adding that the langar would run every weekend through the winter.";

describe("paragraphProblems", () => {
  it("passes a paragraph that keeps to its source", () => {
    expect(paragraphProblems(`Volunteers served 1,200 meals. "We do this because seva is at the heart of our faith," Harjit Kaur said.`, [source])).toEqual([]);
    // A small number may be written as digits when the source spells it out.
    expect(paragraphProblems("The 3 volunteers came from the gurdwara.", [source])).toEqual([]);
  });
  it("flags numbers that aren't in the source", () => {
    expect(paragraphProblems("Volunteers served 5,000 meals.", [source])[0]).toMatch(/5,000/);
    expect(paragraphProblems("Volunteers served 200 meals.", [source])[0]).toMatch(/200/);
  });
  it("flags quotations that aren't word for word", () => {
    expect(paragraphProblems(`"Seva is the heart of everything we believe," she said.`, [source])[0]).toMatch(/quotation/);
  });
  it("flags long runs copied without quotation marks", () => {
    expect(paragraphProblems("On Sunday, said Harjit Kaur, the committee's secretary, adding that the langar would run every weekend through the winter.", [source]).join(" ")).toMatch(/copies/);
    // A short shared phrase is fine.
    expect(paragraphProblems("Harjit Kaur said the langar would run every weekend until spring.", [source])).toEqual([]);
  });
  it("counts only the publisher's words as copying", () => {
    const ours = "Harjit Kaur, the committee secretary, said the gurdwara's volunteers would keep the langar running every weekend through the winter.";
    expect(paragraphProblems(ours, [source, ours], [source])).toEqual([]);
  });
  it("needs a source", () => {
    expect(paragraphProblems("Something happened.", [])).toEqual(["it cites no source"]);
  });
});

describe("alternate", () => {
  it("alternates good and hard news after the cover, starting with the opposite", () => {
    const f = (id: string, tone: "good" | "hard") => ({ id, tone });
    const order = alternate([f("h1", "hard"), f("h2", "hard"), f("g1", "good"), f("g2", "good")], "hard").map((x) => x.id);
    expect(order).toEqual(["g1", "h1", "g2", "h2"]);
    expect(alternate([f("h1", "hard"), f("h2", "hard"), f("g1", "good")], "good").map((x) => x.id)).toEqual(["h1", "g1", "h2"]);
  });
});

describe("editionDate", () => {
  it("uses the date in New York", () => {
    expect(editionDate(new Date("2026-11-12T03:00:00Z"))).toBe("2026-11-11");
  });
});

const now = Date.parse("2026-11-11T12:00:00Z");
const item = (id: string, title: string, extra: Partial<NewsItem> = {}): NewsItem => ({
  id,
  title,
  url: `https://example.org/${id}`,
  source: "Example News",
  feedId: "x",
  language: "en",
  publishedAt: "2026-11-11T08:00:00Z",
  snippet: "",
  categories: ["panth"],
  image: null,
  place: null,
  interest: 3,
  tone: "uplifting",
  kind: "seva",
  appeal: 3,
  beat: null,
  summary: null,
  event: null,
  america: true,
  rated: "model",
  ...extra,
});

describe("writeEdition", () => {
  const items = [
    item("a", "Gurdwara volunteers serve 1,200 meals"),
    item("b", "Court hears case of Sikh activist", { kind: null, tone: "neutral", beat: "justice" }),
    item("c", "Sikh student wins scholarship", { kind: "youth" }),
    item("d", "Nagar kirtan draws thousands", { kind: "celebration" }),
    item("e", "Gurdwara reopens after restoration", { kind: "heritage" }),
    item("f", "Sikh councillor sworn in", { kind: "achievement", snippet: "A Sikh councillor was sworn in on Monday." }),
  ];
  const texts: Record<string, string[]> = { a: [source], b: ["The court heard the case on Tuesday. The activist's lawyer said the hearing would continue next month, and that the family had waited years for it. Supporters gathered outside the courthouse in the morning."] };

  it("writes the planned pieces, drops what fails the checks twice, and keeps the sources", async () => {
    const { llm, calls } = fakeLlm({
      "edition-plan": [{ cover: { storyIds: ["a"] }, features: [{ storyIds: ["b"] }, { storyIds: ["c"] }], briefs: [{ storyId: "f" }] }],
      "edition-article": (req) => {
        const text = String(req.messages[0]!.content);
        if (text.includes("1,200")) {
          return {
            kicker: "Seva",
            headline: "A winter of langar",
            dek: "Volunteers at one gurdwara are feeding their neighbours every weekend.",
            paragraphs: [
              { text: "Volunteers at the gurdwara served 1,200 free meals on Sunday.", sources: ["S1"] },
              { text: `"We do this because seva is at the heart of our faith," said Harjit Kaur.`, sources: ["S1"] },
              // Made up, twice: dropped.
              { text: "They plan to serve 10,000 more by spring.", sources: ["S1"] },
            ],
            pullQuote: "Volunteers at the gurdwara served 1,200 free meals on Sunday.",
          };
        }
        return {
          kicker: "Justice",
          headline: "A hearing at last",
          dek: "The case continues next month.",
          paragraphs: [
            { text: "The court heard the activist's case on Tuesday.", sources: ["S1"] },
            { text: "His lawyer said the hearing continues next month.", sources: ["S1"] },
          ],
          pullQuote: null,
        };
      },
      "edition-briefs": [{ briefs: [{ id: "f", kicker: "Achievement", headline: "A councillor sworn in", text: "A Sikh councillor was sworn in on Monday." }] }],
    });
    const edition = await writeEdition({ llm, items, fetchText: async (i) => texts[i.id] ?? [], date: "2026-11-11", issue: 3, now: () => now });
    expect(edition.issue).toBe(3);
    // "c" has only a headline, too little for an article.
    expect(edition.articles.map((a) => a.headline)).toEqual(["A winter of langar", "A hearing at last"]);
    const cover = edition.articles[0]!;
    expect(cover.paragraphs).toHaveLength(2);
    expect(cover.paragraphs[0]!.sources).toEqual(["a"]);
    expect(cover.sources[0]).toMatchObject({ id: "a", url: "https://example.org/a" });
    expect(cover.tone).toBe("good");
    expect(edition.articles[1]!.tone).toBe("hard");
    expect(cover.pullQuote).toMatch(/1,200/);
    expect(edition.briefs).toHaveLength(1);
    // The cover story was rewritten once after failing the check.
    expect(calls.filter((c) => c.step === "edition-article" && c.messages.length === 3)).toHaveLength(1);
  });
});
