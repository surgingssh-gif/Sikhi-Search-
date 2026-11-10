import { useTheme } from "@/theme/theme";
import { FONT } from "@/theme/tokens";
import { Text } from "./Text";

/** The nameplate: "Sikhe" in a high-contrast display serif, like a magazine's masthead. No religious symbols. */
export function Wordmark({ size = 28 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <Text
      accessibilityRole="header"
      accessibilityLabel="Sikhe"
      style={{ fontFamily: FONT.nameplate, fontSize: size, lineHeight: size * 1.2, letterSpacing: -0.5, color: colors.ink, textAlign: "center" }}
    >
      Sikhe
    </Text>
  );
}
