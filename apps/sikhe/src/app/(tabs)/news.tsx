import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { EditionNote } from "@/components/BriefingCard";
import { Screen } from "@/components/Screen";
import { StoryColumns, StoryHeadlines, StoryLead, StoryList } from "@/components/StoryCard";
import { Text } from "@/components/Text";
import { Chip, ErrorState, Loading, SectionHeader } from "@/components/ui";
import { friendlyError, localDate, useNews, type NewsItem } from "@/lib/api";
import { useArea } from "@/lib/area";
import { NEWS_SECTIONS, nearSection } from "@/lib/stories";
import { useTheme } from "@/theme/theme";
import { FONT, SPACE, WIDE } from "@/theme/tokens";

/** How many stories the list shows before "Show more", and how many more each tap. */
const PAGE = 15;
/** Headlines beside the lead, and stories in the row of three under it. */
const BESIDE = 2;
const ACROSS = 3;

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
  const groups: { day: string; items: NewsItem[] }[] = [];
  if (byDay) {
    for (const item of items) {
      const day = dayLabel(item.publishedAt);
      const last = groups.at(-1);
      if (last?.day === day) last.items.push(item);
      else groups.push({ day, items: [item] });
    }
  } else {
    // Ranked sections keep their order, split into this week and earlier, so older stories are plainly older.
    const week = (i: NewsItem) => !i.publishedAt || Date.now() - new Date(i.publishedAt).getTime() < 7 * 86_400_000;
    const thisWeek = items.filter(week);
    const earlier = items.filter((i) => !week(i));
    if (!thisWeek.length || !earlier.length) return <StoryList items={items} />;
    groups.push({ day: "This week", items: thisWeek }, { day: "Earlier", items: earlier });
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

  // With an area chosen, "Near you" comes right after the top stories and the good news.
  const { area } = useArea();
  const sections = area ? [...NEWS_SECTIONS.slice(0, 2), nearSection(area), ...NEWS_SECTIONS.slice(2)] : NEWS_SECTIONS;
  const section = sections.find((s) => s.id === sectionId) ?? sections[0]!;
  // The newest-first sections keep strict order, split by day.
  const latest = sectionId === "latest";
  const stories = data ? section.stories(data.items) : [];
  // The front: the best story leads, a column of headlines beside it, a row of three under it.
  // The newest-first sections are just the list.
  // On wide screens two more stories sit under the lead, so its column is as full as the one beside it.
  const wide = useWindowDimensions().width >= WIDE;
  const under = wide ? 2 : 0;
  const lead = latest ? undefined : stories[0];
  const beside = latest ? [] : stories.slice(1, 1 + BESIDE);
  const belowLead = latest ? [] : stories.slice(1 + BESIDE, 1 + BESIDE + under);
  const acrossStart = 1 + BESIDE + under;
  const across = latest ? [] : stories.slice(acrossStart, acrossStart + ACROSS);
  const river = latest ? stories : stories.slice(acrossStart + ACROSS);

  const refresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["news"] });
    await queryClient.invalidateQueries({ queryKey: ["briefing"] });
    setRefreshing(false);
  };

  return (
    <Screen masthead refreshing={refreshing} onRefresh={refresh}>
      <View style={{ gap: SPACE.sm }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -SPACE.xl + 4 }} contentContainerStyle={{ gap: SPACE.sm, paddingHorizontal: SPACE.xl - 4 }}>
          {sections.map((s) => (
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
          <MapButton />
        </ScrollView>
        {sectionId === "top" ? (
          <EditionNote />
        ) : (
          <Text variant="small" color="inkSoft">
            {section.blurb}
          </Text>
        )}
      </View>

      {isPending ? (
        <Loading label="Gathering the news…" />
      ) : error ? (
        <ErrorState message={friendlyError(error)} onRetry={() => refetch()} />
      ) : !stories.length ? (
        <Text variant="small">No stories in this section right now.</Text>
      ) : (
        <>
          {lead && (
            <View style={wide ? styles.front : { gap: SPACE.md }}>
              <View style={wide ? styles.frontLead : undefined}>
                <StoryLead item={lead} />
                {belowLead.length > 0 && <StoryColumns items={belowLead} />}
              </View>
              {beside.length > 0 && (
                <View style={wide ? styles.frontSide : undefined}>
                  <StoryHeadlines items={beside} />
                </View>
              )}
            </View>
          )}
          {across.length > 0 && (
            <StoryColumns items={across} />
          )}
          {river.length > 0 && (
            <View style={{ gap: SPACE.sm }}>
              {!latest && <SectionHeader title="More stories" />}
              <River items={river.slice(0, shown)} byDay={latest} />
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
            From Sikh outlets, Google News and local papers. AI sorts each story into a section and writes its summary from the publisher's own description; on hard news, Sikh outlets' reporting leads. Tap a story for its opening and a link to the full article.
          </Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, height: 29, borderRadius: 999, borderWidth: 1 },
  pillText: { fontFamily: FONT.sansBold, fontSize: 11, letterSpacing: 0.7, textTransform: "uppercase" },
  front: { flexDirection: "row", alignItems: "flex-start", gap: SPACE.md },
  frontLead: { flex: 2, gap: SPACE.md },
  frontSide: { flex: 1 },
  more: { alignSelf: "center", marginTop: SPACE.lg, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 999, borderWidth: 1 },
});
