"use client";

import { useEffect, useState } from "react";
import { fetchBriefing, type NewsBriefingResponse } from "@/lib/api";

/** "The Briefing": the day's news in a few lines, written fresh each morning. */
export function BriefingBox() {
  const [briefing, setBriefing] = useState<NewsBriefingResponse | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    fetchBriefing().then((b) => live && setBriefing(b));
    return () => {
      live = false;
    };
  }, []);

  if (briefing === null || (briefing && !briefing.bullets.length)) return null;
  return (
    <section className="briefing-box" aria-label="The Briefing">
      <h2>The Briefing</h2>
      {briefing === undefined ? (
        <p className="story-meta">Writing today&apos;s briefing…</p>
      ) : (
        <ul>
          {briefing.bullets.slice(0, 4).map((b) => (
            <li key={b.text}>{b.text}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
