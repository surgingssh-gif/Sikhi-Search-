import { useTheme } from "@/theme/theme";
import { FONT } from "@/theme/tokens";
import { Text } from "./Text";

/** The nameplate: "Sikhe" in blackletter, as on a newspaper's front page. No religious symbols. */
export function Wordmark({ size = 28 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <Text
      accessibilityRole="header"
      accessibilityLabel="Sikhe"
      style={{ fontFamily: FONT.blackletter, fontSize: size, lineHeight: size * 1.15, color: colors.ink, textAlign: "center" }}
    >
      Sikhe
    </Text>
  );
}
