import type { Metadata } from "next";
import { HistoryEntry } from "@/components/HistoryEntry";
import { HistoryWeek } from "@/components/HistoryWeek";
import { getHistory } from "@/lib/api";

export const metadata: Metadata = { title: "Sikh history", description: "This week in Sikh history, and the dates that shaped the Panth." };

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default async function HistoryPage() {
  const events = await getHistory();
  // Through the year: by calendar day, whatever the year.
  const byMonth = MONTHS.map((name, m) => ({
    name,
    events: events.filter((e) => Number(e.date.slice(5, 7)) === m + 1).sort((a, b) => a.date.slice(5).localeCompare(b.date.slice(5))),
  })).filter((g) => g.events.length);

  return (
    <main className="wrap wrap-wide">
      <header className="section-head">
        <h1>Sikh History</h1>
        <p>Anniversaries from the Panth&apos;s history: the Gurus, the shaheeds, the battles and the struggles, by the date they happened.</p>
      </header>

      {events.length ? (
        <>
          <HistoryWeek events={events} />
          <section className="history-year-list" aria-labelledby="through-the-year">
            <h2 id="through-the-year" className="band-title">
              Through the year
            </h2>
            <nav className="month-jump" aria-label="Months">
              {byMonth.map((g) => (
                <a key={g.name} href={`#month-${g.name.toLowerCase()}`}>
                  {g.name.slice(0, 3)}
                </a>
              ))}
            </nav>
            {byMonth.map((g) => (
              <section key={g.name} id={`month-${g.name.toLowerCase()}`} className="history-month">
                <h3 className="history-label">{g.name}</h3>
                <div className="history-list">
                  {g.events.map((e) => (
                    <HistoryEntry key={e.id} event={e} anchor />
                  ))}
                </div>
              </section>
            ))}
          </section>
        </>
      ) : (
        <p className="empty">Sikh history couldn&apos;t be loaded right now. Please try again shortly.</p>
      )}

      <p className="discuss-tip">
        Dates are Gregorian and each one is checked against its Wikipedia article. Gurpurabs follow the lunar calendar and move each year,
        so they aren&apos;t listed here. Library entries are written by AI from web sources.
      </p>
    </main>
  );
}
