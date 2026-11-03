import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import { useTheme } from "@/theme/theme";
import { pinColour, type StoryMapProps } from "./storyMapShared";

export type { StoryMapProps } from "./storyMapShared";

function FlyTo({ target }: { target: StoryMapProps["target"] }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.region.lat, target.region.lng], target.region.zoom, { duration: 0.8 });
  }, [map, target]);
  return null;
}

/** The story map in a browser, drawn with Leaflet on Esri's grey base map. */
export function StoryMap({ pins, selected, onSelect, target }: StoryMapProps) {
  const { colors, dark } = useTheme();
  return (
    <MapContainer center={[39, -97]} zoom={3} minZoom={2} zoomControl={false} worldCopyJump style={{ position: "absolute", inset: 0, background: colors.sunken }}>
      <TileLayer
        key={dark ? "dark" : "light"}
        url={`https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${dark ? "World_Dark_Gray_Base" : "World_Light_Gray_Base"}/MapServer/tile/{z}/{y}/{x}`}
        attribution="Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors"
        maxZoom={16}
      />
      <FlyTo target={target} />
      {pins.map((pin) => {
        const on = pin.name === selected;
        return (
          <CircleMarker
            key={pin.name}
            center={[pin.lat, pin.lng]}
            radius={Math.min(7 + Math.sqrt(pin.items.length) * 3.5, 22)}
            pathOptions={{ color: on ? colors.ink : "#ffffff", weight: on ? 3 : 1.5, fillColor: pinColour(pin, colors.accent), fillOpacity: 0.88 }}
            eventHandlers={{ click: () => onSelect(pin.name) }}
          >
            <Tooltip direction="top" offset={[0, -6]}>
              {pin.name} · {pin.items.length} {pin.items.length === 1 ? "story" : "stories"}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
