import { describe, expect, it } from "vitest";
import { eventsAround, HISTORY_EVENTS, type HistoryEvent } from "../src";

const event = (id: string, date: string): HistoryEvent => ({ id, date, title: id, summary: "", wiki: id, tags: [] });

describe("eventsAround", () => {
  it("finds anniversaries before and after the day, nearest first", () => {
    const events = [event("far", "1900-03-01"), event("before", "1800-10-20"), event("today", "1700-10-25"), event("after", "1984-11-01")];
    const found = eventsAround("2026-10-25", 7, 7, events);
    expect(found.map((e) => [e.id, e.daysAway, e.yearsAgo])).toEqual([
      ["before", -5, 226],
      ["today", 0, 326],
      ["after", 7, 42],
    ]);
  });

  it("looks across the turn of the year", () => {
    const events = [event("sahibzade", "1704-12-26"), event("new-year", "1846-01-03")];
    expect(eventsAround("2027-01-01", 7, 7, events).map((e) => [e.id, e.daysAway, e.yearsAgo])).toEqual([
      ["sahibzade", -6, 322],
      ["new-year", 2, 181],
    ]);
  });

  it("has a valid, unique entry for every event", () => {
    const ids = new Set(HISTORY_EVENTS.map((e) => e.id));
    expect(ids.size).toBe(HISTORY_EVENTS.length);
    for (const e of HISTORY_EVENTS) {
      expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(e.date))).toBe(false);
      expect(e.summary.length).toBeGreaterThan(20);
    }
  });
});
