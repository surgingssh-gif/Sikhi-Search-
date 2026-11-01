import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Story } from "@/components/Story";
import { getNews } from "@/lib/api";
import { MOVED_SECTIONS, NEWS_SECTIONS, notNegative, photoFirst, ranked } from "@/lib/sections";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: NEWS_SECTIONS[id]?.title ?? "Section" };
}

export default async function SectionPage({ params }: Props) {
  const { id } = await params;
  if (MOVED_SECTIONS[id]) redirect(`/section/${MOVED_SECTIONS[id]}`);
  const section = NEWS_SECTIONS[id];
  if (!section) notFound();
  const news = await getNews(250, section.category);
  const all = (news?.items ?? []).filter(section.filter ?? (() => true));
  // Sikh sections leave out crime and violence unless it matters a great deal to Sikhs abroad
  // (a hate crime in America, say); the Punjab and Latest pages show everything.
  const items = section.category === "panth" ? all.filter((i) => notNegative(i) || i.interest >= 3) : all;
  // Lead with the best good-news story that has a photo, then the next best; the list below stays newest first.
  const best = ranked(items.filter(notNegative));
  const lead = photoFirst(best)[0] ?? items[0];
  const rail = best.filter((i) => i !== lead).slice(0, 3);
  const rest = items.filter((i) => i !== lead && !rail.includes(i));

  return (
    <main className="wrap wrap-wide">
      <header className="section-head">
        <h1>{section.title}</h1>
        <p>{section.blurb}</p>
      </header>
      {lead ? (
        <>
          <div className="front-top">
            <div>
              <Story item={lead} variant="lead" snippet />
            </div>
            <div className="front-rail">
              {rail.map((item) => (
                <Story key={item.id} item={item} variant="text" snippet />
              ))}
            </div>
          </div>
          <ul className="section-list">
            {rest.map((item) => (
              <li key={item.id}>
                <Story item={item} variant="row" snippet />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="empty">No stories here right now. Please check back soon.</p>
      )}
      <p className="discuss-tip">
        Headlines come from Sikh outlets (Sikh Coalition, The Sikh Foundation, Sikh Press Association, Sikh24, Sikh Siyasat), from local and
        national news found through Google News, and from Punjab&apos;s papers and BBC ਪੰਜਾਬੀ. Stories open on the publisher&apos;s site.
        Inclusion isn&apos;t endorsement.
      </p>
    </main>
  );
}
