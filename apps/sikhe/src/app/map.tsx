import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StoryCard } from "@/components/StoryCard";
import { StoryMap, type StoryMapProps } from "@/components/StoryMap";
import { Text } from "@/components/Text";
import { Chip, Divider, ErrorState, Loading } from "@/components/ui";
import { friendlyError, useNews } from "@/lib/api";
import { isFriendly, MAP_REGIONS, newest, pinsFor } from "@/lib/stories";
import { useTheme } from "@/theme/theme";
import { RADIUS, SPACE, WIDE } from "@/theme/tokens";

/** Where the news is happening: a pin for every place, its stories underneath. */
export default function MapScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const side = Platform.OS === "web" && width >= WIDE;
  const { data, error, isPending, refetch } = useNews();
  const [selected, setSelected] = useState<string | null>(null);
  const [target, setTarget] = useState<StoryMapProps["target"]>(null);

  // Stories worth a reader's time (no crime or Indian politics); American places first, then the busiest elsewhere.
  const pins = useMemo(() => {
    const all = pinsFor(newest((data?.items ?? []).filter(isFriendly)));
    return [...all.filter((p) => p.region === "United States"), ...all.filter((p) => p.region !== "United States")];
  }, [data]);
  const pin = pins.find((p) => p.name === selected) ?? null;

  const back = (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/news"))}
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={8}
      style={[styles.floating, { backgroundColor: colors.surface, top: insets.top + SPACE.md }]}
    >
      <Ionicons name="chevron-back" size={22} color={colors.ink} />
    </Pressable>
  );

  return (
    <View style={{ flex: 1, flexDirection: side ? "row" : "column", backgroundColor: colors.bg }}>
      <View style={side ? { flex: 1 } : { height: Math.round(height * 0.55) }}>
        {data && <StoryMap pins={pins} selected={selected} onSelect={setSelected} target={target} />}
        {back}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.regions, { top: insets.top + SPACE.md }]}
          contentContainerStyle={{ gap: SPACE.sm, paddingRight: SPACE.lg }}
        >
          {MAP_REGIONS.map((r) => (
            <Pressable
              key={r.label}
              onPress={() => setTarget({ region: r, at: Date.now() })}
              accessibilityRole="button"
              style={[styles.region, { backgroundColor: colors.surface }]}
            >
              <Text variant="meta" color="ink">
                {r.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1, maxWidth: side ? 420 : undefined, borderLeftWidth: side ? StyleSheet.hairlineWidth : 0, borderColor: colors.line }}
        contentContainerStyle={{ padding: SPACE.xl - 4, gap: SPACE.lg, paddingBottom: insets.bottom + SPACE.xl }}
      >
        {isPending ? (
          <Loading />
        ) : error ? (
          <ErrorState message={friendlyError(error)} onRetry={() => refetch()} />
        ) : pin ? (
          <>
            <Pressable onPress={() => setSelected(null)} accessibilityRole="button" hitSlop={8}>
              <Text variant="meta" color="accentInk">
                ‹ All places
              </Text>
            </Pressable>
            <View>
              <Text variant="headline">{pin.name}</Text>
              <Text variant="meta">
                {pin.region} · {pin.items.length} {pin.items.length === 1 ? "story" : "stories"}
              </Text>
            </View>
            {pin.items.map((item, n) => (
              <View key={item.id} style={{ gap: SPACE.lg }}>
                {n > 0 && <Divider />}
                <StoryCard item={item} />
              </View>
            ))}
          </>
        ) : (
          <>
            <View>
              <Text variant="headline">The story map</Text>
              <Text variant="meta">
                {pins.reduce((n, p) => n + p.items.length, 0)} stories from {pins.length} places. Tap a pin or a place.
              </Text>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACE.sm }}>
              {pins.map((p) => (
                <Chip
                  key={p.name}
                  label={`${p.name} · ${p.items.length}`}
                  onPress={() => {
                    setSelected(p.name);
                    setTarget({ region: { label: p.name, lat: p.lat, lng: p.lng, zoom: 6, delta: 6 }, at: Date.now() });
                  }}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  floating: {
    position: "absolute",
    left: SPACE.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  regions: { position: "absolute", left: 64, right: 0, zIndex: 1000, flexGrow: 0 },
  region: {
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.sm,
    borderRadius: RADIUS.pill,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});
