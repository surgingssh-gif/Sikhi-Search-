"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { slugify } from "@/lib/api";

/** Search the Library. Known topics are suggested as you type; anything else is researched on demand. */
export function LibrarySearch({ known }: { known: string[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    return known.filter((k) => k.toLowerCase().includes(needle)).slice(0, 6);
  }, [q, known]);

  function open(topic: string) {
    const t = topic.trim();
    if (t.length >= 2) router.push(`/library/${slugify(t)}?topic=${encodeURIComponent(t)}`);
  }

  return (
    <div className="lib-search">
      <form
        className="quick-ask"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          open(q);
        }}
      >
        <label htmlFor="lib-q" className="sr-only">
          Search the Library
        </label>
        <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          id="lib-q"
          value={q}
          maxLength={120}
          autoComplete="off"
          placeholder="A bani, event, person, place or idea…"
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="send" type="submit" disabled={q.trim().length < 2} aria-label="Search">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>
      {q.trim().length >= 2 && (
        <ul className="lib-suggest">
          {matches.map((m) => (
            <li key={m}>
              <Link href={`/library/${slugify(m)}?topic=${encodeURIComponent(m)}`}>{m}</Link>
            </li>
          ))}
          {!matches.some((m) => m.toLowerCase() === q.trim().toLowerCase()) && (
            <li>
              <button type="button" onClick={() => open(q)}>
                Look up “{q.trim()}”
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
