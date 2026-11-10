import { Ionicons } from "@expo/vector-icons";
import { Link, router, usePathname, type Href } from "expo-router";
import { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from "react-native";
import { localDate, useCalendar } from "@/lib/api";
import { useTheme } from "@/theme/theme";
import { FONT, NARROW, SPACE } from "@/theme/tokens";
import { Text } from "./Text";
import { Wordmark } from "./Wordmark";

/** The sections, in the order the masthead lists them. */
export const SECTIONS: { href: Href; label: string; match: (path: string) => boolean }[] = [
  { href: "/", label: "Today", match: (p) => p === "/" },
  { href: "/news", label: "News", match: (p) => p.startsWith("/news") },
  { href: "/hukamnama", label: "Hukamnama", match: (p) => p.startsWith("/hukamnama") },
  { href: "/gurbani", label: "Gurbani", match: (p) => p.startsWith("/gurbani") },
  { href: "/history", label: "History", match: (p) => p.startsWith("/history") },
  { href: "/ask", label: "Ask", match: (p) => p.startsWith("/ask") },
  { href: "/calendar", label: "Calendar", match: (p) => p.startsWith("/calendar") },
  { href: "/map", label: "Story Map", match: (p) => p.startsWith("/map") },
];

/** Finds Gurbani from anywhere: the search opens on the Gurbani page. */
function Finder({ grow }: { grow: boolean }) {
  const { colors } = useTheme();
  const [q, setQ] = useState("");
  const submit = () => {
    const query = q.trim();
    if (!query) return;
    router.navigate({ pathname: "/gurbani", params: { q: query } });
    setQ("");
  };
  return (
    <View style={[styles.finder, { borderColor: colors.line, backgroundColor: colors.bg }, grow ? { flex: 1 } : { width: 210 }]}>
      <Ionicons name="search" size={13} color={colors.inkFaint} />
      <TextInput
        value={q}
        onChangeText={setQ}
        onSubmitEditing={submit}
        returnKeyType="search"
        placeholder="Find a shabad"
        placeholderTextColor={colors.inkFaint}
        accessibilityLabel="Find a shabad"
        autoCorrect={false}
        style={[styles.finderInput, { color: colors.ink }, Platform.OS === "web" && ({ outlineStyle: "none" } as object)]}
      />
    </View>
  );
}

function Pill({ label, icon, onPress, href }: { label?: string; icon?: keyof typeof Ionicons.glyphMap; onPress?: () => void; href?: Href }) {
  const { colors } = useTheme();
  const body = (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label ?? "Settings"} hitSlop={6} style={StyleSheet.flatten([styles.pill, { borderColor: colors.line }])}>
      {icon && <Ionicons name={icon} size={13} color={colors.inkSoft} />}
      {label && (
        <Text variant="meta" color="inkSoft" style={styles.pillText}>
          {label}
        </Text>
      )}
    </Pressable>
  );
  return href ? (
    <Link href={href} asChild>
      {body}
    </Link>
  ) : (
    body
  );
}

/**
 * The newspaper header on every section, kept to three lines: the date with
 * search and the theme switch, the nameplate, and the sections.
 */
export function Masthead() {
  const { colors, dark, setAppearance } = useTheme();
  const path = usePathname();
  const { width } = useWindowDimensions();
  const narrow = width < NARROW;
  const today = localDate();
  const { data } = useCalendar(today, 45);
  const ns = data?.today;
  const now = new Date();

  return (
    <View>
      <View style={styles.topbar}>
        {!narrow && (
          <Text variant="meta" color="inkSoft" style={{ fontFamily: FONT.sansMedium, flex: 1 }} numberOfLines={1}>
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            {ns ? <Text variant="meta" color="inkFaint">{`  ·  ${ns.label}`}</Text> : null}
          </Text>
        )}
        <View style={[styles.topbarRight, narrow && { flex: 1 }]}>
          <Finder grow={narrow} />
          <Pill label={dark ? "Light mode" : "Dark mode"} onPress={() => setAppearance(dark ? "light" : "dark")} />
          <Pill icon="settings-outline" href="/settings" />
        </View>
      </View>

      <View style={{ marginTop: narrow ? SPACE.md : 2, marginBottom: SPACE.sm }}>
        <Link href="/" asChild>
          <Pressable accessibilityRole="link" accessibilityLabel="Sikhe, today">
            <Wordmark size={narrow ? 30 : 36} />
          </Pressable>
        </Link>
      </View>

      {narrow && (
        <Text variant="meta" color="inkSoft" style={{ textAlign: "center", marginBottom: SPACE.sm }} numberOfLines={1}>
          {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          {ns ? `  ·  ${ns.label}` : ""}
        </Text>
      )}
      {/* The double rule under the nameplate. */}
      <View style={{ height: 4, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.rule }} />

      <ScrollView
        horizontal
        scrollEnabled={narrow}
        showsHorizontalScrollIndicator={false}
        style={[styles.sectionsBar, { borderBottomColor: colors.line }]}
        contentContainerStyle={[styles.sections, !narrow && { flexGrow: 1, justifyContent: "center" }]}
      >
        {SECTIONS.map((s) => {
          const active = s.match(path);
          return (
            <Link key={s.label} href={s.href} asChild>
              <Pressable accessibilityRole="link" accessibilityState={{ selected: active }} style={StyleSheet.flatten([styles.section, { borderBottomColor: active ? colors.ink : "transparent" }])}>
                <Text variant="meta" color={active ? "ink" : "inkSoft"} style={{ fontFamily: active ? FONT.sansBold : FONT.sansMedium, fontSize: 11.5, letterSpacing: 0.4 }}>
                  {s.label}
                </Text>
              </Pressable>
            </Link>
          );
        })}
      </ScrollView>

    </View>
  );
}

/** The foot of every section, under a double rule. */
export function Footer() {
  const { colors } = useTheme();
  return (
    <View style={[styles.footer, { borderTopColor: colors.rule }]}>
      <View style={{ height: 4, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.rule, marginBottom: 14 }} />
      <Text variant="small" color="ink" style={{ fontFamily: FONT.displayItalic, textAlign: "center" }}>
        Sikhe is a learning guide, not a Granthi or a religious authority.
      </Text>
      <Text variant="meta" color="inkFaint" style={{ textAlign: "center", marginTop: 6 }}>
        Good news from the Sikh kaum · Gurbani from BaniDB by Khalis Foundation · History from Wikipedia (CC BY-SA) · News from its publishers
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACE.md },
  topbarRight: { flexDirection: "row", alignItems: "center", gap: SPACE.sm },
  finder: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, height: 29 },
  finderInput: { flex: 1, fontFamily: FONT.sansMedium, fontSize: 12, paddingVertical: 0, minWidth: 0 },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, height: 29 },
  pillText: { fontFamily: FONT.sansBold, fontSize: 10.5, letterSpacing: 0.7, textTransform: "uppercase" },
  sectionsBar: { borderBottomWidth: 1, flexGrow: 0 },
  sections: { flexDirection: "row", gap: 22, paddingVertical: 4 },
  section: { paddingVertical: 6, borderBottomWidth: 2 },
  footer: { marginTop: SPACE.xxl },
});
