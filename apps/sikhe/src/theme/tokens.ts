/**
 * Sikhe's design tokens, in the style of a broadsheet newspaper: a white page,
 * black ink and rules, serif headlines, small sans-serif labels and one link
 * blue. The dark palette is soft enough to read Gurbani by at Amritvela.
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
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  sunken: "#F5F5F3",
  ink: "#121212",
  inkSoft: "#5A5A5A",
  inkFaint: "#727272",
  line: "#E2E2E2",
  rule: "#121212",
  accent: "#326891",
  accentInk: "#2B5A7E",
  accentWash: "#EEF3F8",
  onAccent: "#FFFFFF",
  danger: "#B3261E",
};

export const DARK: Colors = {
  bg: "#121212",
  surface: "#181818",
  sunken: "#202020",
  ink: "#F1F1F1",
  inkSoft: "#CDCDCD",
  inkFaint: "#9B9B9B",
  line: "#2E2E2E",
  rule: "#F1F1F1",
  accent: "#7FB3DC",
  accentInk: "#9CC4E4",
  accentWash: "#1C2730",
  onAccent: "#0B1520",
  danger: "#F2B8B5",
};

/** Font family names, as loaded in the root layout. */
export const FONT = {
  /** Headlines: Source Serif 4, bold. */
  display: "SourceSerif4_700Bold",
  displayItalic: "SourceSerif4_400Regular_Italic",
  /** Reading text. */
  serif: "SourceSerif4_400Regular",
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

export const RADIUS = { sm: 2, md: 4, lg: 6, pill: 999 } as const;

/** The widest a column of reading gets on a big screen. */
export const READING_WIDTH = 720;
/** From this window width the app shows its tabs as a sidebar. */
export const WIDE = 900;
