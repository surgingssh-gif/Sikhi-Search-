import type { AngContents, AngShabad, Bani, BaniSummary, Hukamnama, SearchResult, Shabad, SourceId } from "../types";
import { BaniDbError, BaniDbNotFoundError } from "./errors";
import { isHeadingVerse, normalizeSearch, normalizeShabad, normalizeVerse, primaryEnglish } from "./normalize";
import type {
  RawAngResponse,
  RawBaniListItem,
  RawBaniResponse,
  RawErrorResponse,
  RawHukamnamaResponse,
  RawSearchResponse,
  RawShabadResponse,
} from "./raw-types";

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

/**
 * How a reader searches Gurbani. "first-letters" takes the first letter of each
 * word anywhere in a line, in Gurmukhi or typed on the Gurbani Akhar keyboard
 * ("skmk" for ਸਭ ਕੀਮਤਿ ਮਿਲਿ ਕੀਮਤਿ); "words" takes whole Gurmukhi words;
 * "meaning" takes whole English words in the translation.
 */
export type GurbaniSearchMode = "first-letters" | "words" | "meaning";

/** BaniDB `searchtype` values we use (see /v2/api-docs). */
const SEARCH_TYPE_ENGLISH_TRANSLATION = 3;
const SEARCH_TYPES: Record<GurbaniSearchMode, number> = { "first-letters": 1, words: 2, meaning: SEARCH_TYPE_ENGLISH_TRANSLATION };
const HUKAMNAMA_TTL_MS = 15 * 60 * 1000;

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
    return this.searchGurbani(query, "meaning", options);
  }

  /** A reader's search: by first letters, Gurmukhi words or English meaning. */
  async searchGurbani(query: string, mode: GurbaniSearchMode, options: SearchOptions = {}): Promise<SearchResult> {
    const q = query.trim();
    if (!q) return { query: q, totalResults: 0, page: 0, totalPages: 0, hits: [] };
    const params = new URLSearchParams({
      searchtype: String(SEARCH_TYPES[mode]),
      source: options.source ?? "G",
      results: String(options.results ?? 20),
      page: String(options.page ?? 1),
    });
    const raw = await this.getJson<RawSearchResponse>(`/search/${encodeURIComponent(q)}?${params}`);
    return normalizeSearch(q, raw);
  }

  /**
   * Today's Hukamnama from Sri Harmandir Sahib, as BaniDB publishes it.
   * Cached briefly (not for a day) so it changes over at midnight.
   */
  async getHukamnamaToday(): Promise<Hukamnama> {
    const raw = await this.getJson<RawHukamnamaResponse>("/hukamnamas/today", HUKAMNAMA_TTL_MS);
    const d = raw.date?.gregorian;
    if (!d || !raw.shabads?.length) throw new BaniDbError("BaniDB returned no Hukamnama for today");
    return {
      date: `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.date).padStart(2, "0")}`,
      shabads: raw.shabads.map(normalizeShabad),
    };
  }

  /** Every bani BaniDB provides (Japji Sahib, Jaap Sahib, Sukhmani Sahib, Ardas, ...). */
  async getBanis(): Promise<BaniSummary[]> {
    const raw = await this.getJson<RawBaniListItem[]>("/banis");
    return raw.map((b) => ({ baniId: b.ID, name: b.transliterations?.english ?? b.token ?? "", gurmukhi: b.gurmukhiUni }));
  }

  async getBani(baniId: number): Promise<Bani> {
    if (!Number.isInteger(baniId) || baniId < 1) throw new BaniDbNotFoundError(`Invalid bani id: ${baniId}`);
    const raw = await this.getJson<RawBaniResponse>(`/banis/${baniId}`);
    const info = raw.baniInfo;
    const named = (r: { english: string; unicode?: string | null } | null | undefined, id: number | undefined) =>
      r?.english && id != null ? { id, english: r.english, gurmukhi: r.unicode ?? null } : null;
    return {
      baniId: info.baniID,
      name: info.english,
      gurmukhi: info.unicode,
      source: info.source ? { id: info.source.sourceId, english: info.source.english, gurmukhi: info.source.unicode ?? null } : null,
      writer: named(info.writer, info.writer?.writerId),
      raag: named(info.raag, info.raag?.raagId),
      verses: raw.verses.map((v) => ({
        ...normalizeVerse({ ...v.verse, shabadId: v.verse.shabadId ?? 0 }, info.source?.pageNo),
        paragraph: v.paragraph,
        header: v.header > 0,
      })),
    };
  }

  /** The shabads that appear on one Ang, each with its first line. */
  async getAng(ang: number, source: SourceId = "G"): Promise<AngContents> {
    if (!Number.isInteger(ang) || ang < 1 || (source === "G" && ang > 1430)) {
      throw new BaniDbNotFoundError(`Invalid Ang: ${ang}`);
    }
    const raw = await this.getJson<RawAngResponse>(`/angs/${ang}/${source}`);
    const byShabad = new Map<number, AngShabad>();
    for (const v of raw.page ?? []) {
      const verse = normalizeVerse(v, ang);
      const heading = isHeadingVerse(verse);
      const entry = byShabad.get(v.shabadId);
      if (entry) {
        entry.lineCount++;
        // Replace a heading ("Pauree:") with the first line of actual text.
        if (entry.heading !== null && entry.firstLine === null && !heading) entry.firstLine = verse;
        continue;
      }
      byShabad.set(v.shabadId, {
        shabadId: v.shabadId,
        heading: heading ? (primaryEnglish(verse)?.text.replace(/:\s*$/, "") ?? null) : null,
        firstLine: heading ? null : verse,
        lineCount: 1,
        writer: v.writer?.english ? { id: v.writer.writerId, english: v.writer.english, gurmukhi: v.writer.unicode ?? null } : null,
        raag: v.raag?.english ? { id: v.raag.raagId, english: v.raag.english, gurmukhi: v.raag.unicode ?? null } : null,
      });
    }
    if (byShabad.size === 0) throw new BaniDbNotFoundError(`Ang ${ang} not found`);
    return { ang, shabads: [...byShabad.values()] };
  }

  private async getJson<T>(path: string, ttlMs = this.cacheTtlMs): Promise<T> {
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

    this.cache.set(path, { expires: Date.now() + ttlMs, value: body });
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
