import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import type { PlacePin } from "@/lib/stories";
import { useTheme } from "@/theme/theme";
import { pinColour, type StoryMapProps } from "./storyMapShared";

export type { StoryMapProps } from "./storyMapShared";

/** Sized by how many stories a place has. */
export const pinSize = (pin: PlacePin) => Math.min(14 + Math.sqrt(pin.items.length) * 7, 44);

/** The story map on a phone: Apple Maps on iPhone, Google Maps on Android. */
export function StoryMap({ pins, selected, onSelect, target }: StoryMapProps) {
  const { colors, dark } = useTheme();
  const map = useRef<MapView>(null);

  useEffect(() => {
    if (!target) return;
    const { lat, lng, delta } = target.region;
    map.current?.animateToRegion({ latitude: lat, longitude: lng, latitudeDelta: delta, longitudeDelta: delta }, 600);
  }, [target]);

  return (
    <MapView
      ref={map}
      style={StyleSheet.absoluteFill}
      initialRegion={{ latitude: 39, longitude: -97, latitudeDelta: 45, longitudeDelta: 45 }}
      userInterfaceStyle={dark ? "dark" : "light"}
      showsPointsOfInterests={false}
      toolbarEnabled={false}
    >
      {pins.map((pin) => {
        const size = pinSize(pin);
        const on = pin.name === selected;
        return (
          <Marker
            key={pin.name}
            coordinate={{ latitude: pin.lat, longitude: pin.lng }}
            onPress={() => onSelect(pin.name)}
            accessibilityLabel={`${pin.name}, ${pin.items.length} stories`}
            tracksViewChanges={false}
          >
            <View
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: pinColour(pin, colors.accent),
                opacity: 0.9,
                borderWidth: on ? 3 : 2,
                borderColor: on ? colors.ink : "#FFFFFF",
              }}
            />
          </Marker>
        );
      })}
    </MapView>
  );
}
