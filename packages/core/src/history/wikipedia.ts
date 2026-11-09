/**
 * Sikh history from Wikipedia: search, article text and short summaries for
 * curated collections. Wikipedia text is CC BY-SA 4.0, so everything shown
 * carries the article's link and the licence.
 */

export interface WikiSummary {
  title: string;
  /** Wikipedia's one-line description, e.g. "Sikh military commander (1670–1716)". */
  description: string;
  /** The opening sentences, plain text. */
  extract: string;
  thumbnail: string | null;
  url: string;
}

export interface WikiSection {
  heading: string | null;
  /** 2 for a section, 3 for a subsection. */
  level: number;
  paragraphs: string[];
}

export interface WikiArticle {
  title: string;
  description: string;
  image: string | null;
  sections: WikiSection[];
  url: string;
  /** When the article was last edited, ISO. */
  lastEdited: string | null;
}

export interface WikiCollection {
  id: string;
  title: string;
  blurb: string;
  titles: string[];
}

/** Collections on the History tab. Titles are Wikipedia's canonical ones, checked against the live API. */
export const HISTORY_COLLECTIONS: WikiCollection[] = [
  {
    id: "gurus",
    title: "The Ten Gurus",
    blurb: "From Guru Nanak Dev Ji to Guru Gobind Singh Ji, and Sri Guru Granth Sahib Ji.",
    titles: [
      "Guru Nanak",
      "Guru Angad",
      "Guru Amar Das",
      "Guru Ram Das",
      "Guru Arjan",
      "Guru Hargobind",
      "Guru Har Rai",
      "Guru Har Krishan",
      "Guru Tegh Bahadur",
      "Guru Gobind Singh",
      "Guru Granth Sahib",
    ],
  },
  {
    id: "america",
    title: "Sikhs in North America",
    blurb: "From the first gurdwara in Stockton in 1912 to the first Asian American in Congress.",
    titles: [
      "Sikhism in the United States",
      "Gurdwara Sahib of Stockton",
      "Ghadar movement",
      "Bhagat Singh Thind",
      "Dalip Singh Saund",
      "Punjabi Mexican Americans",
      "Komagata Maru incident",
    ],
  },
  {
    id: "places",
    title: "Takhts and historic gurdwaras",
    blurb: "The five Takhts and the places where Sikh history happened.",
    titles: [
      "Golden Temple",
      "Akal Takht",
      "Takht Kesgarh Sahib",
      "Takht Sri Damdama Sahib",
      "Takht Sri Patna Sahib",
      "Hazur Sahib",
      "Gurdwara Janam Asthan",
      "Gurdwara Darbar Sahib Kartarpur",
      "Gurdwara Sis Ganj Sahib",
      "Gurdwara Hemkund Sahib",
      "Anandpur Sahib",
    ],
  },
  {
    id: "people",
    title: "Warriors, martyrs and leaders",
    blurb: "The Sikhs who gave everything for the Panth, and those who led it.",
    titles: [
      "Mata Gujri",
      "Mai Bhago",
      "Bhai Mati Das",
      "Bhai Kanhaiya",
      "Banda Singh Bahadur",
      "Bhai Mani Singh",
      "Baba Deep Singh",
      "Jassa Singh Ahluwalia",
      "Ranjit Singh",
      "Hari Singh Nalwa",
      "Akali Phula Singh",
    ],
  },
  {
    id: "turning-points",
    title: "Turning points",
    blurb: "The moments that shaped the Panth, from the Khalsa to 1984.",
    titles: [
      "Khalsa",
      "Vaisakhi",
      "Battle of Chamkaur",
      "Vadda Ghallughara",
      "Sikh Confederacy",
      "Sikh Empire",
      "First Anglo-Sikh War",
      "Second Anglo-Sikh War",
      "Battle of Saragarhi",
      "Singh Sabha movement",
      "Akali movement",
      "Jallianwala Bagh massacre",
      "Partition of India",
      "Operation Blue Star",
      "1984 anti-Sikh riots",
    ],
  },
];

export const WIKIPEDIA_ATTRIBUTION = "From Wikipedia, the free encyclopedia. Text available under CC BY-SA 4.0.";

/** Sections of an article that are lists of sources and links, not history. */
const SKIP_SECTIONS = /^(see also|references|notes|footnotes|citations|sources|bibliography|further reading|external links|gallery|works cited|explanatory notes|literature)$/i;

/** Plain-text article as TextExtracts gives it ("== Heading ==" lines), cut into sections. */
export function parseSections(text: string): WikiSection[] {
  const sections: WikiSection[] = [{ heading: null, level: 1, paragraphs: [] }];
  for (const line of text.split("\n")) {
    const heading = line.match(/^(={2,6})\s*(.+?)\s*\1\s*$/);
    if (heading) {
      sections.push({ heading: heading[2]!, level: heading[1]!.length, paragraphs: [] });
      continue;
    }
    const t = line.trim();
    if (t) sections[sections.length - 1]!.paragraphs.push(t);
  }
  // Drop source lists, and everything nested under them.
  const out: WikiSection[] = [];
  let skipping = 0;
  for (const s of sections) {
    if (skipping && s.level > skipping) continue;
    skipping = 0;
    if (s.heading && SKIP_SECTIONS.test(s.heading)) {
      skipping = s.level;
      continue;
    }
    out.push(s);
  }
  // Keep headings with no text of their own when a subsection follows.
  return out.filter((s, i) => s.paragraphs.length > 0 || (out[i + 1] && out[i + 1]!.level > s.level));
}

const articleUrl = (title: string) => `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;

interface RawPage {
  title: string;
  missing?: boolean;
  index?: number;
  description?: string;
  extract?: string;
  thumbnail?: { source: string };
  original?: { source: string };
  touched?: string;
}

interface RawQuery {
  query?: { pages?: RawPage[]; redirects?: { from: string; to: string }[] };
}

function toSummary(p: RawPage): WikiSummary {
  return { title: p.title, description: p.description ?? "", extract: p.extract ?? "", thumbnail: p.thumbnail?.source ?? null, url: articleUrl(p.title) };
}

export interface WikipediaClientOptions {
  fetch?: typeof globalThis.fetch;
  /** Wikipedia asks every client to identify itself. */
  userAgent?: string;
  cacheTtlMs?: number;
  maxCacheEntries?: number;
}

export class WikipediaError extends Error {}

export class WikipediaClient {
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly userAgent: string;
  private readonly ttl: number;
  private readonly maxEntries: number;
  private readonly cache = new Map<string, { expires: number; value: unknown }>();

  constructor(options: WikipediaClientOptions = {}) {
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.userAgent = options.userAgent ?? "Sikhe/0.1 (Sikh news, Gurbani and history app)";
    this.ttl = options.cacheTtlMs ?? 24 * 60 * 60 * 1000;
    this.maxEntries = options.maxCacheEntries ?? 500;
  }

  /**
   * Sikh history articles matching a query. "Sikh" is added to the search
   * unless the query already names the faith, so "Saragarhi" or "Stockton"
   * find the Sikh side of things.
   */
  async search(query: string, limit = 20): Promise<WikiSummary[]> {
    const q = query.trim();
    if (!q) return [];
    const term = /\bsikh/i.test(q) ? q : `${q} sikh`;
    const data = await this.get<RawQuery>({
      generator: "search",
      gsrsearch: term,
      gsrlimit: String(limit),
      prop: "pageimages|description|extracts",
      exintro: "1",
      explaintext: "1",
      exsentences: "2",
      exlimit: String(limit),
      piprop: "thumbnail",
      pithumbsize: "240",
    });
    return (data.query?.pages ?? [])
      .filter((p) => !p.missing)
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .map(toSummary);
  }

  /** Short summaries of up to 50 articles, in the order asked for. Missing titles are left out. */
  async summaries(titles: string[]): Promise<WikiSummary[]> {
    if (!titles.length) return [];
    const data = await this.get<RawQuery>({
      titles: titles.slice(0, 50).join("|"),
      redirects: "1",
      prop: "pageimages|description|extracts",
      exintro: "1",
      explaintext: "1",
      exsentences: "2",
      exlimit: "50",
      piprop: "thumbnail",
      pithumbsize: "240",
    });
    const redirects = new Map((data.query?.redirects ?? []).map((r) => [r.from, r.to]));
    const byTitle = new Map((data.query?.pages ?? []).filter((p) => !p.missing).map((p) => [p.title, p]));
    return titles.map((t) => byTitle.get(redirects.get(t) ?? t)).filter((p) => p !== undefined).map(toSummary);
  }

  /** A whole article as plain text in sections, or null if there is no such article. */
  async article(title: string): Promise<WikiArticle | null> {
    const data = await this.get<RawQuery>({
      titles: title,
      redirects: "1",
      prop: "extracts|pageimages|description|info",
      explaintext: "1",
      exsectionformat: "wiki",
      piprop: "original|thumbnail",
      pithumbsize: "1000",
    });
    const page = data.query?.pages?.[0];
    if (!page || page.missing) return null;
    return {
      title: page.title,
      description: page.description ?? "",
      image: page.thumbnail?.source ?? page.original?.source ?? null,
      sections: parseSections(page.extract ?? ""),
      url: articleUrl(page.title),
      lastEdited: page.touched ?? null,
    };
  }

  private async get<T>(params: Record<string, string>): Promise<T> {
    const search = new URLSearchParams({ action: "query", format: "json", formatversion: "2", ...params });
    const url = `https://en.wikipedia.org/w/api.php?${search}`;
    const hit = this.cache.get(url);
    if (hit && hit.expires > Date.now()) return hit.value as T;
    let res: Response;
    try {
      res = await this.fetchImpl(url, { headers: { "user-agent": this.userAgent, "api-user-agent": this.userAgent } });
    } catch (err) {
      throw new WikipediaError(`Wikipedia could not be reached: ${(err as Error).message}`);
    }
    if (!res.ok) throw new WikipediaError(`Wikipedia returned ${res.status}`);
    const value = (await res.json()) as T;
    this.cache.set(url, { expires: Date.now() + this.ttl, value });
    if (this.cache.size > this.maxEntries) this.cache.delete(this.cache.keys().next().value!);
    return value;
  }
}
