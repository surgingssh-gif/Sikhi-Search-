import Link from "next/link";
import { BriefingBox } from "@/components/BriefingBox";
import { MiniMap } from "@/components/MapLoader";
import { QuickAsk } from "@/components/QuickAsk";
import { Story } from "@/components/Story";
import { getHukamnama, getNews, type NewsItem } from "@/lib/api";
import { NEWS_SECTIONS, picker } from "@/lib/sections";
import { englishOf, openingLines } from "@/lib/shabad";

function Band({ id, items }: { id: string; items: NewsItem[] }) {
  if (!items.length) return null;
  const section = NEWS_SECTIONS[id]!;
  return (
    <section className="section-band" aria-labelledby={`band-${id}`}>
      <div className="band-head">
        <h2 id={`band-${id}`}>{section.title}</h2>
        <Link href={`/section/${id}`}>More in {section.title} ›</Link>
      </div>
      <div className="card-grid">
        {items.map((item, n) => (
          <Story key={item.id} item={item} className={n === 0 ? "story-first" : ""} />
        ))}
      </div>
    </section>
  );
}

export default async function FrontPage() {
  const [hukamnama, news] = await Promise.all([getHukamnama(), getNews(200)]);
  const items = news?.items ?? [];
  const take = picker(items);
  const panthic = (i: NewsItem) => i.categories.includes("panth");

  // The lead is the newest Panthic story with a photo; the rail is the next few.
  // English stories take the top slots; Punjabi ones run in the sections below.
  const top = (i: NewsItem) => !!i.image && i.language === "en";
  const lead = take(1, (i) => panthic(i) && top(i))[0] ?? take(1, top)[0] ?? take(1)[0];
  const rail = take(3, top);
  const bands = {
    panth: take(4, (i) => panthic(i) && !!i.image),
    punjab: take(4, (i) => i.categories.includes("punjab") && !!i.image),
    diaspora: take(4, (i) => i.categories.includes("diaspora") && !!i.image),
  };
  const latest = take(10);
  const today = hukamnama?.shabads[0];

  if (!lead) {
    return (
      <main className="wrap wrap-wide front">
        <p className="empty">The news couldn&apos;t be loaded right now. Please try again shortly.</p>
      </main>
    );
  }

  return (
    <main className="wrap wrap-wide front">
      <div className="front-top">
        <div>
          <Story item={lead} variant="lead" snippet />
          <BriefingBox />
        </div>
        <div className="front-rail">
          {rail.map((item, n) => (
            <Story key={item.id} item={item} variant={n === 0 ? "medium" : "row"} />
          ))}
        </div>
      </div>

      <Band id="panth" items={bands.panth} />

      <section className="section-band modules" aria-label="Map, Hukamnama and Vichaar">
        <div className="module">
          <h3>The story map</h3>
          <MiniMap items={items} />
          <Link className="module-link" href="/map">
            Explore the news by place ›
          </Link>
        </div>
        <div className="module">
          <h3>Today&apos;s Hukamnama</h3>
          {today ? (
            <>
              {openingLines(today.verses, 1).map((v) => (
                <div key={v.verseId}>
                  <p className="gurmukhi" lang="pa">
                    {v.gurmukhi}
                  </p>
                  <p className="translation">{englishOf(v)}</p>
                </div>
              ))}
              <p className="story-meta">
                Sri Darbar Sahib · Ang {today.ang}
                {today.writer && <> · {today.writer.english}</>}
              </p>
              <p>
                <Link className="module-link" href={`/discuss/${today.shabadId}`}>
                  Vichaar on today&apos;s Hukamnama ›
                </Link>
              </p>
            </>
          ) : (
            <p className="story-meta">Today&apos;s Hukamnama couldn&apos;t be loaded.</p>
          )}
        </div>
        <div className="module">
          <h3>Vichaar</h3>
          <p className="story-snippet">Ask about Gurbani, history or living as a Sikh. Answers cite Gurbani from BaniDB.</p>
          <QuickAsk />
          <p>
            <Link className="module-link" href="/library">
              Or browse the Library ›
            </Link>
          </p>
        </div>
      </section>

      <Band id="punjab" items={bands.punjab} />
      <Band id="diaspora" items={bands.diaspora} />

      {latest.length > 0 && (
        <section className="section-band" aria-labelledby="band-latest">
          <div className="band-head">
            <h2 id="band-latest">Latest</h2>
            <Link href="/section/latest">All stories ›</Link>
          </div>
          <ul className="latest-list">
            {latest.map((item) => (
              <li key={item.id}>
                <Story item={item} variant="text" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
