import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Edition, EditionSummary } from "@ask-sikhi/core";

/**
 * The magazine's issues, as the news job writes them: one file per day,
 * `latest.json` and `index.json` (see scripts/build-news.ts).
 */
export class FileEditionStore {
  constructor(private readonly dir: string) {}

  private async read<T>(name: string): Promise<T | null> {
    try {
      return JSON.parse(await readFile(path.join(this.dir, name), "utf8")) as T;
    } catch {
      return null;
    }
  }

  latest() {
    return this.read<Edition>("latest.json");
  }

  get(date: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(date) ? this.read<Edition>(`${date}.json`) : Promise.resolve(null);
  }

  async list() {
    return (await this.read<EditionSummary[]>("index.json")) ?? [];
  }
}
