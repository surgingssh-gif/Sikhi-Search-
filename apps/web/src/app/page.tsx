import Link from "next/link";
import { NewsList } from "@/components/NewsList";
import { QuickAsk } from "@/components/QuickAsk";
import { getHukamnama, getNews, slugify } from "@/lib/api";
import { FEATURED_TOPICS } from "@/lib/featured";
import { englishOf, openingLines } from "@/lib/shabad";

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function Arrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function Today() {
  const [hukamnama, news] = await Promise.all([getHukamnama(), getNews(40)]);
  const today = hukamnama?.shabads[0];
  // Panthic stories first, then Punjab.
  const items = news?.items ?? [];
  const headlines = [...items.filter((i) => i.categories.includes("panth")), ...items.filter((i) => !i.categories.includes("panth"))].slice(0, 6);
  const topics = FEATURED_TOPICS.flatMap((g) => g.topics.slice(0, 2)).slice(0, 8);

  return (
    <main className="wrap">
      <section className="today-head">
        <p className="greeting" lang="pa">
          ਵਾਹਿਗੁਰੂ ਜੀ ਕਾ ਖ਼ਾਲਸਾ, ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫ਼ਤਹਿ
        </p>
        {hukamnama && <p className="today-date">{formatDate(hukamnama.date)}</p>}
      </section>

      {today ? (
        <section className="feature-card" aria-label="Today's Hukamnama">
          <p className="feature-kicker">Today&apos;s Hukamnama from Sri Darbar Sahib</p>
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
              Vichaar on today&apos;s Hukamnama
            </Link>
            <Link className="btn-ghost" href={`/shabad/${today.shabadId}`}>
              Read in full
            </Link>
          </div>
        </section>
      ) : (
        <p className="empty">Today&apos;s Hukamnama couldn&apos;t be loaded right now.</p>
      )}

      <section className="today-block" aria-label="Vichaar">
        <div className="block-head">
          <h2>Vichaar</h2>
          <Link href="/vichaar" className="block-link">
            Open <Arrow />
          </Link>
        </div>
        <QuickAsk />
      </section>

      <section className="today-block" aria-label="News">
        <div className="block-head">
          <h2>From the Panth and Punjab</h2>
          <Link href="/news" className="block-link">
            All news <Arrow />
          </Link>
        </div>
        {headlines.length ? <NewsList items={headlines} compact /> : <p className="empty">News couldn&apos;t be loaded right now.</p>}
      </section>

      <section className="today-block" aria-label="Library">
        <div className="block-head">
          <h2>From the Library</h2>
          <Link href="/library" className="block-link">
            Browse <Arrow />
          </Link>
        </div>
        <ul className="topic-chips">
          {topics.map((topic) => (
            <li key={topic}>
              <Link href={`/library/${slugify(topic)}?topic=${encodeURIComponent(topic)}`}>{topic}</Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
