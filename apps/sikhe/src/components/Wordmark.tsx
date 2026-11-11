import { View } from "react-native";
import { useTheme } from "@/theme/theme";
import { FONT } from "@/theme/tokens";
import { Text } from "./Text";

/**
 * The nameplate: "Sikhe" in Playfair Display Black Italic with a blue initial,
 * between two fine rules with a small diamond at each inner end, over a spaced
 * tagline, like a magazine's masthead. No religious symbols.
 */
export function Wordmark({ size = 28, tagline = true }: { size?: number; tagline?: boolean }) {
  const { colors } = useTheme();
  const ornament = (side: "left" | "right") => (
    <View style={{ flexDirection: side === "left" ? "row" : "row-reverse", alignItems: "center", width: size * 2.4 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.ink, opacity: 0.55 }} />
      <View style={{ width: 5, height: 5, marginHorizontal: 6, backgroundColor: colors.accent, transform: [{ rotate: "45deg" }] }} />
    </View>
  );
  return (
    <View style={{ alignItems: "center" }} accessibilityRole="header" accessibilityLabel="Sikhe">
      <View style={{ flexDirection: "row", alignItems: "center", gap: size * 0.3 }}>
        {ornament("left")}
        <Text style={{ fontFamily: FONT.nameplateItalic, fontSize: size, lineHeight: size * 1.18, letterSpacing: -0.3, color: colors.ink }}>
          <Text style={{ fontFamily: FONT.nameplateItalic, fontSize: size * 1.12, color: colors.accent }}>S</Text>
          ikhe
        </Text>
        {ornament("right")}
      </View>
      {tagline && (
        <Text style={{ fontFamily: FONT.sansBold, fontSize: Math.max(8, size * 0.24), letterSpacing: size * 0.075, color: colors.inkSoft, marginTop: 1 }}>
          NEWS OF THE SIKH KAUM
        </Text>
      )}
    </View>
  );
}
