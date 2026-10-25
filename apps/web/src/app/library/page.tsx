import type { Metadata } from "next";
import Link from "next/link";
import { LibrarySearch } from "@/components/LibrarySearch";
import { getLibraryIndex, slugify } from "@/lib/api";
import { FEATURED_TOPICS } from "@/lib/featured";

export const metadata: Metadata = { title: "Library" };

const KIND_LABEL: Record<string, string> = {
  bani: "Bani",
  event: "Event",
  person: "Person",
  place: "Place",
  concept: "Concept",
  practice: "Practice",
  institution: "Institution",
  other: "Topic",
};

export default async function LibraryHome() {
  const entries = await getLibraryIndex();
  const known = [...new Set([...FEATURED_TOPICS.flatMap((g) => g.topics), ...entries.map((e) => e.title)])];

  return (
    <main className="wrap">
      <section className="hero hero-left">
        <p className="eyebrow">Library</p>
        <h1>Look anything up</h1>
        <p>Banis, sakhis, shaheeds, gurdwaras and ideas. Each entry is researched from sources you can open and check.</p>
      </section>

      <LibrarySearch known={known} />

      {entries.length > 0 && (
        <section className="suggest" aria-label="Recently added">
          <p className="section-title">Recently added</p>
          <ul className="entry-list">
            {entries.slice(0, 6).map((e) => (
              <li key={e.slug}>
                <Link href={`/library/${e.slug}`}>
                  <span className="entry-kind">{KIND_LABEL[e.kind] ?? "Topic"}</span>
                  <span className="entry-title">
                    {e.title}
                    {e.titleGurmukhi && (
                      <span className="entry-gurmukhi" lang="pa">
                        {e.titleGurmukhi}
                      </span>
                    )}
                  </span>
                  <span className="entry-summary">{e.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {FEATURED_TOPICS.map((g) => (
        <section key={g.group} className="suggest" aria-label={g.group}>
          <p className="section-title">{g.group}</p>
          <ul className="topic-chips">
            {g.topics.map((topic) => (
              <li key={topic}>
                <Link href={`/library/${slugify(topic)}?topic=${encodeURIComponent(topic)}`}>{topic}</Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="discuss-tip">
        Entries are written by AI from the sources listed on each page and haven&apos;t been reviewed by a scholar yet. Check the sources
        for anything important.
      </p>
    </main>
  );
}
