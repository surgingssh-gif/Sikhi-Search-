import type { MapRegion, PlacePin } from "@/lib/stories";

/** What both story maps, the phone's and the browser's, take. */
export interface StoryMapProps {
  pins: PlacePin[];
  selected: string | null;
  onSelect: (name: string) => void;
  /** Where to fly to; a new object each time, so the same region can be chosen twice. */
  target: { region: MapRegion; at: number } | null;
}

/** Pins are kesri for Sikh news and slate for other Punjab news. */
export function pinColour(pin: PlacePin, accent: string): string {
  const sikh = pin.items.filter((i) => i.categories.includes("panth")).length;
  return sikh * 2 >= pin.items.length ? accent : "#5B7FA6";
}
