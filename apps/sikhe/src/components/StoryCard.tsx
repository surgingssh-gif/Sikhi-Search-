import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from "react-native";
import type { NewsItem } from "@/lib/api";
import { openStory, timeAgo } from "@/lib/stories";
import { useTheme } from "@/theme/theme";
import { FONT, NARROW, POSTERS, RADIUS, SPACE, type PosterColors, type PosterTone } from "@/theme/tokens";
import { Text } from "./Text";

/**
 * News stories. Sikhe shows no news photos: they come from dozens of outlets
 * and never match. Instead the headline is the picture, set as a poster on a
 * panel coloured by its kind of good news, and the list below is plain type.
 */

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
  return title
    .replace(/\s+[|–—-]\s+(Trending|Latest|News|Breaking|Watch|Video|Photos?|Exclusive|Opinion)\s*$/i, "")
    .replace(/\s+\|\s+[^|]{1,30}$/, "")
    .trim();
}

const byline = (item: NewsItem) => `${outletName(item.source)}${item.publishedAt ? `  ·  ${timeAgo(item.publishedAt)}` : ""}`;

/** The poster colours for a tone, in the current light or dark. */
function usePoster(tone: PosterTone): PosterColors {
  const { dark } = useTheme();
  return POSTERS[dark ? "dark" : "light"][tone];
}

const toneOf = (item: NewsItem): PosterTone => item.kind ?? "community";

/** The label on a poster: the kind in spaced capitals, then the place. */
function PosterLabel({ item, colors }: { item: NewsItem; colors: PosterColors }) {
  const place = placeOf(item);
  return (
    <Text numberOfLines={1} style={[styles.posterLabel, { color: colors.label }]}>
      {topicOf(item).toUpperCase()}
      {place ? <Text style={[styles.posterPlace, { color: colors.label }]}>{`  ·  ${place}`}</Text> : null}
    </Text>
  );
}

/** The lead story: a large dark poster that anchors the page. */
function LeadPoster({ item }: { item: NewsItem }) {
  const colors = usePoster("lead");
  const wide = useWindowDimensions().width >= NARROW;
  return (
    <Pressable
      onPress={() => openStory(item)}
      accessibilityRole="link"
      style={({ pressed }) => [styles.lead, { backgroundColor: colors.bg, opacity: pressed ? 0.92 : 1 }, wide && styles.leadWide]}
    >
      <PosterLabel item={item} colors={colors} />
      <View style={{ gap: SPACE.md, maxWidth: 760 }}>
        <Text style={[styles.leadTitle, { color: colors.ink }, wide && { fontSize: 38, lineHeight: 44 }]}>{cleanTitle(item.title)}</Text>
        {item.snippet ? (
          <Text numberOfLines={3} style={[styles.leadSnippet, { color: colors.soft }]}>
            {item.snippet}
          </Text>
        ) : null}
      </View>
      <Text numberOfLines={1} style={[styles.posterByline, { color: colors.soft }]}>
        {byline(item)}
      </Text>
    </Pressable>
  );
}

/** A story as a poster coloured by its kind. */
function Poster({ item, width }: { item: NewsItem; width: number }) {
  const colors = usePoster(toneOf(item));
  return (
    <Pressable
      onPress={() => openStory(item)}
      accessibilityRole="link"
      style={({ pressed }) => [styles.poster, { width, backgroundColor: colors.bg, opacity: pressed ? 0.9 : 1 }]}
    >
      <PosterLabel item={item} colors={colors} />
      <View style={{ gap: SPACE.sm }}>
        <Text style={[styles.posterTitle, { color: colors.ink }]}>{cleanTitle(item.title)}</Text>
        <Text numberOfLines={1} style={[styles.posterByline, { color: colors.soft }]}>
          {byline(item)}
        </Text>
      </View>
    </Pressable>
  );
}

/** A story in the list: plain type, the kind and place above the headline. */
function StoryRow({ item }: { item: NewsItem }) {
  const { colors } = useTheme();
  const place = placeOf(item);
  return (
    <Pressable onPress={() => openStory(item)} accessibilityRole="link" style={({ pressed }) => [{ gap: 5, opacity: pressed ? 0.7 : 1 }]}>
      <Text numberOfLines={1} style={styles.rowLabel}>
        <Text style={[styles.rowKind, { color: colors.accentInk }]}>{topicOf(item).toUpperCase()}</Text>
        {place ? <Text style={[styles.rowPlace, { color: colors.inkFaint }]}>{`   ${place}`}</Text> : null}
      </Text>
      <Text style={[styles.rowTitle, { color: colors.ink }]}>{cleanTitle(item.title)}</Text>
      <Text variant="meta" color="inkFaint" numberOfLines={1}>
        {byline(item)}
      </Text>
    </Pressable>
  );
}

/** A news story: "lead" is the big dark poster at the top, "row" a story in the list. Tapping opens the publisher's page. */
export function StoryCard({ item, variant = "row" }: { item: NewsItem; variant?: "lead" | "row" }) {
  return variant === "lead" ? <LeadPoster item={item} /> : <StoryRow item={item} />;
}

/** Stories as posters: on a phone a row you swipe through, where there's room a grid three across. */
export function StoryGrid({ items }: { items: NewsItem[] }) {
  const [width, setWidth] = useState(0);
  const phone = useWindowDimensions().width < NARROW;

  if (phone) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={252 + SPACE.md}
        style={{ marginHorizontal: -SPACE.xl + 4 }}
        contentContainerStyle={{ gap: SPACE.md, paddingHorizontal: SPACE.xl - 4 }}
      >
        {items.map((item) => (
          <Poster key={item.id} item={item} width={252} />
        ))}
      </ScrollView>
    );
  }

  const columns = width >= 640 ? 3 : 2;
  const gap = SPACE.lg;
  const tile = width ? (width - gap * (columns - 1)) / columns : 0;
  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={{ flexDirection: "row", flexWrap: "wrap", gap }}>
      {tile > 0 && items.map((item) => <Poster key={item.id} item={item} width={tile} />)}
    </View>
  );
}

/** Stories as a list of plain type split by hairlines, kept to a readable width. */
export function StoryList({ items }: { items: NewsItem[] }) {
  const { colors } = useTheme();
  return (
    <View style={{ maxWidth: 760 }}>
      {items.map((item, n) => (
        <View key={item.id} style={[styles.listItem, n > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }]}>
          <StoryRow item={item} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  posterLabel: { fontFamily: FONT.sansBold, fontSize: 10.5, lineHeight: 14, letterSpacing: 1.1 },
  posterPlace: { fontFamily: FONT.sansMedium, fontSize: 10.5, lineHeight: 14, letterSpacing: 0.3 },
  posterByline: { fontFamily: FONT.sansMedium, fontSize: 11.5, lineHeight: 16 },
  lead: { borderRadius: RADIUS.lg, padding: SPACE.xl, minHeight: 300, justifyContent: "space-between", gap: SPACE.xl },
  leadWide: { padding: SPACE.xxl + 8, minHeight: 340 },
  leadTitle: { fontFamily: FONT.headline, fontSize: 30, lineHeight: 36, letterSpacing: -0.3 },
  leadSnippet: { fontFamily: FONT.serif, fontSize: 15, lineHeight: 22 },
  poster: { borderRadius: RADIUS.lg, padding: SPACE.lg + 2, minHeight: 210, justifyContent: "space-between", gap: SPACE.xl },
  posterTitle: { fontFamily: FONT.headline, fontSize: 19, lineHeight: 24, letterSpacing: -0.1 },
  rowLabel: { lineHeight: 14 },
  rowKind: { fontFamily: FONT.sansBold, fontSize: 10, lineHeight: 14, letterSpacing: 1 },
  rowPlace: { fontFamily: FONT.sans, fontSize: 11, lineHeight: 14 },
  rowTitle: { fontFamily: FONT.headline, fontSize: 18, lineHeight: 24 },
  listItem: { paddingVertical: SPACE.lg + 2 },
});
