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

/**
 * Story posters. Sikhe shows no news photos: the headline itself is the
 * picture, set on a panel coloured by the kind of good news. A small, muted
 * set that sits calmly on the warm paper. Each has its panel, its label colour
 * and its headline colour, for light and dark.
 */
export interface PosterColors {
  bg: string;
  label: string;
  ink: string;
  /** Bylines and summaries on the panel. */
  soft: string;
}

export type PosterTone = "lead" | "achievement" | "seva" | "celebration" | "heritage" | "youth" | "community";

export const POSTERS: Record<"light" | "dark", Record<PosterTone, PosterColors>> = {
  light: {
    lead: { bg: "#2C2C2A", label: "#FAC775", ink: "#F6F4EE", soft: "#B4B2A9" },
    achievement: { bg: "#E6F1FB", label: "#185FA5", ink: "#042C53", soft: "#3D5F80" },
    seva: { bg: "#FAEEDA", label: "#854F0B", ink: "#412402", soft: "#7A5A2E" },
    celebration: { bg: "#FAECE7", label: "#993C1D", ink: "#4A1B0C", soft: "#7E4A38" },
    heritage: { bg: "#E1F5EE", label: "#0F6E56", ink: "#04342C", soft: "#3A6658" },
    youth: { bg: "#EAF3DE", label: "#3B6D11", ink: "#173404", soft: "#4C6634" },
    community: { bg: "#F1EFE8", label: "#5F5E5A", ink: "#2C2C2A", soft: "#6B6A66" },
  },
  dark: {
    lead: { bg: "#F2F1EC", label: "#854F0B", ink: "#161615", soft: "#5F5E5A" },
    achievement: { bg: "#0C447C", label: "#B5D4F4", ink: "#E6F1FB", soft: "#9DBBD8" },
    seva: { bg: "#633806", label: "#FAC775", ink: "#FAEEDA", soft: "#D9BE94" },
    celebration: { bg: "#712B13", label: "#F5C4B3", ink: "#FAECE7", soft: "#D8AE9F" },
    heritage: { bg: "#085041", label: "#9FE1CB", ink: "#E1F5EE", soft: "#A3C9BC" },
    youth: { bg: "#27500A", label: "#C0DD97", ink: "#EAF3DE", soft: "#AFC496" },
    community: { bg: "#444441", label: "#D3D1C7", ink: "#F1EFE8", soft: "#B4B2A9" },
  },
};
