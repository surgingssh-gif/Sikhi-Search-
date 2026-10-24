import type { Metadata } from "next";
import Link from "next/link";
import { AngPicker } from "@/components/AngPicker";
import { getHukamnama } from "@/lib/api";
import { englishOf, openingLines } from "@/lib/shabad";

export const metadata: Metadata = { title: "Discuss Gurbani" };

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export default async function DiscussHome() {
  const hukamnama = await getHukamnama();
  const today = hukamnama?.shabads[0];

  return (
    <main className="wrap">
      <section className="hero">
        <p className="eyebrow">Discuss Gurbani</p>
        <h1>Talk through a shabad</h1>
        <p>Choose a shabad and talk it through: what it means, what the Rahao line says, and how it speaks to your life.</p>
      </section>

      {today ? (
        <section className="feature-card" aria-label="Today's Hukamnama">
          <p className="feature-kicker">
            Today&apos;s Hukamnama · {formatDate(hukamnama.date)}
          </p>
          <p className="feature-meta">
            Ang {today.ang}
            {today.writer && <> · {today.writer.english}</>}
            {today.raag && <> · {today.raag.english}</>}
          </p>
          <div className="feature-lines">
            {openingLines(today.verses, 2).map((v) => (
              <div key={v.verseId}>
                <p className="gurmukhi" lang="pa">
                  {v.gurmukhi}
                </p>
                <p className="translation">{englishOf(v)}</p>
              </div>
            ))}
          </div>
          <div className="feature-actions">
            <Link className="btn-primary" href={`/discuss/${today.shabadId}`}>
              Discuss this shabad
            </Link>
            <Link className="btn-ghost" href={`/shabad/${today.shabadId}`}>
              Read it first
            </Link>
          </div>
        </section>
      ) : (
        <p className="empty">Today&apos;s Hukamnama couldn&apos;t be loaded right now. You can still find a shabad by Ang below.</p>
      )}

      <section className="suggest" aria-label="Find a shabad by Ang">
        <p className="section-title">Or find a shabad by Ang</p>
        <AngPicker />
      </section>

      <p className="discuss-tip">
        Tip: you can also start a discussion from any Gurbani card in an answer, or from the shabad reader.
      </p>
    </main>
  );
}
