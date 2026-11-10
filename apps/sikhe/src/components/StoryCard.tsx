import { useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from "react-native";
import type { NewsItem } from "@/lib/api";
import { openStory, timeAgo } from "@/lib/stories";
import { useTheme } from "@/theme/theme";
import { FONT, NARROW, SPACE } from "@/theme/tokens";
import { Text } from "./Text";

/**
 * News, set like a newspaper: all type, no photos or boxes. Structure comes
 * from columns, hairlines and size: a lead story, a column of headlines beside
 * it, a row of three, then a list with the date in the margin.
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

/** A story you can tap: opens the publisher's page. */
function Story({ item, style, children }: { item: NewsItem; style?: object; children: React.ReactNode }) {
  return (
    <Pressable onPress={() => openStory(item)} accessibilityRole="link" style={({ pressed }) => [style, { opacity: pressed ? 0.6 : 1 }]}>
      {children}
    </Pressable>
  );
}

/** The lead story: the biggest headline on the page, with its summary. */
export function StoryLead({ item }: { item: NewsItem }) {
  const { colors } = useTheme();
  const wide = useWindowDimensions().width >= NARROW;
  return (
    <Story item={item} style={{ gap: SPACE.sm }}>
      <Kicker item={item} />
      <Text style={[styles.leadTitle, { color: colors.ink }, wide && styles.leadTitleWide]}>{cleanTitle(item.title)}</Text>
      <Snippet item={item} lines={4} />
      <Byline item={item} />
    </Story>
  );
}

/** A short column of headlines, for beside the lead. */
export function StoryHeadlines({ items }: { items: NewsItem[] }) {
  const { colors } = useTheme();
  return (
    <View>
      {items.map((item, n) => (
        <Story key={item.id} item={item} style={[styles.headline, n > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }]}>
          <Kicker item={item} />
          <Text style={[styles.headlineTitle, { color: colors.ink }]}>{cleanTitle(item.title)}</Text>
          <Byline item={item} />
        </Story>
      ))}
    </View>
  );
}

/** Stories three across, split by hairlines like newspaper columns. Stacked on a phone. */
export function StoryColumns({ items }: { items: NewsItem[] }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const across = width >= 600;
  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={across ? { flexDirection: "row" } : undefined}>
      {width > 0 &&
        items.map((item, n) => (
          <Story
            key={item.id}
            item={item}
            style={
              across
                ? [styles.column, n > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.line, paddingLeft: SPACE.xl }, n < items.length - 1 && { paddingRight: SPACE.xl }]
                : [styles.stacked, n > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }]
            }
          >
            <Kicker item={item} />
            <Text style={[styles.columnTitle, { color: colors.ink }]}>{cleanTitle(item.title)}</Text>
            <Snippet item={item} lines={3} />
            <Byline item={item} />
          </Story>
        ))}
    </View>
  );
}

/** The list: the date in the margin, then the kind, headline and outlet. On a phone the date moves under the headline. */
export function StoryList({ items }: { items: NewsItem[] }) {
  const { colors } = useTheme();
  const wide = useWindowDimensions().width >= NARROW;
  return (
    <View style={{ maxWidth: 860 }}>
      {items.map((item, n) => (
        <Story key={item.id} item={item} style={[styles.river, n > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }]}>
          {wide && (
            <Text variant="meta" color="inkFaint" style={styles.riverTime}>
              {when(item)}
            </Text>
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <Kicker item={item} />
            <Text style={[styles.riverTitle, { color: colors.ink }]}>{cleanTitle(item.title)}</Text>
            <Snippet item={item} lines={2} />
            <Byline item={item} time={!wide} />
          </View>
        </Story>
      ))}
    </View>
  );
}

/** One story in the list, for pages such as the map. */
export function StoryCard({ item }: { item: NewsItem; variant?: "lead" | "row" }) {
  const { colors } = useTheme();
  return (
    <Story item={item} style={{ gap: 4 }}>
      <Kicker item={item} />
      <Text style={[styles.riverTitle, { color: colors.ink }]}>{cleanTitle(item.title)}</Text>
      <Byline item={item} />
    </Story>
  );
}

const styles = StyleSheet.create({
  kicker: { lineHeight: 14 },
  kickerKind: { fontFamily: FONT.sansBold, fontSize: 10, lineHeight: 14, letterSpacing: 1 },
  kickerPlace: { fontFamily: FONT.sans, fontSize: 11, lineHeight: 14 },
  leadTitle: { fontFamily: FONT.display, fontSize: 28, lineHeight: 33, letterSpacing: -0.3 },
  leadTitleWide: { fontSize: 36, lineHeight: 41 },
  headline: { gap: 4, paddingVertical: SPACE.md + 2 },
  headlineTitle: { fontFamily: FONT.headline, fontSize: 16, lineHeight: 21 },
  column: { flex: 1, gap: 6 },
  stacked: { gap: 6, paddingVertical: SPACE.lg },
  columnTitle: { fontFamily: FONT.headline, fontSize: 18, lineHeight: 23 },
  river: { flexDirection: "row", gap: SPACE.lg, paddingVertical: SPACE.lg },
  riverTime: { width: 64, paddingTop: 1, fontFamily: FONT.sansMedium },
  riverTitle: { fontFamily: FONT.headline, fontSize: 17, lineHeight: 23 },
});
