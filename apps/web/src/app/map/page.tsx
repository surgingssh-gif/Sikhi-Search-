import type { Metadata } from "next";
import { NewsMap } from "@/components/MapLoader";
import { getNews } from "@/lib/api";

export const metadata: Metadata = { title: "Story map", description: "The Sikh world's news, pinned where it happened." };

export default async function MapPage({ searchParams }: { searchParams: Promise<{ place?: string }> }) {
  const [{ place }, news] = await Promise.all([searchParams, getNews(200)]);
  if (!news) return <p className="empty wrap">The map couldn&apos;t be loaded right now. Please try again shortly.</p>;
  return <NewsMap items={news.items} initialPlace={place} />;
}
