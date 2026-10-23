import type { SearchResult, Shabad, SourceId } from "../types";
import { BaniDbError, BaniDbNotFoundError } from "./errors";
import { normalizeSearch, normalizeShabad } from "./normalize";
import type { RawErrorResponse, RawSearchResponse, RawShabadResponse } from "./raw-types";

export interface BaniDbClientOptions {
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
  /** How long successful responses are cached in memory. Gurbani text rarely changes. */
  cacheTtlMs?: number;
  maxCacheEntries?: number;
}

export interface SearchOptions {
  source?: SourceId | "all";
  page?: number;
  results?: number;
}

/** BaniDB `searchtype` values we use (see /v2/api-docs). */
const SEARCH_TYPE_ENGLISH_TRANSLATION = 3;

interface CacheEntry {
  expires: number;
  value: unknown;
}

export class BaniDbClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly timeoutMs: number;
  private readonly cacheTtlMs: number;
  private readonly maxCacheEntries: number;
  private readonly cache = new Map<string, CacheEntry>();

  constructor(options: BaniDbClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? "https://api.banidb.com/v2").replace(/\/+$/, "");
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.cacheTtlMs = options.cacheTtlMs ?? 24 * 60 * 60 * 1000;
    this.maxCacheEntries = options.maxCacheEntries ?? 500;
  }

  async getShabad(shabadId: number): Promise<Shabad> {
    if (!Number.isInteger(shabadId) || shabadId < 1) {
      throw new BaniDbNotFoundError(`Invalid shabad id: ${shabadId}`);
    }
    const raw = await this.getJson<RawShabadResponse>(`/shabads/${shabadId}`);
    return normalizeShabad(raw);
  }

  /** Whole-word search over English translations (BaniDB searchtype 3). */
  async searchTranslations(query: string, options: SearchOptions = {}): Promise<SearchResult> {
    const q = query.trim();
    if (!q) return { query: q, totalResults: 0, page: 0, totalPages: 0, hits: [] };
    const params = new URLSearchParams({
      searchtype: String(SEARCH_TYPE_ENGLISH_TRANSLATION),
      source: options.source ?? "G",
      results: String(options.results ?? 20),
      page: String(options.page ?? 1),
    });
    const raw = await this.getJson<RawSearchResponse>(`/search/${encodeURIComponent(q)}?${params}`);
    return normalizeSearch(q, raw);
  }

  private async getJson<T>(path: string): Promise<T> {
    const cached = this.cache.get(path);
    if (cached && cached.expires > Date.now()) {
      // Refresh recency so the map behaves as an LRU.
      this.cache.delete(path);
      this.cache.set(path, cached);
      return cached.value as T;
    }

    let res: Response;
    try {
      res = await this.fetchImpl(`${this.baseUrl}${path}`, {
        headers: { accept: "application/json", "user-agent": "AskSikhi/0.1 (+https://github.com/surgingssh-gif/Sikhi-Search-)" },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      throw new BaniDbError(`BaniDB request failed: ${(err as Error).message}`);
    }

    const body = (await res.json().catch(() => null)) as T | RawErrorResponse | null;
    if (res.status === 404) {
      throw new BaniDbNotFoundError(errorText(body) ?? `Not found: ${path}`);
    }
    if (!res.ok || body == null || isErrorBody(body)) {
      throw new BaniDbError(errorText(body) ?? `BaniDB returned HTTP ${res.status}`, res.status);
    }

    this.cache.set(path, { expires: Date.now() + this.cacheTtlMs, value: body });
    while (this.cache.size > this.maxCacheEntries) {
      const oldest = this.cache.keys().next().value;
      if (oldest === undefined) break;
      this.cache.delete(oldest);
    }
    return body as T;
  }
}

function isErrorBody(body: unknown): body is RawErrorResponse {
  return typeof body === "object" && body !== null && (body as { error?: unknown }).error === true;
}

function errorText(body: unknown): string | undefined {
  return isErrorBody(body) ? body.data?.error : undefined;
}
