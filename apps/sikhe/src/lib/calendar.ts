import type { CalendarEvent } from "./api";

/**
 * What kind of day this is, in plain words, for readers who don't know the
 * Jantri's Punjabi terms. Null when the name says it already.
 */
export function kindOf(e: CalendarEvent): string | null {
  if (e.id.startsWith("parkash-") || e.id.startsWith("pehla-parkash-")) return e.id.includes("guru-granth") ? "First installation of Sri Guru Granth Sahib Ji" : "Gurpurab: the Guru's birth";
  if (e.id.startsWith("gurgaddi-")) return "Gurgaddi: the day the Guruship passed";
  if (e.id.startsWith("joti-jot-")) return "Joti-Jot: the Guru's passing";
  if (e.id.startsWith("shaheedi-")) return "Shaheedi: a day of martyrdom";
  if (e.id.startsWith("janam-")) return "Birth anniversary";
  return null;
}

const DAY = 86_400_000;
const utc = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

/** Whole days from `today` to `date` (both YYYY-MM-DD). */
export function daysUntil(date: string, today: string): number {
  return Math.round((utc(date) - utc(today)) / DAY);
}

/** "Today", "Tomorrow", "In 5 days", or "Tue, Nov 24" further out. */
export function whenLabel(date: string, today: string): string {
  const d = daysUntil(date, today);
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d < 7) return `In ${d} days`;
  return dayLabel(date);
}

/** "Tue, Nov 24". */
export function dayLabel(date: string, options: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", options);
}
