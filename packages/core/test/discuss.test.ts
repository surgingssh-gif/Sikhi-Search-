import { afterEach, describe, expect, it, vi } from "vitest";
import { BaniDbClient, BaniDbNotFoundError, discuss } from "../src";
import { fakeLlm, shabad568 } from "./fakes";
import angFixture from "./fixtures/ang-473.json";
import hukamnamaFixture from "./fixtures/hukamnama-2026-10-24.json";
import shabadFixture from "./fixtures/shabad-1.json";

const banidb = { getShabad: async () => shabad568 };
const [l1, l2] = shabad568.verses as [(typeof shabad568.verses)[0], (typeof shabad568.verses)[0]];
const reply = (text: string) => ({ reply: text, followUps: ["What does the Rahao line mean?"] });

describe("discuss", () => {
  it("replies about the shabad, citing its lines", async () => {
    const { llm, calls } = fakeLlm({ discuss: [reply(`This line is about the mind imbued with the One. [[verse:${l2.verseId}]]`)] });
    const result = await discuss({ llm, banidb }, 568, "What is this shabad about?");

    expect(result.citedVerseIds).toEqual([l2.verseId]);
    expect(result.reply.some((s) => s.type === "citation")).toBe(true);
    expect(result.followUps).toEqual(["What does the Rahao line mean?"]);
    // The whole shabad goes in the cached context block, in English only.
    // Headings are labelled, not numbered; numbering starts at the first line of text.
    expect(calls[0]!.context).toContain("(heading) Gauree, Fifth Mehla:");
    expect(calls[0]!.context).toContain(`Line 1 [id ${l2.verseId}]`);
    expect(calls[0]!.context).toContain("[Rahao]");
    expect(calls[0]!.context).not.toMatch(/[਀-੿]/);
  });

  it("rejects citations to lines outside the shabad, then retries", async () => {
    const { llm } = fakeLlm({ discuss: [reply("See [[verse:999999]]."), reply(`See [[verse:${l1.verseId}]].`)] });
    const result = await discuss({ llm, banidb }, 568, "Explain line 1");
    expect(result.citationCheck).toEqual({ passedFirstTime: false, retried: true, sanitized: false });
    expect(result.citedVerseIds).toEqual([l1.verseId]);
  });

  it("keeps the conversation going with earlier turns", async () => {
    const { llm, calls } = fakeLlm({ discuss: [reply("Yes, exactly.")] });
    await discuss({ llm, banidb }, 568, "So it's about jealousy?", [
      { role: "user", content: "What is this about?" },
      { role: "assistant", content: "It contrasts…" },
    ]);
    expect(calls[0]!.messages.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
  });

  it("reports progress stages", async () => {
    const { llm } = fakeLlm({ discuss: [reply("Ok.")] });
    const stages: string[] = [];
    await discuss({ llm, banidb }, 568, "Hi there", [], { onStage: (s) => stages.push(s) });
    expect(stages).toEqual(["reading", "writing", "checking"]);
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

describe("BaniDbClient: Hukamnama and Angs", () => {
  afterEach(() => vi.useRealTimers());

  it("returns today's Hukamnama with its date", async () => {
    const client = new BaniDbClient({ fetch: async () => jsonResponse(hukamnamaFixture) });
    const h = await client.getHukamnamaToday();
    expect(h.date).toBe("2026-10-24");
    expect(h.shabads.map((s) => s.shabadId)).toEqual(hukamnamaFixture.shabadIds);
  });

  it("caches the Hukamnama for minutes, not a day", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(async (url: string | URL | Request) =>
      jsonResponse(String(url).includes("hukamnama") ? hukamnamaFixture : shabadFixture),
    );
    const client = new BaniDbClient({ fetch });
    await client.getHukamnamaToday();
    await client.getShabad(1);
    vi.advanceTimersByTime(16 * 60 * 1000);
    await client.getHukamnamaToday();
    await client.getShabad(1);
    const urls = fetch.mock.calls.map((c) => String(c[0]));
    expect(urls.filter((u) => u.includes("hukamnama"))).toHaveLength(2);
    expect(urls.filter((u) => u.includes("/shabads/1"))).toHaveLength(1);
  });

  it("lists the shabads on an Ang, separating headings from first lines", async () => {
    const client = new BaniDbClient({ fetch: async () => jsonResponse(angFixture) });
    const ang = await client.getAng(473);
    const ids = [...new Set(angFixture.page.map((v) => v.shabadId))];
    expect(ang.shabads.map((s) => s.shabadId)).toEqual(ids);
    for (const s of ang.shabads) {
      expect(s.heading).not.toMatch(/:$/);
      expect(s.firstLine?.translations[0]?.text).not.toMatch(/:$/);
    }
    expect(ang.shabads.reduce((n, s) => n + s.lineCount, 0)).toBe(angFixture.page.length);
  });

  it("rejects Angs outside 1-1430 without calling BaniDB", async () => {
    const fetch = vi.fn();
    const client = new BaniDbClient({ fetch });
    await expect(client.getAng(0)).rejects.toBeInstanceOf(BaniDbNotFoundError);
    await expect(client.getAng(1431)).rejects.toBeInstanceOf(BaniDbNotFoundError);
    expect(fetch).not.toHaveBeenCalled();
  });
});
