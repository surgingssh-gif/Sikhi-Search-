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
          ← Back to Ask Sikhi
        </Link>
        <p className="kicker">
          {shabad.source.english} · Ang {shabad.ang}
        </p>
        <h1 className="headline">{shabad.writer?.english ?? shabad.source.english}</h1>
        <p className="byline">
          {shabad.raag && (
            <>
              <strong>{shabad.raag.english}</strong> ·{" "}
            </>
          )}
          Shabad {shabad.shabadId} · Gurbani from BaniDB by Khalis Foundation
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
