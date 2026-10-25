"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { NewsCategory, NewsItem } from "@/lib/api";
import { CATEGORY_LABEL, Story } from "./Story";

export interface PlacePin {
  name: string;
  lat: number;
  lng: number;
  items: NewsItem[];
}

/** Stories grouped by where they happened, busiest places first. */
export function pinsFor(items: NewsItem[]): PlacePin[] {
  const byName = new Map<string, PlacePin>();
  for (const item of items) {
    if (!item.place) continue;
    const pin = byName.get(item.place.name) ?? { name: item.place.name, lat: item.place.lat, lng: item.place.lng, items: [] };
    pin.items.push(item);
    byName.set(item.place.name, pin);
  }
  return [...byName.values()].sort((a, b) => b.items.length - a.items.length);
}

const COLOURS: Record<NewsCategory, string> = { panth: "#d4730c", punjab: "#326891", diaspora: "#4f7d35" };

/** A pin takes the colour of the section most of its stories belong to. */
function colourOf(pin: PlacePin): string {
  const counts: Record<string, number> = {};
  for (const i of pin.items) for (const c of i.categories) counts[c] = (counts[c] ?? 0) + 1;
  const top = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "punjab") as NewsCategory;
  return COLOURS[top];
}

export const REGIONS: { label: string; center: [number, number]; zoom: number }[] = [
  { label: "Punjab", center: [30.9, 75.4], zoom: 7 },
  { label: "India", center: [23, 79], zoom: 4 },
  { label: "Canada", center: [52, -100], zoom: 3 },
  { label: "UK", center: [53.5, -2.5], zoom: 5 },
  { label: "World", center: [28, 20], zoom: 2 },
];

function useDark(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const read = () => {
      const set = document.documentElement.dataset.theme;
      setDark(set ? set === "dark" : media.matches);
    };
    read();
    media.addEventListener("change", read);
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      media.removeEventListener("change", read);
      observer.disconnect();
    };
  }, []);
  return dark;
}

function FlyTo({ target }: { target: { center: [number, number]; zoom: number; at: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target.center, target.zoom, { duration: 0.8 });
  }, [map, target]);
  return null;
}

function Tiles() {
  const dark = useDark();
  return (
    <TileLayer
      key={dark ? "dark" : "light"}
      url={`https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${dark ? "World_Dark_Gray_Base" : "World_Light_Gray_Base"}/MapServer/tile/{z}/{y}/{x}`}
      attribution="Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors"
      maxZoom={16}
    />
  );
}

function Pins({ pins, selected, onSelect }: { pins: PlacePin[]; selected: string | null; onSelect: (name: string) => void }) {
  return (
    <>
      {pins.map((pin) => {
        const on = pin.name === selected;
        const colour = colourOf(pin);
        return (
          <CircleMarker
            key={pin.name}
            center={[pin.lat, pin.lng]}
            radius={Math.min(7 + Math.sqrt(pin.items.length) * 4, 26)}
            pathOptions={{ color: on ? "#121212" : "#ffffff", weight: on ? 2.5 : 1.5, fillColor: colour, fillOpacity: 0.85 }}
            eventHandlers={{ click: () => onSelect(pin.name) }}
          >
            <Tooltip className="map-tip" direction="top" offset={[0, -6]}>
              {pin.name} · {pin.items.length} {pin.items.length === 1 ? "story" : "stories"}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}

/** Small map for the front page; every pin opens the full map at that place. */
export function MiniMap({ items }: { items: NewsItem[] }) {
  const pins = useMemo(() => pinsFor(items), [items]);
  return (
    <div className="mini-map">
      <MapContainer center={[38, -12]} zoom={1} minZoom={1} scrollWheelZoom={false} zoomControl={false} attributionControl={false} style={{ height: "100%" }}>
        <Tiles />
        <Pins pins={pins} selected={null} onSelect={(name) => (window.location.href = `/map?place=${encodeURIComponent(name)}`)} />
      </MapContainer>
    </div>
  );
}

const FILTERS: (NewsCategory | "all")[] = ["all", "panth", "punjab", "diaspora"];

/** The full story map: pins by place, a list of stories beside it. */
export function NewsMap({ items, initialPlace }: { items: NewsItem[]; initialPlace?: string }) {
  const [filter, setFilter] = useState<NewsCategory | "all">("all");
  const shown = useMemo(() => (filter === "all" ? items : items.filter((i) => i.categories.includes(filter))), [items, filter]);
  const pins = useMemo(() => pinsFor(shown), [shown]);
  const [selected, setSelected] = useState<string | null>(initialPlace && pins.some((p) => p.name === initialPlace) ? initialPlace : null);
  const [fly, setFly] = useState<{ center: [number, number]; zoom: number; at: number } | null>(null);
  const pin = pins.find((p) => p.name === selected) ?? null;

  useEffect(() => {
    // Opened from the front page at a place: go there.
    const start = pins.find((p) => p.name === initialPlace);
    if (start) setFly({ center: [start.lat, start.lng], zoom: 5, at: Date.now() });
    // Only on first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function select(name: string) {
    setSelected(name);
    if (window.matchMedia("(max-width: 860px)").matches) document.querySelector(".map-panel")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="map-page">
      <div className="map-canvas">
        <MapContainer center={[30, 35]} zoom={2} minZoom={2} worldCopyJump style={{ height: "100%" }}>
          <Tiles />
          <FlyTo target={fly} />
          <Pins pins={pins} selected={selected} onSelect={select} />
        </MapContainer>
        <div className="map-toolbar">
          <div className="segmented" role="group" aria-label="Section">
            {FILTERS.map((f) => (
              <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {f === "all" ? "All" : CATEGORY_LABEL[f]}
              </button>
            ))}
          </div>
          <div className="map-zoom" role="group" aria-label="Go to region">
            {REGIONS.map((r) => (
              <button key={r.label} type="button" onClick={() => setFly({ center: r.center, zoom: r.zoom, at: Date.now() })}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <aside className="map-panel" aria-live="polite">
        {pin ? (
          <>
            <div className="map-panel-head">
              <button type="button" className="map-back" onClick={() => setSelected(null)}>
                ‹ All places
              </button>
              <h2>{pin.name}</h2>
              <p>
                {pin.items.length} {pin.items.length === 1 ? "story" : "stories"}
              </p>
            </div>
            <ul>
              {pin.items.map((item) => (
                <li key={item.id}>
                  <Story item={item} variant="row" />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <div className="map-panel-head">
              <h2>The story map</h2>
              <p>
                {shown.filter((i) => i.place).length} stories from {pins.length} places. Tap a pin to read what&apos;s happening there.
              </p>
            </div>
            <ul className="place-list">
              {pins.map((p) => (
                <li key={p.name}>
                  <button
                    type="button"
                    onClick={() => {
                      select(p.name);
                      setFly({ center: [p.lat, p.lng], zoom: 5, at: Date.now() });
                    }}
                  >
                    <span>
                      <span className="place-dot" style={{ background: colourOf(p) }} aria-hidden="true" />
                      {p.name}
                    </span>
                    <span className="place-count">{p.items.length}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>
    </div>
  );
}
