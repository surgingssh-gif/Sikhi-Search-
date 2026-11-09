import { Image } from "expo-image";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import type { NewsItem } from "@/lib/api";
import { openStory, timeAgo } from "@/lib/stories";
import { useTheme } from "@/theme/theme";
import { NARROW, RADIUS, SPACE } from "@/theme/tokens";
import { Text } from "./Text";

function Byline({ item }: { item: NewsItem }) {
  return (
    <Text variant="meta" numberOfLines={1}>
      {[item.source, item.place?.name, timeAgo(item.publishedAt)].filter(Boolean).join(" · ")}
    </Text>
  );
}

/**
 * A news story. "lead" is a big photo over the headline; "row" is a headline
 * with a small photo beside it. Tapping opens the publisher's page.
 */
export function StoryCard({ item, variant = "row" }: { item: NewsItem; variant?: "lead" | "row" }) {
  const { colors } = useTheme();
  const open = () => openStory(item);
  // On wider screens the lead sets its photo beside the headline.
  const side = useWindowDimensions().width >= NARROW;

  if (variant === "lead") {
    return (
      <Pressable
        onPress={open}
        accessibilityRole="link"
        style={({ pressed }) => [side ? styles.leadSide : { gap: SPACE.md }, { opacity: pressed ? 0.85 : 1 }]}
      >
        {item.image && (
          <Image
            source={item.image}
            style={[styles.leadImage, side && { flex: 0.75, aspectRatio: 4 / 3 }, { backgroundColor: colors.sunken }]}
            contentFit="cover"
            transition={200}
            accessibilityIgnoresInvertColors
          />
        )}
        <View style={{ gap: SPACE.sm, flex: side ? 1 : undefined }}>
          <Text variant="headline">{item.title}</Text>
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
      <View style={{ flex: 1, gap: SPACE.xs }}>
        <Text variant="title" numberOfLines={3}>
          {item.title}
        </Text>
        <Byline item={item} />
      </View>
      {item.image && <Image source={item.image} style={[styles.thumb, { backgroundColor: colors.sunken }]} contentFit="cover" transition={200} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  leadImage: { width: "100%", aspectRatio: 16 / 9, borderRadius: RADIUS.md },
  leadSide: { flexDirection: "row", gap: SPACE.xl, alignItems: "center" },
  row: { flexDirection: "row", gap: SPACE.md, alignItems: "flex-start" },
  thumb: { width: 84, height: 84, borderRadius: RADIUS.sm },
});
