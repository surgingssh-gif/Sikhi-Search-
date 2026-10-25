import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShabadReader } from "@/components/ShabadReader";
import { getBani, slugify } from "@/lib/api";
import { baniTitle } from "@/lib/banis";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const bani = await getBani(Number((await params).id));
  return { title: bani ? baniTitle(bani) : "Bani" };
}

export default async function BaniPage({ params }: Props) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) notFound();
  const bani = await getBani(id);
  if (!bani || bani.verses.length === 0) notFound();

  // The reader takes a shabad-shaped object; a bani is a run of lines from one or more shabads.
  const asShabad = {
    shabadId: 0,
    ang: bani.verses[0]!.ang,
    source: bani.source ?? { id: "G", english: "Gurbani", gurmukhi: null },
    writer: bani.writer,
    raag: bani.raag,
    verses: bani.verses,
    navigation: { previous: null, next: null },
  };

  return (
    <main className="wrap">
      <header className="reader-head">
        <Link href="/gurbani" className="back-link">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Gurbani
        </Link>
        <h1>
          {baniTitle(bani)}{" "}
          <span className="entry-h1-gurmukhi" lang="pa">
            {bani.gurmukhi}
          </span>
        </h1>
        <p className="reader-meta">
          {[bani.source?.english, bani.writer?.english, `${bani.verses.length} lines`].filter(Boolean).join(" · ")}
        </p>
        <div className="reader-actions">
          <Link className="btn-ghost" href={`/library/${slugify(baniTitle(bani))}?topic=${encodeURIComponent(baniTitle(bani))}`}>
            About this bani
          </Link>
        </div>
      </header>
      <ShabadReader shabad={asShabad} highlightVerseId={null} />
      <p className="reader-attrib">Gurbani text, translations and transliterations from BaniDB by Khalis Foundation.</p>
    </main>
  );
}
