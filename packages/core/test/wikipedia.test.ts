import { describe, expect, it, vi } from "vitest";
import { parseSections, WikipediaClient } from "../src/history/wikipedia";

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

describe("parseSections", () => {
  it("splits an article into sections and drops the source lists", () => {
    const text = [
      "Baba Deep Singh was a Sikh martyr.",
      "",
      "== Early life ==",
      "He was born in 1682.",
      "",
      "== Legacy ==",
      "=== Memorials ===",
      "A gurdwara marks the place.",
      "== See also ==",
      "Sikh martyrs",
      "== References ==",
      "=== Notes ===",
      "1. A note.",
    ].join("\n");
    expect(parseSections(text)).toEqual([
      { heading: null, level: 1, paragraphs: ["Baba Deep Singh was a Sikh martyr."] },
      { heading: "Early life", level: 2, paragraphs: ["He was born in 1682."] },
      { heading: "Legacy", level: 2, paragraphs: [] },
      { heading: "Memorials", level: 3, paragraphs: ["A gurdwara marks the place."] },
    ]);
  });
});

describe("WikipediaClient", () => {
  it("adds 'sikh' to a search, identifies itself and keeps Wikipedia's order", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      json({ query: { pages: [{ title: "Battle of Saragarhi", index: 2 }, { title: "Saragarhi", index: 1, description: "Village", thumbnail: { source: "https://img" } }] } }),
    );
    const client = new WikipediaClient({ fetch });
    const results = await client.search("saragarhi");
    expect(results.map((r) => r.title)).toEqual(["Saragarhi", "Battle of Saragarhi"]);
    expect(results[0]).toMatchObject({ description: "Village", thumbnail: "https://img", url: "https://en.wikipedia.org/wiki/Saragarhi" });
    const [url, init] = fetch.mock.calls[0]!;
    expect(new URL(String(url)).searchParams.get("gsrsearch")).toBe("saragarhi sikh");
    expect((init?.headers as Record<string, string>)["user-agent"]).toMatch(/^Sikhe\//);
  });

  it("does not add 'sikh' twice, and caches", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => json({ query: { pages: [] } }));
    const client = new WikipediaClient({ fetch });
    await client.search("Sikh Empire");
    await client.search("Sikh Empire");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(new URL(String(fetch.mock.calls[0]![0])).searchParams.get("gsrsearch")).toBe("Sikh Empire");
  });

  it("returns summaries in the order asked, following redirects", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      json({ query: { redirects: [{ from: "Harmandir Sahib", to: "Golden Temple" }], pages: [{ title: "Golden Temple" }, { title: "Akal Takht" }, { title: "Nowhere", missing: true }] } }),
    );
    const client = new WikipediaClient({ fetch });
    expect((await client.summaries(["Akal Takht", "Harmandir Sahib", "Nowhere"])).map((s) => s.title)).toEqual(["Akal Takht", "Golden Temple"]);
  });

  it("returns null for a missing article", async () => {
    const client = new WikipediaClient({ fetch: async () => json({ query: { pages: [{ title: "Nope", missing: true }] } }) });
    expect(await client.article("Nope")).toBeNull();
  });
});
