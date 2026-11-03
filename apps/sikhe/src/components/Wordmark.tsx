import { View } from "react-native";
import { useTheme } from "@/theme/theme";
import { FONT } from "@/theme/tokens";
import { Text } from "./Text";

/** "Sikhe" set in Fraunces with a kesri full stop. No religious symbols. */
export function Wordmark({ size = 28 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <View accessible accessibilityRole="header" accessibilityLabel="Sikhe" style={{ flexDirection: "row", alignItems: "baseline" }}>
      <Text style={{ fontFamily: FONT.display, fontSize: size, lineHeight: size * 1.2, letterSpacing: -0.5, color: colors.ink }}>
        Sikhe
      </Text>
      <View style={{ width: size * 0.2, height: size * 0.2, borderRadius: size, backgroundColor: colors.accent, marginLeft: 2 }} />
    </View>
  );
}
