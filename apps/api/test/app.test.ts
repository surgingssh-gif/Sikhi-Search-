import { describe, expect, it, vi } from "vitest";
import { BaniDbError, BaniDbNotFoundError, normalizeShabad, type JsonLlm, type RawShabadResponse } from "@ask-sikhi/core";
import { createApp, GURBANI_ATTRIBUTION } from "../src/app";
import shabadFixture from "../../../packages/core/test/fixtures/shabad-1.json";

const shabad = normalizeShabad(shabadFixture as unknown as RawShabadResponse);
const emptySearch = async (query: string) => ({ query, totalResults: 0, page: 0, totalPages: 0, hits: [] });
const banidbWith = (getShabad: (id: number) => Promise<typeof shabad>) => ({ getShabad, searchTranslations: emptySearch });

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  ({ method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) }) as const;

describe("GET /v1/shabads/:id", () => {
  it("returns the shabad with attribution", async () => {
    const getShabad = vi.fn(async () => shabad);
    const app = createApp({ banidb: banidbWith(getShabad) });

    const res = await app.request("/v1/shabads/1");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ shabad, attribution: GURBANI_ATTRIBUTION });
    expect(getShabad).toHaveBeenCalledWith(1);
  });

  it("rejects non-numeric ids", async () => {
    const getShabad = vi.fn(async () => shabad);
    const app = createApp({ banidb: banidbWith(getShabad) });
    expect((await app.request("/v1/shabads/abc")).status).toBe(400);
    expect(getShabad).not.toHaveBeenCalled();
  });

  it("returns 404 when BaniDB has no such shabad", async () => {
    const app = createApp({ banidb: banidbWith(async () => Promise.reject(new BaniDbNotFoundError("nope"))) });
    expect((await app.request("/v1/shabads/99999999")).status).toBe(404);
  });

  it("returns 502 when BaniDB is unavailable", async () => {
    const app = createApp({ banidb: banidbWith(async () => Promise.reject(new BaniDbError("down", 503))) });
    const res = await app.request("/v1/shabads/1");
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "upstream_unavailable" });
  });
});

describe("POST /v1/ask and /v1/explore", () => {
  // With no search hits the pipeline makes two model calls (expand, answer) and cites nothing.
  const llm: JsonLlm = {
    completeJson: async (req) => ({
      data: req.schema.parse(
        req.step === "expand"
          ? { category: "practice", concepts: [], searchTerms: ["dastaar"] }
          : { summary: "A dastaar is...", sections: [], basis: "general_knowledge", followUps: [] },
      ),
      usage: { step: req.step, model: "fake", inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0, costUsd: 0 },
    }),
  };

  it("answers with attribution and a source label", async () => {
    const app = createApp({ banidb: banidbWith(async () => shabad), llm });
    const res = await app.request("/v1/ask", post("/v1/ask", { question: "Why do Sikhs wear a dastaar?" }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json).toMatchObject({ basis: "general_knowledge", attribution: GURBANI_ATTRIBUTION, passages: [] });
    expect(json.sourceLabel).toBeTruthy();
  });

  it("streams progress stages then the result when asked for event-stream", async () => {
    const app = createApp({ banidb: banidbWith(async () => shabad), llm });
    const res = await app.request("/v1/ask", post("/v1/ask", { question: "Why do Sikhs wear a dastaar?" }, { accept: "text/event-stream" }));
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const text = await res.text();
    const events = [...text.matchAll(/event: (\w+)\ndata: (.*)\n/g)].map((m) => ({ event: m[1], data: JSON.parse(m[2]!) }));
    expect(events.filter((e) => e.event === "stage").map((e) => e.data.stage)).toEqual([
      "understanding",
      "searching",
      "reading",
      "writing",
      "checking",
    ]);
    expect(events.at(-1)).toMatchObject({ event: "result", data: { basis: "general_knowledge", attribution: GURBANI_ATTRIBUTION } });
  });

  it("reports pipeline failures as an error event when streaming", async () => {
    const failing: JsonLlm = { completeJson: async () => Promise.reject(new Error("boom")) };
    const app = createApp({ banidb: banidbWith(async () => shabad), llm: failing });
    const res = await app.request("/v1/ask", post("/v1/ask", { question: "What is Hukam?" }, { accept: "text/event-stream" }));
    expect(await res.text()).toContain('event: error\ndata: {"error":"internal_error"}');
  });

  it("validates the question", async () => {
    const app = createApp({ banidb: banidbWith(async () => shabad), llm });
    expect((await app.request("/v1/ask", post("/v1/ask", { question: "" }))).status).toBe(400);
    expect((await app.request("/v1/ask", post("/v1/ask", { question: "x".repeat(501) }))).status).toBe(400);
    expect((await app.request("/v1/explore", post("/v1/explore", {}))).status).toBe(400);
  });

  it("returns 503 when no model is configured", async () => {
    const app = createApp({ banidb: banidbWith(async () => shabad) });
    expect((await app.request("/v1/ask", post("/v1/ask", { question: "What is Hukam?" }))).status).toBe(503);
  });

  it("rate limits each client", async () => {
    const app = createApp({ banidb: banidbWith(async () => shabad), llm, aiRequestsPerMinute: 2 });
    const send = (ip: string) => app.request("/v1/explore", post("/v1/explore", { question: "What is Hukam?" }, { "x-forwarded-for": ip }));
    expect((await send("1.1.1.1")).status).toBe(200);
    expect((await send("1.1.1.1")).status).toBe(200);
    const limited = await send("1.1.1.1");
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBeTruthy();
    expect((await send("2.2.2.2")).status).toBe(200);
  });
});

describe("CORS", () => {
  it("allows configured origins only", async () => {
    const app = createApp({ banidb: banidbWith(async () => shabad), allowedOrigins: ["http://localhost:3000"] });
    const allowed = await app.request("/v1/health", { headers: { origin: "http://localhost:3000" } });
    expect(allowed.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
    const other = await app.request("/v1/health", { headers: { origin: "https://evil.example" } });
    expect(other.headers.get("access-control-allow-origin")).toBeNull();
  });
});
