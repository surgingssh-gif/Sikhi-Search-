"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { eventsAround } from "@ask-sikhi/core/history";
import type { HistoryEvent } from "@/lib/api";
import { dayLabel, HistoryEntry, relativeDay } from "./HistoryEntry";

/** Today's date where the reader is, as YYYY-MM-DD. */
function localToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function useToday(): string | null {
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(localToday()), []);
  return today;
}

/** The History page's top: anything that happened on this day, then the days around it. */
export function HistoryWeek({ events }: { events: HistoryEvent[] }) {
  const today = useToday();
  if (!today) return <div className="history-week" aria-busy="true" />;
  const around = eventsAround(today, 7, 14, events);
  const onThisDay = around.filter((e) => e.daysAway === 0);
  const rest = around.filter((e) => e.daysAway !== 0);

  return (
    <div className="history-week">
      {onThisDay.length > 0 && (
        <section className="history-today" aria-labelledby="on-this-day">
          <h2 id="on-this-day" className="history-label">
            On this day
          </h2>
          {onThisDay.map((e) => (
            <HistoryEntry key={e.id} event={e} when={`${e.yearsAgo} years ago`} large />
          ))}
        </section>
      )}
      <section aria-labelledby="this-week">
        <h2 id="this-week" className="history-label">
          Around this date
        </h2>
        {rest.length ? (
          <div className="history-list">
            {rest.map((e) => (
              <HistoryEntry key={e.id} event={e} when={relativeDay(e.daysAway)} />
            ))}
          </div>
        ) : (
          <p className="story-meta">No dated events in these weeks. Browse the year below.</p>
        )}
      </section>
    </div>
  );
}

/** Front-page box: the nearest few anniversaries. */
export function HistoryBox({ events }: { events: HistoryEvent[] }) {
  const today = useToday();
  if (!today) return <div className="history-box" aria-busy="true" />;
  const around = eventsAround(today, 3, 10, events).slice(0, 4);
  if (!around.length) return null;
  return (
    <ul className="history-box">
      {around.map((e) => (
        <li key={e.id}>
          <Link href={`/history#${e.id}`}>
            <span className="story-kicker">
              {e.daysAway === 0 ? "Today" : dayLabel(e.date)} · {e.date.slice(0, 4)}
            </span>
            <span className="story-headline">{e.title}</span>
            <span className="story-meta">{relativeDay(e.daysAway)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
