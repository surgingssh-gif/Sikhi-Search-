/**
 * Sikhe's design tokens, in the style of a financial broadsheet: warm paper,
 * black ink, hairline rules, serif headlines, small spaced sans-serif labels
 * and one bright blue. The dark palette is soft enough to read Gurbani by at Amritvela.
 */

export interface Colors {
  /** The page. */
  bg: string;
  /** Cards and sheets that sit on the page. */
  surface: string;
  /** A quieter fill: chips, inputs, pressed rows. */
  sunken: string;
  ink: string;
  /** Secondary text: bylines, dates, captions. */
  inkSoft: string;
  /** Tertiary text and inactive icons. */
  inkFaint: string;
  line: string;
  /** The heavy rules a newspaper uses between sections. */
  rule: string;
  /** The link blue, for small marks and highlights. */
  accent: string;
  /** Blue dark enough to read as text on `bg` and `surface`. */
  accentInk: string;
  /** A wash of blue behind highlighted content. */
  accentWash: string;
  /** Text on a filled `accent` button. */
  onAccent: string;
  danger: string;
}

export const LIGHT: Colors = {
  bg: "#FBFAF7",
  surface: "#FBFAF7",
  sunken: "#F3F1EC",
  ink: "#121212",
  inkSoft: "#45443F",
  inkFaint: "#6B6A66",
  line: "#DCDAD3",
  rule: "#121212",
  accent: "#2A78D6",
  accentInk: "#2266BC",
  accentWash: "#E9F0F9",
  onAccent: "#FFFFFF",
  danger: "#C2383A",
};

export const DARK: Colors = {
  bg: "#161615",
  surface: "#161615",
  sunken: "#1F1F1D",
  ink: "#F2F1EC",
  inkSoft: "#C3C2B7",
  inkFaint: "#9A9890",
  line: "#2E2E2B",
  rule: "#F2F1EC",
  accent: "#3987E5",
  accentInk: "#6FA8EE",
  accentWash: "#1B2534",
  onAccent: "#0B1520",
  danger: "#E66767",
};

/** Font family names, as loaded in the root layout. */
export const FONT = {
  /** Headlines: Source Serif 4, bold. */
  display: "SourceSerif4_700Bold",
  displayItalic: "SourceSerif4_400Regular_Italic",
  /** Reading text. */
  serif: "SourceSerif4_400Regular",
  /** News headlines: a step lighter than the bold display face, for easy scanning. */
  headline: "SourceSerif4_600SemiBold",
  serifBold: "SourceSerif4_700Bold",
  /** Labels, bylines and controls: Libre Franklin. */
  sans: "LibreFranklin_400Regular",
  sansMedium: "LibreFranklin_500Medium",
  sansBold: "LibreFranklin_700Bold",
  /** The nameplate only. */
  blackletter: "UnifrakturMaguntia_400Regular",
  gurmukhi: "NotoSerifGurmukhi_400Regular",
  gurmukhiBold: "NotoSerifGurmukhi_600SemiBold",
} as const;

/** Spacing steps, in points. */
export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const RADIUS = { sm: 4, md: 6, lg: 6, pill: 999 } as const;

/** The widest a column of reading gets on a big screen. */
export const READING_WIDTH = 720;
/** The widest the page gets, masthead included. */
export const PAGE_WIDTH = 1160;
/** From this width pages set a side column beside the main one. */
export const WIDE = 980;
/** Below this width the masthead stacks and its sections scroll sideways. */
export const NARROW = 680;
