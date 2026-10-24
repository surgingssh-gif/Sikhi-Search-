import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DiscussApp } from "@/components/DiscussApp";
import { getShabad } from "@/lib/api";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const shabad = await getShabad(Number((await params).id)).catch(() => null);
  return { title: shabad ? `Discuss Ang ${shabad.ang} · Ask Sikhi` : "Discuss Gurbani · Ask Sikhi" };
}

export default async function DiscussShabadPage({ params }: Props) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) notFound();
  const shabad = await getShabad(id);
  if (!shabad) notFound();
  return <DiscussApp shabad={shabad} />;
}
