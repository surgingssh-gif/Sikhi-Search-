import { Text as RNText, type TextProps, type TextStyle } from "react-native";
import { useTheme } from "@/theme/theme";
import { FONT } from "@/theme/tokens";
import type { Colors } from "@/theme/tokens";

/**
 * The type scale. Headlines are set in Fraunces, everything you tap or skim in
 * Inter, and Gurbani in Noto Serif Gurmukhi with room to breathe.
 */
const VARIANTS = {
  /** Screen titles. */
  display: { fontFamily: FONT.display, fontSize: 34, lineHeight: 40, letterSpacing: -0.5 },
  /** Lead headlines. */
  headline: { fontFamily: FONT.display, fontSize: 24, lineHeight: 30, letterSpacing: -0.3 },
  /** Card and story titles. */
  title: { fontFamily: FONT.display, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: FONT.sans, fontSize: 16, lineHeight: 24 },
  /** Body text a step quieter: summaries and translations. */
  small: { fontFamily: FONT.sans, fontSize: 14, lineHeight: 20 },
  /** Bylines, dates and sources. */
  meta: { fontFamily: FONT.sans, fontSize: 13, lineHeight: 18 },
  /** Section labels, in small capitals. */
  label: { fontFamily: FONT.sansBold, fontSize: 12, lineHeight: 16, letterSpacing: 1.2, textTransform: "uppercase" },
  button: { fontFamily: FONT.sansBold, fontSize: 15, lineHeight: 20 },
  gurmukhi: { fontFamily: FONT.gurmukhi, fontSize: 22, lineHeight: 38 },
  gurmukhiLarge: { fontFamily: FONT.gurmukhi, fontSize: 26, lineHeight: 44 },
} satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof VARIANTS;

/** Which colour each variant takes unless told otherwise. */
const DEFAULT_COLOR: Record<TextVariant, keyof Colors> = {
  display: "ink",
  headline: "ink",
  title: "ink",
  body: "ink",
  small: "inkSoft",
  meta: "inkSoft",
  label: "accentInk",
  button: "ink",
  gurmukhi: "ink",
  gurmukhiLarge: "ink",
};

export function Text({
  variant = "body",
  color,
  style,
  ...props
}: TextProps & { variant?: TextVariant; color?: keyof Colors }) {
  const { colors } = useTheme();
  return (
    <RNText
      {...props}
      style={[VARIANTS[variant], { color: colors[color ?? DEFAULT_COLOR[variant]] }, style]}
    />
  );
}
