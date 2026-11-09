import { Text as RNText, type TextProps, type TextStyle } from "react-native";
import { useTheme } from "@/theme/theme";
import { FONT } from "@/theme/tokens";
import type { Colors } from "@/theme/tokens";

/**
 * The type scale, set like a newspaper: headlines and reading text in Source
 * Serif, labels and bylines in Libre Franklin, and Gurbani in Noto Serif
 * Gurmukhi with room to breathe.
 */
const VARIANTS = {
  /** Screen titles. */
  display: { fontFamily: FONT.display, fontSize: 32, lineHeight: 38, letterSpacing: -0.3 },
  /** Lead headlines. */
  headline: { fontFamily: FONT.display, fontSize: 26, lineHeight: 31, letterSpacing: -0.2 },
  /** Card and story titles. */
  title: { fontFamily: FONT.display, fontSize: 18, lineHeight: 23 },
  /** Reading text, in serif like a newspaper column. */
  body: { fontFamily: FONT.serif, fontSize: 17, lineHeight: 26 },
  /** Body text a step quieter: summaries and translations. */
  small: { fontFamily: FONT.serif, fontSize: 15, lineHeight: 22 },
  /** Bylines, dates and sources. */
  meta: { fontFamily: FONT.sans, fontSize: 12.5, lineHeight: 17 },
  /** Section labels, in small capitals. */
  label: { fontFamily: FONT.sansBold, fontSize: 11.5, lineHeight: 15, letterSpacing: 0.9, textTransform: "uppercase" },
  button: { fontFamily: FONT.sansBold, fontSize: 14, lineHeight: 19 },
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
  label: "ink",
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
