"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "./Language";

/** A one-line Vichaar box that opens the conversation with the question already asked. */
export function QuickAsk() {
  const router = useRouter();
  const t = useT();
  const [q, setQ] = useState("");
  return (
    <form
      className="quick-ask"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim().length >= 3) router.push(`/vichaar?q=${encodeURIComponent(q.trim())}`);
      }}
    >
      <label htmlFor="quick-q" className="sr-only">
        Ask a question
      </label>
      <input id="quick-q" value={q} maxLength={500} placeholder={t("askPlaceholder")} onChange={(e) => setQ(e.target.value)} />
      <button className="send" type="submit" disabled={q.trim().length < 3} aria-label="Ask">
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 13V3M8 3 3.5 7.5M8 3l4.5 4.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </form>
  );
}
