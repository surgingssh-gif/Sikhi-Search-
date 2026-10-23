import { describe, expect, it, vi } from "vitest";
import { BaniDbError, BaniDbNotFoundError, normalizeShabad, type RawShabadResponse } from "@ask-sikhi/core";
import { createApp, GURBANI_ATTRIBUTION } from "../src/app";
import shabadFixture from "../../../packages/core/test/fixtures/shabad-1.json";

const shabad = normalizeShabad(shabadFixture as unknown as RawShabadResponse);

describe("GET /v1/shabads/:id", () => {
  it("returns the shabad with attribution", async () => {
    const getShabad = vi.fn(async () => shabad);
    const app = createApp({ banidb: { getShabad } });

    const res = await app.request("/v1/shabads/1");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ shabad, attribution: GURBANI_ATTRIBUTION });
    expect(getShabad).toHaveBeenCalledWith(1);
  });

  it("rejects non-numeric ids", async () => {
    const getShabad = vi.fn();
    const app = createApp({ banidb: { getShabad } });
    expect((await app.request("/v1/shabads/abc")).status).toBe(400);
    expect(getShabad).not.toHaveBeenCalled();
  });

  it("returns 404 when BaniDB has no such shabad", async () => {
    const app = createApp({ banidb: { getShabad: async () => Promise.reject(new BaniDbNotFoundError("nope")) } });
    expect((await app.request("/v1/shabads/99999999")).status).toBe(404);
  });

  it("returns 502 when BaniDB is unavailable", async () => {
    const app = createApp({ banidb: { getShabad: async () => Promise.reject(new BaniDbError("down", 503)) } });
    const res = await app.request("/v1/shabads/1");
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "upstream_unavailable" });
  });
});

describe("CORS", () => {
  it("allows configured origins only", async () => {
    const app = createApp({ banidb: { getShabad: vi.fn() }, allowedOrigins: ["http://localhost:3000"] });
    const allowed = await app.request("/v1/health", { headers: { origin: "http://localhost:3000" } });
    expect(allowed.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
    const other = await app.request("/v1/health", { headers: { origin: "https://evil.example" } });
    expect(other.headers.get("access-control-allow-origin")).toBeNull();
  });
});
