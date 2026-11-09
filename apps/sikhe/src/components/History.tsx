import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import type { HistoryEvent } from "@/lib/api";
import { eventDate, type HistoryCollection, type WikiSummary } from "@/lib/history";
import { useTheme } from "@/theme/theme";
import { RADIUS, SPACE } from "@/theme/tokens";
import { Text } from "./Text";

const articleHref = (title: string) => ({ pathname: "/article" as const, params: { title } });

/** An article in a list: a thumbnail, its title and Wikipedia's one-line description. */
export function ArticleRow({ item }: { item: WikiSummary }) {
  const { colors } = useTheme();
  return (
    <Link href={articleHref(item.title)} asChild>
      <Pressable accessibilityRole="link" style={styles.row}>
        {item.thumbnail ? (
          <Image source={item.thumbnail} style={[styles.thumb, { backgroundColor: colors.sunken }]} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.noThumb, { backgroundColor: colors.sunken }]}>
            <Ionicons name="time-outline" size={22} color={colors.inkFaint} />
          </View>
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="title">{item.title}</Text>
          {item.description ? <Text variant="meta">{item.description}</Text> : null}
          {item.extract ? (
            <Text variant="small" numberOfLines={2}>
              {item.extract}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
}

/** A collection as a row of picture cards that scrolls sideways. */
export function CollectionCarousel({ collection }: { collection: HistoryCollection }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: SPACE.sm }}>
      <View>
        <Text variant="label" accessibilityRole="header">
          {collection.title}
        </Text>
        <Text variant="meta">{collection.blurb}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -SPACE.xl + 4 }} contentContainerStyle={{ gap: SPACE.md, paddingHorizontal: SPACE.xl - 4 }}>
        {collection.items.map((item) => (
          <Link key={item.title} href={articleHref(item.title)} asChild>
            <Pressable accessibilityRole="link" style={StyleSheet.flatten([styles.card, { backgroundColor: colors.surface, borderColor: colors.line }])}>
              {item.thumbnail ? (
                <Image source={item.thumbnail} style={[styles.cardImage, { backgroundColor: colors.sunken }]} contentFit="cover" contentPosition="top" />
              ) : (
                <View style={[styles.cardImage, styles.noThumb, { backgroundColor: colors.accentWash }]}>
                  <Ionicons name="time-outline" size={28} color={colors.accentInk} />
                </View>
              )}
              <View style={{ padding: SPACE.md, gap: 2 }}>
                <Text variant="title" numberOfLines={2} style={{ fontSize: 16, lineHeight: 21 }}>
                  {item.title}
                </Text>
                <Text variant="meta" numberOfLines={2}>
                  {item.description}
                </Text>
              </View>
            </Pressable>
          </Link>
        ))}
      </ScrollView>
    </View>
  );
}

/** A dated event from our own timeline. Opens its Wikipedia article. */
export function EventRow({ event, when }: { event: HistoryEvent; when?: string }) {
  return (
    <Link href={articleHref(event.wiki)} asChild>
      <Pressable accessibilityRole="link" style={{ gap: 2 }}>
        <Text variant="meta" color="accentInk">
          {when ?? eventDate(event.date)}
        </Text>
        <Text variant="title">{event.title}</Text>
        <Text variant="small">{event.summary}</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: SPACE.md, alignItems: "flex-start" },
  thumb: { width: 64, height: 64, borderRadius: RADIUS.sm },
  noThumb: { alignItems: "center", justifyContent: "center" },
  card: { width: 168, borderRadius: RADIUS.md, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  cardImage: { width: "100%", height: 150 },
});
