import type { BaniSummary } from "./api";

/** Nitnem banis by BaniDB id, in the order they are usually recited. */
export const NITNEM = [2, 4, 6, 9, 10, 21, 23, 24, 31];

/** Familiar English names for banis whose BaniDB names are transliterations. */
const NAMES: Record<number, string> = {
  2: "Japji Sahib",
  4: "Jaap Sahib",
  6: "Tav Prasad Savaiye",
  9: "Chaupai Sahib",
  10: "Anand Sahib",
  21: "Rehras Sahib",
  23: "Kirtan Sohila",
  24: "Ardas",
  31: "Sukhmani Sahib",
  34: "Sidh Gosht",
  29: "Akal Ustat",
  11: "Laavan",
};

export function baniTitle(b: Pick<BaniSummary, "baniId" | "name">): string {
  if (NAMES[b.baniId]) return NAMES[b.baniId]!;
  return b.name.replace(/\b\w/g, (c) => c.toUpperCase());
}
