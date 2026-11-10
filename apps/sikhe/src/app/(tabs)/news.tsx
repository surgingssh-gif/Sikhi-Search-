import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { BriefingCard } from "@/components/BriefingCard";
import { Screen } from "@/components/Screen";
import { StoryCard, StoryGrid, StoryList } from "@/components/StoryCard";
import { Text } from "@/components/Text";
import { Chip, ErrorState, Loading, SectionHeader } from "@/components/ui";
import { friendlyError, localDate, useNews, type NewsItem } from "@/lib/api";
import { NEWS_SECTIONS } from "@/lib/stories";
import { useTheme } from "@/theme/theme";
import { FONT, SPACE } from "@/theme/tokens";

/** How many stories the list shows before "Show more", and how many more each tap. */
const PAGE = 15;
/** Picture cards under the lead story. */
const GRID = 6;

function MapButton() {
  const { colors } = useTheme();
  return (
    <Link href="/map" asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Story map"
        hitSlop={8}
        style={StyleSheet.flatten([styles.mapButton, { borderColor: colors.line }])}
      >
        <Ionicons name="map-outline" size={14} color={colors.ink} />
        <Text variant="meta" color="ink" style={styles.pillText}>
          Map
        </Text>
      </Pressable>
    </Link>
  );
}

/** "Today", "Yesterday" or "Saturday, Nov 7", for grouping the newest stories by day. */
function dayLabel(iso: string | null): string {
  if (!iso) return "Earlier";
  const d = new Date(iso);
  const today = localDate();
  const day = localDate(d);
  if (day === today) return "Today";
  if (day === localDate(new Date(Date.now() - 86_400_000))) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

/** The list under the grid. The newest-first section is split by day. */
function River({ items, byDay }: { items: NewsItem[]; byDay: boolean }) {
  if (!byDay) return <StoryList items={items} />;
  const groups: { day: string; items: NewsItem[] }[] = [];
  for (const item of items) {
    const day = dayLabel(item.publishedAt);
    const last = groups.at(-1);
    if (last?.day === day) last.items.push(item);
    else groups.push({ day, items: [item] });
  }
  return (
    <View style={{ gap: SPACE.lg }}>
      {groups.map((g) => (
        <View key={g.day} style={{ gap: SPACE.xs }}>
          <Text variant="label" color="inkSoft">
            {g.day}
          </Text>
          <StoryList items={g.items} />
        </View>
      ))}
    </View>
  );
}

export default function NewsScreen() {
  const { colors } = useTheme();
  const { data, error, isPending, refetch } = useNews();
  const queryClient = useQueryClient();
  const [sectionId, setSectionId] = useState("top");
  const [shown, setShown] = useState(PAGE);
  const [refreshing, setRefreshing] = useState(false);

  const section = NEWS_SECTIONS.find((s) => s.id === sectionId)!;
  // The newest-first sections keep strict order, split by day.
  const latest = sectionId === "latest" || sectionId === "panth";
  const stories = data ? section.stories(data.items) : [];
  // Lead with a photo when the section has one near the top; the newest-first section keeps strict order.
  const lead = latest ? undefined : (stories.slice(0, 5).find((i) => i.image) ?? stories[0]);
  const others = stories.filter((i) => i !== lead);
  // The grid is only stories with photos, so it reads as a page of pictures; the rest go in the list.
  const photos = others.filter((i) => i.image);
  const grid = latest || photos.length < 2 ? [] : photos.slice(0, GRID);
  const inGrid = new Set(grid.map((i) => i.id));
  const river = others.filter((i) => !inGrid.has(i.id));

  const refresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["news"] });
    await queryClient.invalidateQueries({ queryKey: ["briefing"] });
    setRefreshing(false);
  };

  return (
    <Screen masthead title="News" kicker="Good news from the Sikh kaum, America first" right={<MapButton />} refreshing={refreshing} onRefresh={refresh}>
      <View style={{ gap: SPACE.sm }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -SPACE.xl + 4 }} contentContainerStyle={{ gap: SPACE.sm, paddingHorizontal: SPACE.xl - 4 }}>
          {NEWS_SECTIONS.map((s) => (
            <Chip
              key={s.id}
              label={s.label}
              active={s.id === sectionId}
              onPress={() => {
                setSectionId(s.id);
                setShown(PAGE);
              }}
            />
          ))}
        </ScrollView>
        <Text variant="small" color="inkSoft">
          {section.blurb}
        </Text>
      </View>

      {isPending ? (
        <Loading label="Gathering the news…" />
      ) : error ? (
        <ErrorState message={friendlyError(error)} onRetry={() => refetch()} />
      ) : !stories.length ? (
        <Text variant="small">No stories in this section right now.</Text>
      ) : (
        <>
          {lead && <StoryCard item={lead} variant="lead" />}
          {grid.length > 0 && (
            <View style={{ gap: SPACE.lg, paddingTop: SPACE.lg, borderTopWidth: 1, borderTopColor: colors.line }}>
              <StoryGrid items={grid} />
            </View>
          )}
          {sectionId === "top" && <BriefingCard items={data.items} />}
          {river.length > 0 && (
            <View style={{ gap: SPACE.sm }}>
              {!latest && <SectionHeader title="More stories" />}
              <River items={river.slice(0, shown)} byDay={latest || sectionId === "panth"} />
              {river.length > shown && (
                <Pressable onPress={() => setShown(shown + PAGE)} accessibilityRole="button" style={StyleSheet.flatten([styles.more, { borderColor: colors.ink }])}>
                  <Text variant="meta" color="ink" style={styles.pillText}>
                    Show more stories
                  </Text>
                </Pressable>
              )}
            </View>
          )}
          <Text variant="meta" color="inkFaint">
            From Sikh outlets, Google News and local papers. Each story is sorted by AI into a kind of good news; crime, hate, disputes and politics stay out of the good news, in Panth news only.
          </Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, height: 32, borderRadius: 999, borderWidth: 1 },
  pillText: { fontFamily: FONT.sansBold, fontSize: 11, letterSpacing: 0.7, textTransform: "uppercase" },
  more: { alignSelf: "center", marginTop: SPACE.lg, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 999, borderWidth: 1 },
});
