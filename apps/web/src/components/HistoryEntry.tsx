import Link from "next/link";
import { wikipediaUrl } from "@ask-sikhi/core/history";
import type { HistoryEvent } from "@/lib/api";
import { slugify } from "@/lib/api";

export function dayLabel(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(2000, m! - 1, d!)).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
}

export function relativeDay(daysAway: number): string {
  if (daysAway === 0) return "Today";
  if (daysAway === 1) return "Tomorrow";
  if (daysAway === -1) return "Yesterday";
  return daysAway < 0 ? `${-daysAway} days ago` : `In ${daysAway} days`;
}

/** One event: date, year, what happened, and where to read more. */
export function HistoryEntry({
  event,
  when,
  large = false,
  anchor = false,
}: {
  event: HistoryEvent;
  when?: string;
  large?: boolean;
  /** Give the entry its id, so /history#id links land on it. */
  anchor?: boolean;
}) {
  const year = event.date.slice(0, 4);
  return (
    <article className={`history-entry${large ? " history-entry-large" : ""}`} id={anchor ? event.id : undefined}>
      <div className="history-when">
        <span className="history-year">{year}</span>
        <span className="history-day">
          {dayLabel(event.date)}
          {when && <> · {when}</>}
        </span>
      </div>
      <div className="history-body">
        <h3>{event.title}</h3>
        <p>{event.summary}</p>
        <p className="history-links">
          <Link href={`/library/${slugify(event.title)}?topic=${encodeURIComponent(event.title)}`}>Read in the Library</Link>
          <Link href={`/vichaar?q=${encodeURIComponent(`Tell me about ${event.title} (${year})`)}`}>Ask in Vichaar</Link>
          <a href={wikipediaUrl(event.wiki)} target="_blank" rel="noreferrer">
            Source: Wikipedia
          </a>
        </p>
      </div>
    </article>
  );
}
