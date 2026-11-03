import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/theme";
import { READING_WIDTH, SPACE } from "@/theme/tokens";
import { Text } from "./Text";

/**
 * A tab's page: a large title, then a scrolling column that stays a readable
 * width on big screens. Pass `onRefresh` for pull to refresh, and `back` on a
 * page opened from a tab.
 */
export function Screen({
  title,
  kicker,
  right,
  children,
  refreshing = false,
  onRefresh,
  back,
}: {
  title?: string;
  /** A small line above the title, such as today's date. */
  kicker?: string;
  /** Something to show beside the title, such as a settings button. */
  right?: ReactNode;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  back?: boolean;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACE.lg }]}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} /> : undefined}
    >
      <View style={styles.column}>
        {back && (
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={10}
            style={styles.back}
          >
            <Ionicons name="chevron-back" size={22} color={colors.accentInk} />
            <Text variant="body" color="accentInk">
              Back
            </Text>
          </Pressable>
        )}
        {(title || kicker) && (
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              {kicker && <Text variant="label">{kicker}</Text>}
              {title && (
                <Text variant="display" accessibilityRole="header">
                  {title}
                </Text>
              )}
            </View>
            {right}
          </View>
        )}
        {children}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: SPACE.xl - 4, paddingBottom: SPACE.xxxl },
  column: { width: "100%", maxWidth: READING_WIDTH, alignSelf: "center", gap: SPACE.xl },
  back: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", marginLeft: -6, marginBottom: -SPACE.md },
  header: { flexDirection: "row", alignItems: "flex-end", gap: SPACE.md },
});
