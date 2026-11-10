import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from "react-native";
import type { NewsItem } from "@/lib/api";
import { openStory, timeAgo } from "@/lib/stories";
import { useTheme } from "@/theme/theme";
import { FONT, NARROW, RADIUS, SPACE } from "@/theme/tokens";
import { Text } from "./Text";

/**
 * News, set like a newspaper. Each story sits in its own box: a hairline
 * border on the paper, slightly rounded, darker on hover. A story's photo is
 * kept small, beside the headline, so the type leads and the photos never
 * shout. Boxes in a row share one height, so the page reads as a tidy grid.
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

/** "Nov 5", or "3h ago" for today's. */
const when = (item: NewsItem) => (item.publishedAt ? timeAgo(item.publishedAt) : "");

/** The kind in small spaced capitals, then the place in grey. */
function Kicker({ item }: { item: NewsItem }) {
  const { colors } = useTheme();
  const place = placeOf(item);
  return (
    <Text numberOfLines={1} style={styles.kicker}>
      <Text style={[styles.kickerKind, { color: colors.accentInk }]}>{topicOf(item).toUpperCase()}</Text>
      {place ? <Text style={[styles.kickerPlace, { color: colors.inkFaint }]}>{`   ${place}`}</Text> : null}
    </Text>
  );
}

function Byline({ item, time = true }: { item: NewsItem; time?: boolean }) {
  return (
    <Text variant="meta" color="inkFaint" numberOfLines={1}>
      {outletName(item.source)}
      {time && item.publishedAt ? `  ·  ${when(item)}` : ""}
    </Text>
  );
}

function Snippet({ item, lines }: { item: NewsItem; lines: number }) {
  if (!item.snippet) return null;
  return (
    <Text variant="small" numberOfLines={lines}>
      {item.snippet}
    </Text>
  );
}

/** A story in its box. Tapping opens the publisher's page. */
function Story({ item, style, children }: { item: NewsItem; style?: object; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => openStory(item)}
      accessibilityRole="link"
      style={(state) => {
        const hovered = (state as { hovered?: boolean }).hovered;
        return [
          styles.box,
          { backgroundColor: colors.surface, borderColor: hovered ? colors.inkSoft : colors.line, opacity: state.pressed ? 0.85 : 1 },
          style,
        ];
      }}
    >
      {children}
    </Pressable>
  );
}

/** A story's photo, small. Leaves itself out if there's none or it won't load. */
function Thumb({ item, width, height }: { item: NewsItem; width: number; height: number }) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  if (!item.image || failed) return null;
  return (
    <Image
      source={item.image}
      style={{ width, height, borderRadius: RADIUS.sm, backgroundColor: colors.sunken }}
      contentFit="cover"
      transition={200}
      onError={() => setFailed(true)}
      accessibilityIgnoresInvertColors
    />
  );
}

/** The lead story: the biggest headline on the page, with its summary and a small photo. Grows to fill its column. */
export function StoryLead({ item }: { item: NewsItem }) {
  const { colors } = useTheme();
  const wide = useWindowDimensions().width >= NARROW;
  return (
    <Story item={item} style={[styles.lead, wide && styles.leadWide]}>
      <View style={styles.withThumb}>
        <View style={{ flex: 1, gap: SPACE.sm }}>
          <Kicker item={item} />
          <Text style={[styles.leadTitle, { color: colors.ink }, wide && styles.leadTitleWide]}>{cleanTitle(item.title)}</Text>
          <Snippet item={item} lines={3} />
        </View>
        {wide ? <Thumb item={item} width={168} height={112} /> : <Thumb item={item} width={84} height={84} />}
      </View>
      <Byline item={item} />
    </Story>
  );
}

/** A small story box: the kind, the headline and the outlet. */
function SmallStory({ item, style, snippet = 0 }: { item: NewsItem; style?: object; snippet?: number }) {
  const { colors } = useTheme();
  return (
    <Story item={item} style={[styles.small, style]}>
      <View style={styles.withThumb}>
        <View style={{ flex: 1, gap: 6 }}>
          <Kicker item={item} />
          <Text style={[styles.smallTitle, { color: colors.ink }]}>{cleanTitle(item.title)}</Text>
          {snippet > 0 && <Snippet item={item} lines={snippet} />}
        </View>
        <Thumb item={item} width={64} height={64} />
      </View>
      <Byline item={item} />
    </Story>
  );
}

/** A column of story boxes, for beside the lead. They share the column's height. */
export function StoryHeadlines({ items, fill = false }: { items: NewsItem[]; fill?: boolean }) {
  return (
    <View style={[{ gap: SPACE.md }, fill && { flexGrow: 1 }]}>
      {items.map((item) => (
        <SmallStory key={item.id} item={item} style={fill ? { flexGrow: 1 } : undefined} />
      ))}
    </View>
  );
}

/** Story boxes side by side, all one height; stacked on a phone. */
export function StoryColumns({ items, snippet = 3 }: { items: NewsItem[]; snippet?: number }) {
  const [width, setWidth] = useState(0);
  const across = width >= 600;
  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={across ? { flexDirection: "row", gap: SPACE.md } : { gap: SPACE.md }}>
      {width > 0 && items.map((item) => <SmallStory key={item.id} item={item} snippet={snippet} style={across ? { flex: 1 } : undefined} />)}
    </View>
  );
}

/** The list: story boxes two across where there's room, one column on a phone. */
export function StoryList({ items }: { items: NewsItem[] }) {
  const [width, setWidth] = useState(0);
  const two = width >= 640;
  const tile = two ? (width - SPACE.md) / 2 : width;
  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACE.md }}>
      {width > 0 && items.map((item) => <SmallStory key={item.id} item={item} snippet={2} style={{ width: tile }} />)}
    </View>
  );
}

/** One story, for pages such as the map. */
export function StoryCard({ item }: { item: NewsItem; variant?: "lead" | "row" }) {
  return <SmallStory item={item} />;
}

const styles = StyleSheet.create({
  kicker: { lineHeight: 14 },
  kickerKind: { fontFamily: FONT.sansBold, fontSize: 10, lineHeight: 14, letterSpacing: 1 },
  kickerPlace: { fontFamily: FONT.sans, fontSize: 11, lineHeight: 14 },
  box: { borderWidth: 1, borderRadius: RADIUS.md },
  withThumb: { flexDirection: "row", gap: SPACE.lg, alignItems: "flex-start" },
  lead: { padding: SPACE.lg + 2, gap: SPACE.md, justifyContent: "space-between" },
  leadWide: { padding: SPACE.xl, flexGrow: 1 },
  leadTitle: { fontFamily: FONT.display, fontSize: 23, lineHeight: 28, letterSpacing: -0.2 },
  leadTitleWide: { fontSize: 28, lineHeight: 33 },
  small: { padding: SPACE.lg, gap: SPACE.md, justifyContent: "space-between" },
  smallTitle: { fontFamily: FONT.headline, fontSize: 17, lineHeight: 22 },
});
