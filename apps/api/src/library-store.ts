import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { LibraryEntry } from "@ask-sikhi/core";

export interface LibraryIndexItem {
  slug: string;
  title: string;
  titleGurmukhi: string | null;
  kind: LibraryEntry["kind"];
  summary: string;
  generatedAt: string;
  reviewed: boolean;
}

export interface LibraryStoreLike {
  get(slug: string): Promise<LibraryEntry | null>;
  put(entry: LibraryEntry, aliases?: string[]): Promise<void>;
  list(): Promise<LibraryIndexItem[]>;
}

const SAFE_SLUG = /^[a-z0-9-]{1,100}$/;

/**
 * Library entries as JSON files: one file per entry, plus small alias files so
 * the topic someone typed ("zafarnama letter") finds the entry ("zafarnama").
 * Fine for one server; move to a database before running several.
 */
export class FileLibraryStore implements LibraryStoreLike {
  constructor(private readonly dir: string) {}

  private file(slug: string): string {
    if (!SAFE_SLUG.test(slug)) throw new Error(`Unsafe slug: ${slug}`);
    return path.join(this.dir, `${slug}.json`);
  }

  async get(slug: string): Promise<LibraryEntry | null> {
    if (!SAFE_SLUG.test(slug)) return null;
    try {
      const data = JSON.parse(await readFile(this.file(slug), "utf8")) as LibraryEntry | { aliasOf: string };
      if ("aliasOf" in data) return data.aliasOf === slug ? null : this.get(data.aliasOf);
      return data;
    } catch {
      return null;
    }
  }

  async put(entry: LibraryEntry, aliases: string[] = []): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.file(entry.slug), JSON.stringify(entry, null, 2));
    for (const a of new Set(aliases)) {
      if (a !== entry.slug && SAFE_SLUG.test(a)) await writeFile(this.file(a), JSON.stringify({ aliasOf: entry.slug }));
    }
  }

  async list(): Promise<LibraryIndexItem[]> {
    let names: string[];
    try {
      names = (await readdir(this.dir)).filter((n) => n.endsWith(".json"));
    } catch {
      return [];
    }
    const items: LibraryIndexItem[] = [];
    for (const n of names) {
      try {
        const data = JSON.parse(await readFile(path.join(this.dir, n), "utf8")) as LibraryEntry | { aliasOf: string };
        if ("aliasOf" in data) continue;
        const { slug, title, titleGurmukhi, kind, summary, generatedAt, reviewed } = data;
        items.push({ slug, title, titleGurmukhi, kind, summary, generatedAt, reviewed });
      } catch {
        // Skip unreadable files.
      }
    }
    return items.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  }
}

/** In-memory store for tests. */
export class MemoryLibraryStore implements LibraryStoreLike {
  private entries = new Map<string, LibraryEntry>();
  private aliases = new Map<string, string>();
  async get(slug: string) {
    return this.entries.get(this.aliases.get(slug) ?? slug) ?? null;
  }
  async put(entry: LibraryEntry, aliases: string[] = []) {
    this.entries.set(entry.slug, entry);
    for (const a of aliases) if (a !== entry.slug) this.aliases.set(a, entry.slug);
  }
  async list() {
    return [...this.entries.values()].map(({ slug, title, titleGurmukhi, kind, summary, generatedAt, reviewed }) => ({
      slug,
      title,
      titleGurmukhi,
      kind,
      summary,
      generatedAt,
      reviewed,
    }));
  }
}
