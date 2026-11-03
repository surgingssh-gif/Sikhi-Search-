import { JANTRI_EVENTS, JANTRI_YEARS } from "./jantri-data";

/**
 * The Sikh calendar as gurdwaras keep it: the Nanakshahi Jantri published from
 * Sri Amritsar by the SGPC. Its months begin on sangrand, so month lengths
 * change every year, and most Gurpurabs follow the moon, so their Gregorian
 * dates move too. Only dates printed in a Jantri are given; a day outside the
 * printed years has no Nanakshahi date here rather than a guessed one.
 */

export type JantriCategory = "gurpurab" | "historical" | "bhagat" | "civil";

export const NANAKSHAHI_MONTHS = ["Chet", "Vaisakh", "Jeth", "Harh", "Sawan", "Bhadon", "Assu", "Katak", "Maghar", "Poh", "Magh", "Phagan"] as const;
export type NanakshahiMonth = (typeof NANAKSHAHI_MONTHS)[number];

const MONTHS_PA: Record<NanakshahiMonth, string> = {
  Chet: "ਚੇਤ",
  Vaisakh: "ਵੈਸਾਖ",
  Jeth: "ਜੇਠ",
  Harh: "ਹਾੜ",
  Sawan: "ਸਾਵਣ",
  Bhadon: "ਭਾਦੋਂ",
  Assu: "ਅੱਸੂ",
  Katak: "ਕੱਤਕ",
  Maghar: "ਮੱਘਰ",
  Poh: "ਪੋਹ",
  Magh: "ਮਾਘ",
  Phagan: "ਫੱਗਣ",
};

export interface JantriYear {
  nsYear: number;
  source: string;
  /** The first day of each month, YYYY-MM-DD. */
  sangrands: Record<NanakshahiMonth, string>;
  /** 1 Chet of the following year. */
  nextChet: string;
  events: Record<string, { date: string; ns: string }>;
}

export interface NanakshahiDate {
  day: number;
  month: NanakshahiMonth;
  year: number;
  /** "18 Katak 558". */
  label: string;
  /** "੧੮ ਕੱਤਕ ੫੫੮". */
  labelPa: string;
}

export interface CalendarEvent {
  id: string;
  /** YYYY-MM-DD, Gregorian. */
  date: string;
  /** The Nanakshahi date as the Jantri prints it, e.g. "9 Maghar". */
  ns: string;
  en: string;
  pa: string;
  category: JantriCategory | "sangrand";
  /** A day most gurdwaras mark with a full programme: the Gurus' Gurpurabs, Vaisakhi, Bandi Chhor, the Sahibzade. */
  major: boolean;
}

/** Days marked across the Panth, beyond the Gurus' own Gurpurabs. */
const MAJOR = new Set([
  "khalsa-sajna-divas",
  "bandi-chhor-divas",
  "hola-mahalla",
  "shaheedi-vadde-sahibzade",
  "shaheedi-chhote-sahibzade",
  "maghi-muktsar",
  "pehla-parkash-guru-granth-sahib",
  "gurgaddi-guru-granth-sahib",
]);

const DAY = 86_400_000;
const utc = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

const GURMUKHI_DIGITS = "੦੧੨੩੪੫੬੭੮੯";
const toGurmukhiDigits = (n: number) => String(n).replace(/\d/g, (d) => GURMUKHI_DIGITS[Number(d)]!);

/** The last day the printed Jantris cover. */
export function jantriCoversUntil(years = JANTRI_YEARS): string {
  const last = years.reduce((a, b) => (a.nextChet > b.nextChet ? a : b));
  return iso(utc(last.nextChet) - DAY);
}

/** The Nanakshahi date of a Gregorian day, or null outside the printed Jantris. */
export function nanakshahiDate(date: string, years = JANTRI_YEARS): NanakshahiDate | null {
  const year = years.find((y) => date >= y.sangrands.Chet && date < y.nextChet);
  if (!year) return null;
  const month = [...NANAKSHAHI_MONTHS].reverse().find((m) => year.sangrands[m] <= date)!;
  const day = Math.round((utc(date) - utc(year.sangrands[month])) / DAY) + 1;
  return {
    day,
    month,
    year: year.nsYear,
    label: `${day} ${month} ${year.nsYear}`,
    labelPa: `${toGurmukhiDigits(day)} ${MONTHS_PA[month]} ${toGurmukhiDigits(year.nsYear)}`,
  };
}

/** Every Jantri day from `from` to `to` (inclusive, YYYY-MM-DD), sangrands included, in date order. */
export function calendarEvents(from: string, to: string, years = JANTRI_YEARS, catalogue = JANTRI_EVENTS): CalendarEvent[] {
  const info = new Map(catalogue.map((e) => [e.id, e]));
  const out: CalendarEvent[] = [];
  for (const year of years) {
    for (const [id, { date, ns }] of Object.entries(year.events)) {
      if (date < from || date > to) continue;
      const e = info.get(id);
      if (!e) continue;
      out.push({ id, date, ns, en: e.en, pa: e.pa, category: e.category, major: e.category === "gurpurab" || MAJOR.has(id) });
    }
    for (const month of NANAKSHAHI_MONTHS) {
      const date = year.sangrands[month];
      if (date < from || date > to) continue;
      out.push({
        id: `sangrand-${year.nsYear}-${month.toLowerCase()}`,
        date,
        ns: `1 ${month}`,
        en: `Sangrand: ${month} begins`,
        pa: `ਸੰਗਰਾਂਦ ${MONTHS_PA[month]}`,
        category: "sangrand",
        major: false,
      });
    }
  }
  // Sangrand first on its day, then major days, then the rest as the Jantri lists them.
  const rank = (e: CalendarEvent) => (e.category === "sangrand" ? 0 : e.major ? 1 : 2);
  return out.sort((a, b) => (a.date === b.date ? rank(a) - rank(b) : a.date < b.date ? -1 : 1));
}

/** Where the dates come from, for showing beside them. */
export const JANTRI_ATTRIBUTION =
  "Dates from the Nanakshahi Jantri published by the SGPC, Sri Amritsar, via the open-source nanakshahi-jantri project. Your gurdwara may mark some days differently.";
