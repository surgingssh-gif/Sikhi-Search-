"use client";

import { useEffect, useState } from "react";
import { fetchBriefing, type NewsBriefingResponse, type NewsCategory, type NewsItem } from "@/lib/api";
import { NewsList } from "./NewsList";

const FILTERS: { id: NewsCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "panth", label: "Panth" },
  { id: "punjab", label: "Punjab" },
  { id: "diaspora", label: "Diaspora" },
];

const PAGE = 20;

export function NewsView({ items }: { items: NewsItem[] }) {
  const [filter, setFilter] = useState<NewsCategory | "all">("all");
  const [shown, setShown] = useState(PAGE);
  const [briefing, setBriefing] = useState<NewsBriefingResponse | null | "loading">("loading");

  useEffect(() => {
    void fetchBriefing().then(setBriefing);
  }, []);

  const filtered = filter === "all" ? items : items.filter((i) => i.categories.includes(filter));
  const byId = new Map(items.map((i) => [i.id, i]));

  return (
    <>
      <section className="briefing" aria-label="Today's briefing">
        <div className="briefing-head">
          <h2>Today&apos;s briefing</h2>
          <span className="ai-badge">AI summary of the headlines below</span>
        </div>
        {briefing === "loading" ? (
          <p className="empty">Putting the briefing together…</p>
        ) : briefing && briefing.bullets.length ? (
          <ul>
            {briefing.bullets.map((b, i) => (
              <li key={i}>
                {b.text}{" "}
                {b.itemIds.map((id) => {
                  const item = byId.get(id);
                  return item ? (
                    <a key={id} className="briefing-src" href={item.url} target="_blank" rel="noreferrer">
                      {item.source}
                    </a>
                  ) : null;
                })}
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">The briefing isn&apos;t available right now; the headlines are below.</p>
        )}
      </section>

      <div className="filter-row" role="group" aria-label="Filter news">
        <div className="segmented">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => {
                setFilter(f.id);
                setShown(PAGE);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="filter-count">{filtered.length} stories</span>
      </div>

      {filtered.length ? <NewsList items={filtered.slice(0, shown)} /> : <p className="empty">No stories in this section right now.</p>}

      {shown < filtered.length && (
        <div className="feature-actions" style={{ justifyContent: "center" }}>
          <button type="button" className="btn-ghost" onClick={() => setShown((n) => n + PAGE)}>
            Show more
          </button>
        </div>
      )}
    </>
  );
}
