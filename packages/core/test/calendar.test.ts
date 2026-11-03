import { describe, expect, it } from "vitest";
import { calendarEvents, jantriCoversUntil, nanakshahiDate } from "../src/calendar/jantri";

describe("nanakshahiDate", () => {
  it("counts days from the month's sangrand", () => {
    expect(nanakshahiDate("2026-11-03")).toMatchObject({ day: 18, month: "Katak", year: 558, label: "18 Katak 558", labelPa: "੧੮ ਕੱਤਕ ੫੫੮" });
    expect(nanakshahiDate("2026-10-17")?.label).toBe("1 Katak 558");
    // Sawan has 32 days in 558.
    expect(nanakshahiDate("2026-08-16")?.label).toBe("32 Sawan 558");
  });

  it("agrees with the dates the Jantri prints beside its events", () => {
    for (const e of calendarEvents("2025-03-14", "2027-03-14")) {
      // Days the Jantri spans, such as "21-22 Assu", start on the first.
      const printed = e.ns.match(/^(\d+)(?:-\d+)? (\w+)/)!;
      expect(nanakshahiDate(e.date)?.label.startsWith(`${printed[1]} ${printed[2]} `), `${e.id} ${e.date} ${e.ns}`).toBe(true);
    }
  });

  it("gives no date outside the printed Jantris", () => {
    expect(nanakshahiDate("2025-03-13")).toBeNull();
    expect(nanakshahiDate("2027-03-15")).toBeNull();
    expect(jantriCoversUntil()).toBe("2027-03-14");
  });
});

describe("calendarEvents", () => {
  it("lists Gurpurabs, sangrands and historical days in order", () => {
    const events = calendarEvents("2026-11-01", "2026-11-30");
    expect(events.find((e) => e.id === "parkash-guru-nanak")).toMatchObject({ date: "2026-11-24", ns: "9 Maghar", major: true, category: "gurpurab" });
    expect(events.find((e) => e.id === "bandi-chhor-divas")).toMatchObject({ date: "2026-11-08", major: true });
    expect(events.find((e) => e.category === "sangrand")).toMatchObject({ date: "2026-11-16", en: "Sangrand: Maghar begins" });
    const dates = events.map((e) => e.date);
    expect(dates).toEqual([...dates].sort());
  });
});
