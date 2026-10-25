import type { Metadata } from "next";
import { NewsView } from "@/components/NewsView";
import { getNews } from "@/lib/api";

export const metadata: Metadata = { title: "News" };

export default async function NewsPage() {
  const news = await getNews(200);
  return (
    <main className="wrap">
      <section className="hero hero-left">
        <p className="eyebrow">News</p>
        <h1>The Panth and Punjab</h1>
        <p>Headlines from Sikh and Punjab outlets, updated through the day. Each story opens on its publisher&apos;s site.</p>
      </section>
      {news ? <NewsView items={news.items} /> : <p className="empty">News couldn&apos;t be loaded right now. Please try again shortly.</p>}
      <p className="discuss-tip">
        Sources: Sikh Siyasat, Sikh Press Association, Sikh Coalition, The Hindu, Times of India, Indian Express, Hindustan Times and BBC
        ਪੰਜਾਬੀ. Inclusion isn&apos;t endorsement.
      </p>
    </main>
  );
}
