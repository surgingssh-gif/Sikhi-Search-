import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from "react-native";
import type { NewsItem } from "@/lib/api";
import { openStory, timeAgo } from "@/lib/stories";
import { useTheme } from "@/theme/theme";
import { FONT, NARROW, RADIUS, SPACE } from "@/theme/tokens";
import { Text } from "./Text";

const KIND_LABEL: Record<NonNullable<NewsItem["kind"]>, string> = {
  achievement: "Achievement",
  seva: "Seva",
  celebration: "Celebration",
  heritage: "Heritage",
  youth: "Youth",
  community: "Community",
};

/** A small label over a headline: the kind of good news and where, like "Seva · Yuba City". */
export function kickerOf(item: NewsItem): string {
  const topic = item.kind ? KIND_LABEL[item.kind] : item.categories.includes("panth") ? "Panth" : "News";
  const place = item.place && !["Punjab", "India"].includes(item.place.name) ? item.place.name : item.america ? "America" : null;
  return place ? `${topic} · ${place}` : topic;
}

function Kicker({ item }: { item: NewsItem }) {
  return (
    <Text variant="meta" color="accentInk" numberOfLines={1} style={styles.kicker}>
      {kickerOf(item)}
    </Text>
  );
}

function Byline({ item }: { item: NewsItem }) {
  return (
    <Text variant="meta" numberOfLines={1}>
      <Text variant="meta" color="ink" style={{ fontFamily: FONT.sansBold }}>
        {item.source}
      </Text>
      {item.publishedAt ? `  ·  ${timeAgo(item.publishedAt)}` : ""}
    </Text>
  );
}

/** The story's photo, or a quiet tile with the outlet's name when it has none or it won't load. */
function StoryImage({ item, style, small, onFail }: { item: NewsItem; style: object; small?: boolean; onFail?: () => void }) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  if (item.image && !failed) {
    return (
      <Image
        source={item.image}
        style={[style, { backgroundColor: colors.sunken }]}
        contentFit="cover"
        transition={200}
        onError={() => {
          setFailed(true);
          onFail?.();
        }}
        accessibilityIgnoresInvertColors
      />
    );
  }
  return (
    <View style={[style, styles.placeholder, { backgroundColor: colors.sunken }]}>
      <Text numberOfLines={2} style={{ fontFamily: FONT.displayItalic, fontSize: small ? 12 : 17, lineHeight: small ? 15 : 22, color: colors.inkFaint, textAlign: "center" }}>
        {item.source}
      </Text>
    </View>
  );
}

/**
 * A news story. "lead" is the big story at the top: a wide photo with the
 * headline and summary (side by side on wider screens). "row" is a story in the
 * list: a small photo, then the headline. Tapping opens the publisher's page.
 */
export function StoryCard({ item, variant = "row" }: { item: NewsItem; variant?: "lead" | "row" }) {
  const wideScreen = useWindowDimensions().width >= NARROW;
  // The lead drops its photo, rather than show an empty tile, when it has none or it won't load.
  const [noPhoto, setNoPhoto] = useState(!item.image);
  const open = () => openStory(item);

  if (variant === "lead") {
    const side = wideScreen && !noPhoto;
    return (
      <Pressable onPress={open} accessibilityRole="link" style={({ pressed }) => [side ? styles.leadSide : { gap: SPACE.md }, { opacity: pressed ? 0.85 : 1 }]}>
        {!noPhoto && <StoryImage item={item} style={side ? styles.leadImageSide : styles.leadImage} onFail={() => setNoPhoto(true)} />}
        <View style={{ gap: SPACE.sm, flex: side ? 1 : undefined }}>
          <Kicker item={item} />
          <Text variant="headline" style={side || noPhoto ? { fontSize: 28, lineHeight: 33 } : undefined}>
            {item.title}
          </Text>
          {item.snippet ? (
            <Text variant="small" numberOfLines={4}>
              {item.snippet}
            </Text>
          ) : null}
          <Byline item={item} />
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={open} accessibilityRole="link" style={({ pressed }) => [styles.row, { opacity: pressed ? 0.85 : 1 }]}>
      <StoryImage item={item} style={styles.thumb} small />
      <View style={{ flex: 1, gap: 3 }}>
        <Kicker item={item} />
        <Text variant="title" numberOfLines={3} style={{ fontSize: 16, lineHeight: 21 }}>
          {item.title}
        </Text>
        <Byline item={item} />
      </View>
    </Pressable>
  );
}

/** A story as a card in a grid: the photo on top, then the headline. */
function StoryTile({ item, width }: { item: NewsItem; width: number }) {
  return (
    <Pressable onPress={() => openStory(item)} accessibilityRole="link" style={({ pressed }) => [{ width, gap: SPACE.sm, opacity: pressed ? 0.85 : 1 }]}>
      <StoryImage item={item} style={styles.tileImage} />
      <Kicker item={item} />
      <Text variant="title" numberOfLines={4} style={{ fontSize: 16, lineHeight: 21 }}>
        {item.title}
      </Text>
      <Byline item={item} />
    </Pressable>
  );
}

/** Stories as picture cards, two across on a phone and three where there's room. */
export function StoryGrid({ items }: { items: NewsItem[] }) {
  const [width, setWidth] = useState(0);
  const columns = width >= 640 ? 3 : 2;
  const gap = width >= 640 ? SPACE.xl : SPACE.lg;
  const tile = width ? (width - gap * (columns - 1)) / columns : 0;
  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={{ flexDirection: "row", flexWrap: "wrap", columnGap: gap, rowGap: SPACE.xl }}>
      {tile > 0 && items.map((item) => <StoryTile key={item.id} item={item} width={tile} />)}
    </View>
  );
}

/** Stories as a list split by hairlines, each with a small photo. */
export function StoryList({ items }: { items: NewsItem[] }) {
  const { colors } = useTheme();
  return (
    <View>
      {items.map((item, n) => (
        <View key={item.id} style={[styles.listItem, n > 0 && { borderTopWidth: 1, borderTopColor: colors.line }]}>
          <StoryCard item={item} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: { fontFamily: FONT.sansBold, fontSize: 10.5, lineHeight: 14, letterSpacing: 0.9, textTransform: "uppercase" },
  placeholder: { alignItems: "center", justifyContent: "center", padding: SPACE.sm },
  leadImage: { width: "100%", aspectRatio: 16 / 9, borderRadius: RADIUS.md },
  leadImageSide: { flex: 0.9, aspectRatio: 4 / 3, borderRadius: RADIUS.md },
  leadSide: { flexDirection: "row", gap: SPACE.xl, alignItems: "center" },
  tileImage: { width: "100%", aspectRatio: 4 / 3, borderRadius: RADIUS.md },
  row: { flexDirection: "row", gap: SPACE.md, alignItems: "flex-start" },
  thumb: { width: 96, height: 72, borderRadius: RADIUS.sm },
  listItem: { paddingVertical: 14 },
});
