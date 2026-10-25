import type { Metadata } from "next";
import { LibraryEntryView } from "@/components/LibraryEntryView";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ topic?: string }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const topic = (await searchParams).topic ?? (await params).slug.replace(/-/g, " ");
  return { title: topic };
}

export default async function LibraryEntryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const topic = (await searchParams).topic?.slice(0, 120) ?? slug.replace(/-/g, " ");
  return <LibraryEntryView key={slug} slug={slug} topic={topic} />;
}
