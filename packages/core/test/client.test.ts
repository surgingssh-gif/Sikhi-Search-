import { describe, expect, it, vi } from "vitest";
import { BaniDbClient, BaniDbError, BaniDbNotFoundError } from "../src";
import shabadFixture from "./fixtures/shabad-1.json";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("BaniDbClient", () => {
  it("fetches and normalizes a shabad, then serves it from cache", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => jsonResponse(shabadFixture));
    const client = new BaniDbClient({ fetch, baseUrl: "https://example.test/v2/" });

    const a = await client.getShabad(1);
    const b = await client.getShabad(1);

    expect(a.shabadId).toBe(1);
    expect(b).toEqual(a);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]![0]).toBe("https://example.test/v2/shabads/1");
  });

  it("maps BaniDB 404s to BaniDbNotFoundError", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      jsonResponse({ error: true, data: { error: "Shabad does not exist or no updates found for specified Shabad." } }, 404),
    );
    const client = new BaniDbClient({ fetch });
    await expect(client.getShabad(99999999)).rejects.toBeInstanceOf(BaniDbNotFoundError);
  });

  it("rejects invalid ids without calling BaniDB", async () => {
    const fetch = vi.fn();
    const client = new BaniDbClient({ fetch });
    await expect(client.getShabad(0)).rejects.toBeInstanceOf(BaniDbNotFoundError);
    await expect(client.getShabad(1.5)).rejects.toBeInstanceOf(BaniDbNotFoundError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("wraps network failures and does not cache them", async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("socket hang up"))
      .mockResolvedValueOnce(jsonResponse(shabadFixture));
    const client = new BaniDbClient({ fetch });
    await expect(client.getShabad(1)).rejects.toBeInstanceOf(BaniDbError);
    await expect(client.getShabad(1)).resolves.toMatchObject({ shabadId: 1 });
  });

  it("builds an English-translation search request", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      jsonResponse({ resultsInfo: { totalResults: 0, pages: { page: 0, totalPages: 0 } }, verses: [] }),
    );
    const client = new BaniDbClient({ fetch, baseUrl: "https://example.test/v2" });
    const result = await client.searchTranslations(" jealousy ");
    expect(result.hits).toEqual([]);
    const url = new URL(String(fetch.mock.calls[0]![0]));
    expect(url.pathname).toBe("/v2/search/jealousy");
    expect(url.searchParams.get("searchtype")).toBe("3");
    expect(url.searchParams.get("source")).toBe("G");
  });

  it("searches by first letters, typed on the Gurbani Akhar keyboard", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => jsonResponse({ resultsInfo: { totalResults: 0, pages: { page: 1, totalPages: 0 } }, verses: [] }));
    const client = new BaniDbClient({ fetch, baseUrl: "https://example.test/v2" });
    await client.searchGurbani("skmk", "first-letters", { page: 2 });
    const url = new URL(String(fetch.mock.calls[0]![0]));
    expect(url.pathname).toBe("/v2/search/skmk");
    expect(url.searchParams.get("searchtype")).toBe("1");
    expect(url.searchParams.get("page")).toBe("2");
  });

  it("evicts the oldest entries past the cache limit", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => jsonResponse(shabadFixture));
    const client = new BaniDbClient({ fetch, maxCacheEntries: 1 });
    await client.getShabad(1);
    await client.getShabad(2);
    await client.getShabad(1);
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
