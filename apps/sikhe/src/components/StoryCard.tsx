import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from "react-native";
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

const topicOf = (item: NewsItem) => (item.kind ? KIND_LABEL[item.kind] : item.categories.includes("panth") ? "Panth" : "News");

/** Where a story happened, if that adds anything. */
function placeOf(item: NewsItem): string | null {
  if (item.place && !["Punjab", "India"].includes(item.place.name)) return item.place.name;
  return item.america ? "United States" : null;
}

/** The kind of good news and where, like "Seva · Coventry". */
export function kickerOf(item: NewsItem): string {
  const place = placeOf(item);
  return place ? `${topicOf(item)} · ${place}` : topicOf(item);
}

/** An outlet's name as a reader would say it: "www.babushahi.com" becomes "Babushahi". */
export function outletName(source: string): string {
  const s = source.trim();
  if (!/^(www\.)?[\w-]+(\.[\w-]+)+$/i.test(s)) return s;
  const name = s
    .replace(/^www\./i, "")
    .replace(/(\.(co|com))?\.(com|net|org|in|uk|au|ca|news|info)$/i, "")
    .replace(/\.(com|co)$/i, "");
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** A headline without the section tag some outlets add: "… a year | Trending" becomes "… a year". */
export function cleanTitle(title: string): string {
  return title.replace(/\s+[|–—-]\s+(Trending|Latest|News|Breaking|Watch|Video|Photos?|Exclusive|Opinion)\s*$/i, "").replace(/\s+\|\s+[^|]{1,30}$/, "").trim();
}

/** The kind in small spaced capitals, then the place in a quieter voice. */
function Kicker({ item }: { item: NewsItem }) {
  const place = placeOf(item);
  return (
    <Text numberOfLines={1} style={styles.kicker}>
      <Text variant="meta" color="accentInk" style={styles.kickerTopic}>
        {topicOf(item)}
      </Text>
      {place ? (
        <Text variant="meta" color="inkFaint" style={styles.kickerPlace}>
          {`   ${place}`}
        </Text>
      ) : null}
    </Text>
  );
}

function Byline({ item }: { item: NewsItem }) {
  return (
    <Text variant="meta" color="inkFaint" numberOfLines={1}>
      <Text variant="meta" color="inkSoft" style={{ fontFamily: FONT.sansMedium }}>
        {outletName(item.source)}
      </Text>
      {item.publishedAt ? `  ·  ${timeAgo(item.publishedAt)}` : ""}
    </Text>
  );
}

/** A story's photo. Calls `onFail` if it won't load, so the card can drop it rather than show an empty box. */
function Photo({ item, style, onFail }: { item: NewsItem; style: object; onFail: () => void }) {
  const { colors } = useTheme();
  return (
    <Image
      source={item.image}
      style={[style, { backgroundColor: colors.sunken }]}
      contentFit="cover"
      transition={250}
      onError={onFail}
      accessibilityIgnoresInvertColors
    />
  );
}

/** Whether a story's photo is still worth showing, and a way to give up on it. */
function usePhoto(item: NewsItem): [boolean, () => void] {
  const [failed, setFailed] = useState(false);
  return [Boolean(item.image) && !failed, () => setFailed(true)];
}

/**
 * A news story. "lead" is the big story at the top: a wide photo with the
 * headline (side by side on wider screens). "row" is a story in the list: the
 * headline, with a small photo on the right when it has one. Tapping opens
 * the publisher's page.
 */
export function StoryCard({ item, variant = "row" }: { item: NewsItem; variant?: "lead" | "row" }) {
  const { colors } = useTheme();
  const wideScreen = useWindowDimensions().width >= NARROW;
  const [hasPhoto, dropPhoto] = usePhoto(item);
  const open = () => openStory(item);

  if (variant === "lead") {
    const side = wideScreen && hasPhoto;
    return (
      <Pressable onPress={open} accessibilityRole="link" style={({ pressed }) => [side ? styles.leadSide : { gap: SPACE.md }, { opacity: pressed ? 0.85 : 1 }]}>
        {hasPhoto && <Photo item={item} style={side ? styles.leadImageSide : styles.leadImage} onFail={dropPhoto} />}
        <View style={{ gap: SPACE.sm, flex: side ? 1 : undefined }}>
          <Kicker item={item} />
          <Text style={[styles.leadTitle, { color: colors.ink }, wideScreen && { fontSize: 30, lineHeight: 36 }]}>{cleanTitle(item.title)}</Text>
          {item.snippet ? (
            <Text variant="small" numberOfLines={3}>
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
      <View style={{ flex: 1, gap: 5 }}>
        <Kicker item={item} />
        <Text style={[styles.rowTitle, { color: colors.ink }]}>{cleanTitle(item.title)}</Text>
        <Byline item={item} />
      </View>
      {hasPhoto && <Photo item={item} style={styles.thumb} onFail={dropPhoto} />}
    </Pressable>
  );
}

/** A story as a picture card: the photo, then the headline. Leaves itself out if its photo won't load. */
function StoryTile({ item, width }: { item: NewsItem; width: number }) {
  const { colors } = useTheme();
  const [hasPhoto, dropPhoto] = usePhoto(item);
  if (!hasPhoto) return null;
  return (
    <Pressable onPress={() => openStory(item)} accessibilityRole="link" style={({ pressed }) => [{ width, gap: SPACE.sm, opacity: pressed ? 0.85 : 1 }]}>
      <Photo item={item} style={styles.tileImage} onFail={dropPhoto} />
      <Kicker item={item} />
      <Text style={[styles.tileTitle, { color: colors.ink }]}>{cleanTitle(item.title)}</Text>
      <Byline item={item} />
    </Pressable>
  );
}

/**
 * Picture stories. On a phone they are a row of cards you swipe through; where
 * there's room, a grid three across.
 */
export function StoryGrid({ items }: { items: NewsItem[] }) {
  const [width, setWidth] = useState(0);
  const phone = useWindowDimensions().width < NARROW;

  if (phone) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={236 + SPACE.lg}
        style={{ marginHorizontal: -SPACE.xl + 4 }}
        contentContainerStyle={{ gap: SPACE.lg, paddingHorizontal: SPACE.xl - 4 }}
      >
        {items.map((item) => (
          <StoryTile key={item.id} item={item} width={236} />
        ))}
      </ScrollView>
    );
  }

  const columns = width >= 640 ? 3 : 2;
  const gap = SPACE.xl;
  const tile = width ? (width - gap * (columns - 1)) / columns : 0;
  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={{ flexDirection: "row", flexWrap: "wrap", columnGap: gap, rowGap: SPACE.xxl }}>
      {tile > 0 && items.map((item) => <StoryTile key={item.id} item={item} width={tile} />)}
    </View>
  );
}

/** Stories as a list split by hairlines, kept to a readable width so each photo stays near its headline. */
export function StoryList({ items }: { items: NewsItem[] }) {
  const { colors } = useTheme();
  return (
    <View style={{ maxWidth: 860 }}>
      {items.map((item, n) => (
        <View key={item.id} style={[styles.listItem, n > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }]}>
          <StoryCard item={item} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: { lineHeight: 14 },
  kickerTopic: { fontFamily: FONT.sansBold, fontSize: 10, lineHeight: 14, letterSpacing: 1, textTransform: "uppercase" },
  kickerPlace: { fontFamily: FONT.sans, fontSize: 11, lineHeight: 14 },
  leadTitle: { fontFamily: FONT.headline, fontSize: 25, lineHeight: 31, letterSpacing: -0.2 },
  rowTitle: { fontFamily: FONT.headline, fontSize: 17, lineHeight: 23 },
  tileTitle: { fontFamily: FONT.headline, fontSize: 16, lineHeight: 21 },
  leadImage: { width: "100%", aspectRatio: 3 / 2, borderRadius: RADIUS.md },
  leadImageSide: { flex: 1, aspectRatio: 3 / 2, borderRadius: RADIUS.md },
  leadSide: { flexDirection: "row", gap: SPACE.xl, alignItems: "center" },
  tileImage: { width: "100%", aspectRatio: 3 / 2, borderRadius: RADIUS.md },
  row: { flexDirection: "row", gap: SPACE.lg, alignItems: "flex-start" },
  thumb: { width: 92, height: 92, borderRadius: RADIUS.md, marginTop: 2 },
  listItem: { paddingVertical: SPACE.lg + 2 },
});
