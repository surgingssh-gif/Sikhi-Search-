import { Ionicons } from "@expo/vector-icons";
import { Link, type Href } from "expo-router";
import type { ComponentProps, ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/theme";
import { FONT, RADIUS, SPACE } from "@/theme/tokens";
import { Text } from "./Text";

export type IconName = ComponentProps<typeof Ionicons>["name"];

/** A raised panel on the page. `featured` gives it a wash of kesri. */
export function Card({ children, featured, style }: { children: ReactNode; featured?: boolean; style?: ViewStyle }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: featured ? colors.accentWash : colors.surface, borderColor: featured ? "transparent" : colors.line },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** A section's label, with an optional link to see more. */
export function SectionHeader({ title, href, more = "See all" }: { title: string; href?: Href; more?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text variant="label" accessibilityRole="header">
        {title}
      </Text>
      {href && (
        <Link href={href} asChild>
          <Pressable hitSlop={8}>
            <Text variant="meta" color="accentInk">
              {more} ›
            </Text>
          </Pressable>
        </Link>
      )}
    </View>
  );
}

export function Section({ title, href, more, children }: { title: string; href?: Href; more?: string; children: ReactNode }) {
  return (
    <View style={{ gap: SPACE.md }}>
      <SectionHeader title={title} href={href} more={more} />
      {children}
    </View>
  );
}

export function Button({
  label,
  onPress,
  icon,
  kind = "primary",
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  kind?: "primary" | "quiet";
}) {
  const { colors } = useTheme();
  const primary = kind === "primary";
  const fg = primary ? colors.onAccent : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: primary ? colors.accent : colors.sunken, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      {icon && <Ionicons name={icon} size={18} color={fg} />}
      <Text variant="button" style={{ color: fg }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** A small rounded tag, such as a story's place. */
export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityState={onPress ? { selected: !!active } : undefined}
      style={[styles.chip, { backgroundColor: active ? colors.ink : colors.sunken }]}
    >
      <Text variant="meta" style={{ color: active ? colors.bg : colors.inkSoft, fontFamily: FONT.sansMedium }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.line }} />;
}

/** Shown while something loads. */
export function Loading({ label }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.state}>
      <ActivityIndicator color={colors.accent} />
      {label && <Text variant="meta">{label}</Text>}
    </View>
  );
}

/** Shown when something couldn't load, with a way to try again. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.state}>
      <Text variant="small" style={{ textAlign: "center" }}>
        {message}
      </Text>
      {onRetry && <Button label="Try again" kind="quiet" onPress={onRetry} />}
    </View>
  );
}

/** A screen that is still being built. */
export function ComingSoon({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  const { colors } = useTheme();
  return (
    <Card style={{ alignItems: "center", paddingVertical: SPACE.xxxl, gap: SPACE.md }}>
      <View style={[styles.badge, { backgroundColor: colors.accentWash }]}>
        <Ionicons name={icon} size={26} color={colors.accentInk} />
      </View>
      <Text variant="title" style={{ textAlign: "center" }}>
        {title}
      </Text>
      <Text variant="small" style={{ textAlign: "center", maxWidth: 380 }}>
        {body}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth, padding: SPACE.lg + 4, gap: SPACE.md },
  sectionHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACE.sm,
    paddingHorizontal: SPACE.lg + 2,
    paddingVertical: SPACE.md,
    borderRadius: RADIUS.pill,
    alignSelf: "flex-start",
  },
  chip: { paddingHorizontal: SPACE.md, paddingVertical: 6, borderRadius: RADIUS.pill, alignSelf: "flex-start" },
  state: { alignItems: "center", gap: SPACE.md, paddingVertical: SPACE.xxl },
  badge: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
});
