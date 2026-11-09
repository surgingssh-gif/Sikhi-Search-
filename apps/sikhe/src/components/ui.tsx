import { Ionicons } from "@expo/vector-icons";
import { Link, type Href } from "expo-router";
import type { ComponentProps, ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/theme";
import { FONT, RADIUS, SPACE } from "@/theme/tokens";
import { Text } from "./Text";

export type IconName = ComponentProps<typeof Ionicons>["name"];

/**
 * A block of the page. Like a newspaper column it has no box: rows inside are
 * split by thin rules. `featured` sets it in a shaded box under a heavy rule.
 */
export function Card({ children, featured, style }: { children: ReactNode; featured?: boolean; style?: ViewStyle }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, featured && [styles.featured, { backgroundColor: colors.sunken, borderTopColor: colors.rule }], style]}>
      {children}
    </View>
  );
}

/** A section's label, with an optional link to see more. */
export function SectionHeader({ title, href, more = "See all" }: { title: string; href?: Href; more?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.sectionHeader, { borderTopColor: colors.rule }]}>
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
  const fg = primary ? colors.bg : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary ? { backgroundColor: colors.ink } : { borderWidth: 1, borderColor: colors.line, paddingVertical: SPACE.md - 1 },
        { opacity: pressed ? 0.75 : 1 },
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
      style={[styles.chip, { backgroundColor: active ? colors.ink : "transparent", borderColor: active ? colors.ink : colors.line }]}
    >
      <Text variant="meta" style={{ color: active ? colors.bg : colors.ink, fontFamily: FONT.sansMedium }}>
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
  card: { gap: SPACE.md },
  featured: { padding: SPACE.lg + 2, borderTopWidth: 2, borderRadius: 0 },
  sectionHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", borderTopWidth: 1.5, paddingTop: SPACE.sm },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACE.sm,
    paddingHorizontal: SPACE.lg + 2,
    paddingVertical: SPACE.md,
    borderRadius: RADIUS.md,
    alignSelf: "flex-start",
  },
  chip: { paddingHorizontal: SPACE.md, paddingVertical: 5, borderRadius: RADIUS.md, borderWidth: 1, alignSelf: "flex-start" },
  state: { alignItems: "center", gap: SPACE.md, paddingVertical: SPACE.xxl },
  badge: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
});
