import type { Metadata } from "next";
import { AskApp } from "@/components/AskApp";

export const metadata: Metadata = { title: "Vichaar" };

type Props = { searchParams: Promise<{ q?: string }> };

export default async function VichaarPage({ searchParams }: Props) {
  const q = (await searchParams).q?.slice(0, 500);
  // Keyed by the question so a new ?q= starts a fresh conversation.
  return <AskApp key={q ?? ""} {...(q ? { initialQuestion: q } : {})} />;
}
