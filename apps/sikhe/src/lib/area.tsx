import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { NewsItem } from "./api";

/**
 * The reader's area, for "Near you": the news from their own Sangat.
 * Chosen once in Settings and kept on this device only.
 */

export interface Area {
  id: string;
  label: string;
  /** The towns it covers, for the picker. */
  towns: string;
  /** A story is near when it happened within `km` of here... */
  center?: [number, number];
  km?: number;
  /** ...or anywhere in one of these countries. */
  regions?: string[];
}

export const AREAS: Area[] = [
  { id: "norcal", label: "Northern California", towns: "Yuba City, Sacramento, the Bay Area, Stockton", center: [38.3, -121.6], km: 230 },
  { id: "central-valley", label: "Central Valley", towns: "Fresno, Modesto, Turlock, Bakersfield, Selma", center: [36.5, -119.6], km: 200 },
  { id: "socal", label: "Southern California", towns: "Los Angeles, Cerritos, Riverside", center: [34.0, -117.9], km: 180 },
  { id: "pnw", label: "Washington State", towns: "Seattle, Kent, Renton", center: [47.5, -122.3], km: 200 },
  { id: "nynj", label: "New York and New Jersey", towns: "Queens, Long Island, Carteret, Hoboken", center: [40.75, -74.0], km: 120 },
  { id: "dmv", label: "D.C., Maryland and Virginia", towns: "Germantown, Fairfax", center: [38.9, -77.2], km: 150 },
  { id: "midwest", label: "The Midwest", towns: "Chicago, Indianapolis, Detroit, Oak Creek, Ohio", center: [41.8, -86.0], km: 550 },
  { id: "texas", label: "Texas", towns: "Houston, Dallas", center: [31.0, -97.5], km: 600 },
  { id: "bc", label: "British Columbia", towns: "Surrey, Vancouver, Abbotsford", center: [49.2, -122.8], km: 250 },
  { id: "ontario", label: "Ontario", towns: "Brampton, Toronto, Ottawa", center: [43.7, -79.6], km: 300 },
  { id: "alberta", label: "Alberta", towns: "Calgary, Edmonton", center: [52.0, -113.8], km: 400 },
  { id: "uk", label: "United Kingdom", towns: "Southall, Birmingham, Leicester, Wolverhampton", regions: ["United Kingdom"] },
  { id: "anz", label: "Australia and New Zealand", towns: "Melbourne, Sydney, Brisbane, Auckland", regions: ["Australia", "New Zealand"] },
];

/** Distance between two points on the earth, in km. */
function km([lat1, lng1]: [number, number], [lat2, lng2]: [number, number]): number {
  const rad = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

/** Whether a story happened in an area. Stories with no known place are never "near". */
export function isNear(item: NewsItem, area: Area): boolean {
  const place = item.place;
  if (!place) return false;
  if (area.regions) return area.regions.includes(place.region);
  // A state or country as a whole is too broad to call near.
  if (["United States", "Canada", "India"].includes(place.name)) return false;
  return Boolean(area.center && area.km && km(area.center, [place.lat, place.lng]) <= area.km);
}

const KEY = "sikhe.area";

const AreaContext = createContext<{ area: Area | null; setArea: (id: string | null) => void } | null>(null);

export function AreaProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => v && setId(v))
      .catch(() => {});
  }, []);
  const value = useMemo(
    () => ({
      area: AREAS.find((a) => a.id === id) ?? null,
      setArea: (next: string | null) => {
        setId(next);
        (next ? AsyncStorage.setItem(KEY, next) : AsyncStorage.removeItem(KEY)).catch(() => {});
      },
    }),
    [id],
  );
  return <AreaContext.Provider value={value}>{children}</AreaContext.Provider>;
}

export function useArea() {
  const ctx = useContext(AreaContext);
  if (!ctx) throw new Error("useArea needs an AreaProvider");
  return ctx;
}
