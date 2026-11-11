import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from "react-native";
import type { NewsItem } from "@/lib/api";
import { usePreview } from "@/lib/preview";
import { timeAgo, type Story } from "@/lib/stories";
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

const BEAT_LABEL: Record<NonNullable<NewsItem["beat"]>, string> = {
  rights: "Rights",
  justice: "Justice",
  khalistan: "Khalistan",
  punjab: "Punjab",
};

const topicOf = (item: NewsItem) =>
  item.kind ? KIND_LABEL[item.kind] : item.beat ? BEAT_LABEL[item.beat] : item.categories.includes("panth") ? "Panth" : "News";

/** Where a story happened, if that adds anything. */
function placeOf(item: NewsItem): string | null {
  if (item.place && !["Punjab", "India"].includes(item.place.name)) return item.place.name;
  return item.america ? "United States" : null;
}

/** The section and where, like "Seva · Coventry" or "Justice · Surrey". */
export function kickerOf(item: NewsItem): string {
  const place = placeOf(item);
  return place ? `${topicOf(item)} · ${place}` : topicOf(item);
}

/** An outlet's name as a reader would say it: "www.babushahi.com" becomes "Babushahi". */
export function outletName(source: string): string {
  const s = tidy(source);
  if (!/^(www\.)?[\w-]+(\.[\w-]+)+$/i.test(s)) return s;
  const name = s
    .replace(/^www\./i, "")
    .replace(/(\.(co|com))?\.(com|net|org|in|uk|au|ca|news|info)$/i, "")
    .replace(/\.(com|co)$/i, "");
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** "The Nation (Pakistan )" becomes "The Nation (Pakistan)". */
const tidy = (name: string) => name.replace(/\(\s+/g, "(").replace(/\s+\)/g, ")").replace(/\s{2,}/g, " ").trim();

/** A headline without the section tag some outlets add: "… a year | Trending" becomes "… a year". */
export function cleanTitle(title: string): string {
  // Outlets add tails after a bar: "| Trending", "| Tap to know more | Inshorts". The headline is what comes first.
  const [first = title] = title.split(/\s+\|\s+/);
  return (first.length >= 20 ? first : title)
    .replace(/\s+[–—-]\s+(Trending|Latest|News|Breaking|Watch|Video|Photos?|Exclusive|Opinion)\s*$/i, "")
    .replace(/\s*\((Video|Watch|Photos?)\)\s*$/i, "")
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

/** "+2 more outlets", for a story several outlets covered. */
function alsoIn(item: Story): string {
  const n = item.also?.length ?? 0;
  return n ? `+${n} more ${n === 1 ? "outlet" : "outlets"}` : "";
}

/** One quiet line: the outlet, when, and how many others covered it. */
function Byline({ item }: { item: Story }) {
  const also = alsoIn(item);
  return (
    <Text variant="meta" color="inkFaint" numberOfLines={1}>
      <Text variant="meta" color="inkSoft" style={{ fontFamily: FONT.sansMedium }}>
        {outletName(item.source)}
      </Text>
      {item.publishedAt ? `  ·  ${when(item)}` : ""}
      {also ? `  ·  ${also}` : ""}
    </Text>
  );
}

/** What happened and why it matters: our summary, or failing that the publisher's own description. */
function Snippet({ item, lines }: { item: NewsItem; lines: number }) {
  const text = item.summary ?? item.snippet;
  if (!text) return null;
  return (
    <Text variant="small" numberOfLines={lines}>
      {text}
    </Text>
  );
}

/** A story in its box. Tapping opens its preview. */
function Story({ item, style, children }: { item: Story; style?: object; children: React.ReactNode }) {
  const { colors } = useTheme();
  const preview = usePreview();
  return (
    <Pressable
      onPress={() => preview(item)}
      accessibilityRole="button"
      accessibilityHint="Opens a preview of the story"
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
        {wide ? <Thumb item={item} width={144} height={96} /> : <Thumb item={item} width={72} height={72} />}
      </View>
      <Byline item={item} />
    </Story>
  );
}

/** A small story box: the kind, the headline and the outlet. */
function SmallStory({ item, style, snippet = 0, photo = true }: { item: Story; style?: object; snippet?: number; photo?: boolean }) {
  const { colors } = useTheme();
  return (
    <Story item={item} style={[styles.small, style]}>
      <View style={styles.withThumb}>
        <View style={{ flex: 1, gap: 5 }}>
          <Kicker item={item} />
          <Text style={[styles.smallTitle, { color: colors.ink }]}>{cleanTitle(item.title)}</Text>
          {snippet > 0 && <Snippet item={item} lines={snippet} />}
        </View>
        {photo && <Thumb item={item} width={56} height={56} />}
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
        <SmallStory key={item.id} item={item} snippet={2} style={fill ? { flexGrow: 1 } : undefined} />
      ))}
    </View>
  );
}

/** Story boxes side by side, all one height; stacked on a phone. */
export function StoryColumns({ items, snippet = 2 }: { items: NewsItem[]; snippet?: number }) {
  const [width, setWidth] = useState(0);
  const across = width >= 600;
  // A photo only where a column is wide enough to keep the headline roomy.
  const column = across ? (width - SPACE.md * (items.length - 1)) / items.length : width;
  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={across ? { flexDirection: "row", gap: SPACE.md } : { gap: SPACE.md }}>
      {width > 0 && items.map((item) => <SmallStory key={item.id} item={item} snippet={snippet} photo={column >= 300} style={across ? { flex: 1 } : undefined} />)}
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
      {width > 0 && items.map((item) => <SmallStory key={item.id} item={item} style={{ width: tile }} />)}
    </View>
  );
}

/** One story, for pages such as the map. */
export function StoryCard({ item }: { item: NewsItem; variant?: "lead" | "row" }) {
  return <SmallStory item={item} />;
}

const styles = StyleSheet.create({
  kicker: { lineHeight: 13 },
  kickerKind: { fontFamily: FONT.sansBold, fontSize: 9.5, lineHeight: 13, letterSpacing: 1 },
  kickerPlace: { fontFamily: FONT.sans, fontSize: 10.5, lineHeight: 13 },
  box: { borderWidth: 1, borderRadius: RADIUS.md },
  withThumb: { flexDirection: "row", gap: SPACE.md, alignItems: "flex-start" },
  lead: { padding: SPACE.lg + 2, gap: SPACE.md, justifyContent: "space-between" },
  leadWide: { padding: SPACE.xl },
  leadTitle: { fontFamily: FONT.display, fontSize: 20, lineHeight: 24.5, letterSpacing: -0.2 },
  leadTitleWide: { fontSize: 26, lineHeight: 30.5 },
  small: { padding: SPACE.lg, gap: SPACE.sm + 2, justifyContent: "space-between" },
  smallTitle: { fontFamily: FONT.headline, fontSize: 16, lineHeight: 20.5, letterSpacing: -0.1 },
});
