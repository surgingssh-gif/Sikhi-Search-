import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import type { Shabad, Verse } from "@/lib/api";
import { isHeading } from "@/lib/gurbani";
import { useLibrary, type GurmukhiSize } from "@/lib/library";
import { englishOf } from "@/lib/shabad";
import { useTheme } from "@/theme/theme";
import { FONT, RADIUS, SPACE } from "@/theme/tokens";
import { Text } from "./Text";
import { Chip } from "./ui";

const GURMUKHI_SIZE: Record<GurmukhiSize, { fontSize: number; lineHeight: number }> = {
  md: { fontSize: 20, lineHeight: 34 },
  lg: { fontSize: 24, lineHeight: 40 },
  xl: { fontSize: 30, lineHeight: 50 },
};

/**
 * One line of Gurbani as the reader likes it: Gurmukhi (padched or larivaar),
 * then the transliteration and English meaning if they want them.
 */
export function VerseView({ verse, highlight }: { verse: Verse; highlight?: boolean }) {
  const { colors } = useTheme();
  const { prefs } = useLibrary();
  if (isHeading(verse)) {
    return (
      <Text variant="meta" style={{ fontStyle: "italic", textAlign: "center" }}>
        {englishOf(verse)}
      </Text>
    );
  }
  return (
    <View style={[styles.verse, highlight && { backgroundColor: colors.accentWash, borderRadius: RADIUS.md, padding: SPACE.md, marginHorizontal: -SPACE.md }]}>
      <Text style={{ fontFamily: FONT.gurmukhi, color: colors.ink, ...GURMUKHI_SIZE[prefs.size] }}>{prefs.larivaar ? verse.larivaar : verse.gurmukhi}</Text>
      {prefs.transliteration && verse.transliteration && (
        <Text variant="small" color="inkSoft" style={{ fontStyle: "italic" }}>
          {verse.transliteration}
        </Text>
      )}
      {prefs.translation && <Text variant="small">{englishOf(verse)}</Text>}
    </View>
  );
}

/** The shabad's place in Sri Guru Granth Sahib Ji: Ang, raag and writer. */
export function ShabadMeta({ shabad }: { shabad: Shabad }) {
  return (
    <Text variant="meta">
      {[shabad.source.english, `Ang ${shabad.ang}`, shabad.raag?.english, shabad.writer?.english].filter(Boolean).join(" · ")}
    </Text>
  );
}

/** How the reader likes their Gurbani: translation, transliteration, larivaar and size. */
export function ReaderOptions() {
  const { prefs, setPrefs } = useLibrary();
  const nextSize: Record<GurmukhiSize, GurmukhiSize> = { md: "lg", lg: "xl", xl: "md" };
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACE.sm }}>
      <Chip label="English" active={prefs.translation} onPress={() => setPrefs({ translation: !prefs.translation })} />
      <Chip label="Transliteration" active={prefs.transliteration} onPress={() => setPrefs({ transliteration: !prefs.transliteration })} />
      <Chip label="Larivaar" active={prefs.larivaar} onPress={() => setPrefs({ larivaar: !prefs.larivaar })} />
      <Chip label={`Size ${({ md: "S", lg: "M", xl: "L" })[prefs.size]}`} onPress={() => setPrefs({ size: nextSize[prefs.size] })} />
    </View>
  );
}

export function SaveButton({ shabad }: { shabad: Shabad }) {
  const { colors } = useTheme();
  const { isSaved, toggleSaved } = useLibrary();
  const saved = isSaved(shabad.shabadId);
  return (
    <Pressable
      onPress={() => toggleSaved(shabad)}
      accessibilityRole="button"
      accessibilityLabel={saved ? "Remove from saved" : "Save this shabad"}
      accessibilityState={{ selected: saved }}
      hitSlop={10}
      style={{ padding: SPACE.sm, borderRadius: 999, backgroundColor: saved ? colors.accentWash : colors.sunken }}
    >
      <Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={20} color={saved ? colors.accentInk : colors.ink} />
    </Pressable>
  );
}

/** Previous and next, for shabads, Angs and banis. */
export function PrevNext({ onPrev, onNext, prevLabel = "Previous", nextLabel = "Next" }: { onPrev?: () => void; onNext?: () => void; prevLabel?: string; nextLabel?: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Pressable disabled={!onPrev} onPress={onPrev} accessibilityRole="button" hitSlop={8} style={{ opacity: onPrev ? 1 : 0.3, padding: SPACE.sm }}>
        <Text variant="button" color="accentInk">
          ‹ {prevLabel}
        </Text>
      </Pressable>
      <Pressable disabled={!onNext} onPress={onNext} accessibilityRole="button" hitSlop={8} style={{ opacity: onNext ? 1 : 0.3, padding: SPACE.sm }}>
        <Text variant="button" color="accentInk">
          {nextLabel} ›
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  verse: { gap: SPACE.xs },
});
