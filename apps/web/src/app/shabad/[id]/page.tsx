import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShabadReader } from "@/components/ShabadReader";
import { getShabad } from "@/lib/api";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ verse?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const shabad = await getShabad(Number((await params).id)).catch(() => null);
  return { title: shabad ? `Ang ${shabad.ang} · ${shabad.writer?.english ?? shabad.source.english} · Ask Sikhi` : "Shabad · Ask Sikhi" };
}

export default async function ShabadPage({ params, searchParams }: Props) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) notFound();
  const shabad = await getShabad(id);
  if (!shabad) notFound();
  const verse = Number((await searchParams).verse) || null;

  return (
    <main className="wrap">
      <header className="reader-head">
        <Link href="/" className="back-link">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </Link>
        <h1>
          Ang {shabad.ang}
          {shabad.writer && <> · {shabad.writer.english}</>}
        </h1>
        <p className="reader-meta">
          {shabad.source.english}
          {shabad.raag && <> · {shabad.raag.english}</>} · Shabad {shabad.shabadId}
        </p>
        <p style={{ margin: "14px 0 0" }}>
          <Link className="btn-primary" href={`/discuss/${shabad.shabadId}`}>
            Discuss this shabad
          </Link>
        </p>
      </header>
      <ShabadReader shabad={shabad} highlightVerseId={verse} />
      <nav className="reader-nav" aria-label="Neighbouring shabads">
        {shabad.navigation.previous ? <Link href={`/shabad/${shabad.navigation.previous}`}>← Previous shabad</Link> : <span />}
        {shabad.navigation.next ? <Link href={`/shabad/${shabad.navigation.next}`}>Next shabad →</Link> : <span />}
      </nav>
      <p className="reader-attrib">Gurbani text, translations and transliterations from BaniDB by Khalis Foundation.</p>
    </main>
  );
}
