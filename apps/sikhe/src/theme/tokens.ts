/**
 * Sikhe's design tokens. Calm and warm: an off-white page, deep ink, and kesri
 * (saffron) used sparingly for the things that matter most. The dark palette is
 * soft enough to read Gurbani by at Amritvela.
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
  /** Kesri, for small marks and highlights. */
  accent: string;
  /** Kesri dark enough to read as text on `bg` and `surface`. */
  accentInk: string;
  /** A wash of kesri behind featured content. */
  accentWash: string;
  /** Text on a filled `accent` button. */
  onAccent: string;
  danger: string;
}

export const LIGHT: Colors = {
  bg: "#FAF7F2",
  surface: "#FFFFFF",
  sunken: "#F1ECE3",
  ink: "#1C1A17",
  inkSoft: "#5F5A52",
  inkFaint: "#8F887D",
  line: "#E6DFD3",
  accent: "#E8871E",
  accentInk: "#A85A0C",
  accentWash: "#FBEBD8",
  onAccent: "#FFFFFF",
  danger: "#B3261E",
};

export const DARK: Colors = {
  bg: "#12110F",
  surface: "#1C1A17",
  sunken: "#26231F",
  ink: "#F1ECE3",
  inkSoft: "#B0A89B",
  inkFaint: "#7D766B",
  line: "#2F2B26",
  accent: "#F0A04B",
  accentInk: "#F3B26B",
  accentWash: "#2E2216",
  onAccent: "#1C1A17",
  danger: "#F2B8B5",
};

/** Font family names, as loaded in the root layout. */
export const FONT = {
  display: "Fraunces_600SemiBold",
  displayItalic: "Fraunces_400Regular_Italic",
  sans: "Inter_400Regular",
  sansMedium: "Inter_500Medium",
  sansBold: "Inter_600SemiBold",
  gurmukhi: "NotoSerifGurmukhi_400Regular",
  gurmukhiBold: "NotoSerifGurmukhi_600SemiBold",
} as const;

/** Spacing steps, in points. */
export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const RADIUS = { sm: 8, md: 12, lg: 18, pill: 999 } as const;

/** The widest a column of reading gets on a big screen. */
export const READING_WIDTH = 720;
/** From this window width the app shows its tabs as a sidebar. */
export const WIDE = 900;
