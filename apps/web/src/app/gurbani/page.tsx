import type { Metadata } from "next";
import Link from "next/link";
import { AngPicker } from "@/components/AngPicker";
import { getBanis, getHukamnama } from "@/lib/api";
import { NITNEM, baniTitle } from "@/lib/banis";
import { englishOf, openingLines } from "@/lib/shabad";

export const metadata: Metadata = { title: "Gurbani" };

export default async function GurbaniHub() {
  const [hukamnama, banis] = await Promise.all([getHukamnama(), getBanis()]);
  const today = hukamnama?.shabads[0];
  const byId = new Map(banis.map((b) => [b.baniId, b]));
  const nitnem = NITNEM.map((id) => byId.get(id)).filter((b) => b !== undefined);
  const others = banis.filter((b) => !NITNEM.includes(b.baniId));

  return (
    <main className="wrap">
      <section className="hero hero-left">
        <p className="eyebrow">Gurbani</p>
        <h1>Read, then sit with it</h1>
        <p>Read any bani or shabad with translation and transliteration, then open a Vichaar on it line by line.</p>
      </section>

      {today && (
        <section className="feature-card" aria-label="Today's Hukamnama">
          <p className="feature-kicker">Today&apos;s Hukamnama</p>
          <p className="feature-meta">
            Ang {today.ang}
            {today.writer && <> · {today.writer.english}</>}
            {today.raag && <> · {today.raag.english}</>}
          </p>
          <div className="feature-lines">
            {openingLines(today.verses, 1).map((v) => (
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
              Vichaar on it
            </Link>
            <Link className="btn-ghost" href={`/shabad/${today.shabadId}`}>
              Read in full
            </Link>
          </div>
        </section>
      )}

      <section className="suggest" aria-label="Nitnem">
        <p className="section-title">Nitnem</p>
        <ul className="bani-grid">
          {nitnem.map((b) => (
            <li key={b.baniId}>
              <Link href={`/gurbani/bani/${b.baniId}`}>
                <span className="bani-gurmukhi" lang="pa">
                  {b.gurmukhi}
                </span>
                <span className="bani-name">{baniTitle(b)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="suggest" aria-label="Find a shabad by Ang">
        <p className="section-title">Find a shabad by Ang</p>
        <AngPicker />
      </section>

      {others.length > 0 && (
        <section className="suggest" aria-label="All banis">
          <details className="all-banis">
            <summary>All banis ({banis.length})</summary>
            <ul className="bani-list">
              {others.map((b) => (
                <li key={b.baniId}>
                  <Link href={`/gurbani/bani/${b.baniId}`}>
                    <span lang="pa">{b.gurmukhi}</span>
                    <span className="bani-name">{baniTitle(b)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}
    </main>
  );
}
