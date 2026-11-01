import Link from "next/link";
import { BriefingBox } from "@/components/BriefingBox";
import { HistoryBox } from "@/components/HistoryWeek";
import { MiniMap } from "@/components/MapLoader";
import { QuickAsk } from "@/components/QuickAsk";
import { Story } from "@/components/Story";
import { getHistory, getHukamnama, getNews, type NewsItem } from "@/lib/api";
import { inAmerica, NEWS_SECTIONS, notNegative, picker, ranked } from "@/lib/sections";
import { englishOf, openingLines } from "@/lib/shabad";

function Band({ id, section, title, items }: { id: string; section: string; title?: string; items: NewsItem[] }) {
  if (!items.length) return null;
  const { title: name } = NEWS_SECTIONS[section]!;
  return (
    <section className="section-band" aria-labelledby={`band-${id}`}>
      <div className="band-head">
        <h2 id={`band-${id}`}>{title ?? name}</h2>
        <Link href={`/section/${section}`}>More in {name} ›</Link>
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
  const [hukamnama, news, history] = await Promise.all([getHukamnama(), getNews(250), getHistory()]);
  const items = news?.items ?? [];
  // Best stories first: what a Sikh in America wants to read, good news, photos, freshness.
  const take = picker(ranked(items), { perPlace: 2 });
  const sikh = (i: NewsItem) => i.categories.includes("panth") && notNegative(i);
  const photo = (i: NewsItem) => !!i.image;
  const english = (i: NewsItem) => i.language === "en";
  // Takes `count` stories passing the first test, topping up from the next ones.
  const fill = (count: number, ...tests: ((i: NewsItem) => boolean)[]) => {
    const out: NewsItem[] = [];
    for (const test of tests) out.push(...take(count - out.length, test));
    return out;
  };

  const top = (i: NewsItem) => sikh(i) && english(i) && i.interest >= 2;
  const lead = take(1, (i) => top(i) && photo(i))[0] ?? take(1, top)[0] ?? take(1, sikh)[0] ?? take(1, notNegative)[0];
  const rail = fill(3, top, sikh);
  const abroad = (i: NewsItem) => sikh(i) && i.categories.includes("diaspora") && !inAmerica(i);
  const bands = {
    // Local US papers and TV come through Google News without photos, so only the first card needs one.
    america: [...take(1, (i) => sikh(i) && inAmerica(i) && photo(i)), ...take(3, (i) => sikh(i) && inAmerica(i))],
    world: fill(4, (i) => abroad(i) && photo(i), abroad),
    panth: fill(4, (i) => sikh(i) && english(i) && i.interest >= 2 && photo(i), (i) => sikh(i) && i.interest >= 2),
    // Punjab stories that aren't already Sikh news, and only the ones worth a reader abroad's time.
    punjab: take(4, (i) => i.categories.includes("punjab") && !i.categories.includes("panth") && photo(i) && (i.interest >= 2 || i.tone === "uplifting")),
  };
  const latest = take(10, sikh).sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
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

      <Band id="america" section="america" items={bands.america} />
      <Band id="world" section="sikhi" title="Sikhs around the world" items={bands.world} />

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

      {history.length > 0 && (
        <section className="section-band" aria-labelledby="band-history">
          <div className="band-head">
            <h2 id="band-history">This week in Sikh history</h2>
            <Link href="/history">More Sikh history ›</Link>
          </div>
          <HistoryBox events={history} />
        </section>
      )}

      <Band id="panth" section="sikhi" title="The Panth" items={bands.panth} />
      <Band id="punjab" section="punjab" title="From Punjab" items={bands.punjab} />

      {latest.length > 0 && (
        <section className="section-band" aria-labelledby="band-latest">
          <div className="band-head">
            <h2 id="band-latest">Latest Sikh news</h2>
            <Link href="/section/sikhi">All Sikh news ›</Link>
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
