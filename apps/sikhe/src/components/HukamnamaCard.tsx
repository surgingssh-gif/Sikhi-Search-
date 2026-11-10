import { Link } from "expo-router";
import { Pressable, StyleSheet } from "react-native";
import { useHukamnama } from "@/lib/api";
import { englishOf, openingLines } from "@/lib/shabad";
import { useTheme } from "@/theme/theme";
import { RADIUS, SPACE } from "@/theme/tokens";
import { Text } from "./Text";

/**
 * A small preview of today's Hukamnama for the front page: the opening line
 * and its meaning, with the whole Hukamnama on its own page.
 */
export function HukamnamaCard() {
  const { colors } = useTheme();
  const { data } = useHukamnama();
  const shabad = data?.shabads[0];
  const first = shabad ? openingLines(shabad.verses, 1)[0] : undefined;

  return (
    <Link href="/hukamnama" asChild>
      <Pressable accessibilityRole="link" accessibilityLabel="Read today's Hukamnama" style={StyleSheet.flatten([styles.card, { borderColor: colors.line, backgroundColor: colors.surface }])}>
        <Text variant="label">Today&apos;s Hukamnama</Text>
        {first ? (
          <>
            <Text variant="gurmukhi" style={{ fontSize: 18, lineHeight: 30 }} numberOfLines={2}>
              {first.gurmukhi}
            </Text>
            <Text variant="small" numberOfLines={2}>
              {englishOf(first)}
            </Text>
            <Text variant="meta">
              Sri Darbar Sahib · Ang {shabad!.ang}
              {shabad!.writer ? ` · ${shabad!.writer.english}` : ""}
            </Text>
          </>
        ) : (
          <Text variant="small">From Sri Darbar Sahib, Amritsar.</Text>
        )}
        <Text variant="button" color="accentInk">
          Read today&apos;s Hukamnama ›
        </Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { gap: SPACE.sm, padding: SPACE.lg, borderWidth: 1, borderRadius: RADIUS.md },
});
