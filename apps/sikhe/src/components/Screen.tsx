import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { ReactNode, Ref } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View, type ScrollViewInstance } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/theme";
import { PAGE_WIDTH, READING_WIDTH, SPACE } from "@/theme/tokens";
import { Footer, Masthead } from "./Masthead";
import { Text } from "./Text";

/**
 * A page: a large title, then a scrolling column that stays a readable width
 * on big screens. Pass `onRefresh` for pull to refresh, and `back` on a page
 * opened from a section. A section page passes `masthead`: it opens with the
 * newspaper masthead, its title becomes a section head, and it ends with the
 * footer.
 */
export function Screen({
  title,
  kicker,
  right,
  children,
  refreshing = false,
  onRefresh,
  back,
  scrollRef,
  masthead,
  width,
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
  scrollRef?: Ref<ScrollViewInstance>;
  masthead?: boolean;
  /** How wide the content gets. Section pages default to the full page width. */
  width?: number;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      ref={scrollRef}
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + (masthead ? SPACE.md : SPACE.lg) }]}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} /> : undefined}
    >
      {masthead && (
        <View style={[styles.column, { maxWidth: PAGE_WIDTH, marginBottom: SPACE.xl }]}>
          <Masthead />
        </View>
      )}
      <View style={[styles.column, { maxWidth: width ?? (masthead ? PAGE_WIDTH : READING_WIDTH) }]}>
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
        {masthead && title ? (
          <View style={[styles.sectionHead, { borderTopColor: colors.rule }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="label" accessibilityRole="header">
                {title}
              </Text>
              {kicker && <Text variant="meta">{kicker}</Text>}
            </View>
            {right}
          </View>
        ) : (title || kicker) && (
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
      {masthead && (
        <View style={[styles.column, { maxWidth: PAGE_WIDTH }]}>
          <Footer />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: SPACE.xl - 4, paddingBottom: SPACE.xxxl },
  column: { width: "100%", maxWidth: READING_WIDTH, alignSelf: "center", gap: SPACE.xl },
  back: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", marginLeft: -6, marginBottom: -SPACE.md },
  header: { flexDirection: "row", alignItems: "flex-end", gap: SPACE.md },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: SPACE.md, borderTopWidth: 2, paddingTop: 10 },
});
