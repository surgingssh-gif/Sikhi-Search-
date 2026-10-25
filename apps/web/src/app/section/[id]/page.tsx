import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Story } from "@/components/Story";
import { getNews } from "@/lib/api";
import { NEWS_SECTIONS, photoFirst } from "@/lib/sections";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: NEWS_SECTIONS[id]?.title ?? "Section" };
}

export default async function SectionPage({ params }: Props) {
  const { id } = await params;
  const section = NEWS_SECTIONS[id];
  if (!section) notFound();
  const news = await getNews(200, section.category);
  const items = news?.items ?? [];
  // Lead with the newest story that has a photo; the rest stay newest first.
  const lead = photoFirst(items)[0];
  const rest = items.filter((i) => i !== lead);

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
              {rest.slice(0, 3).map((item) => (
                <Story key={item.id} item={item} variant="text" snippet />
              ))}
            </div>
          </div>
          <ul className="section-list">
            {rest.slice(3).map((item) => (
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
        Headlines and photos come from Sikh Siyasat, Sikh Press Association, Sikh Coalition, The Hindu, Times of India, Indian Express,
        Hindustan Times and BBC ਪੰਜਾਬੀ, and open on the publisher&apos;s site. Inclusion isn&apos;t endorsement.
      </p>
    </main>
  );
}
