import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { BriefingCard } from "@/components/BriefingCard";
import { CalendarEventRow } from "@/components/CalendarEventRow";
import { EventRow } from "@/components/History";
import { HukamnamaCard } from "@/components/HukamnamaCard";
import { Screen } from "@/components/Screen";
import { StoryCard, StoryGrid, StoryList } from "@/components/StoryCard";
import { Text } from "@/components/Text";
import { Button, Card, Divider, ErrorState, Loading, Section } from "@/components/ui";
import { friendlyError, localDate, useCalendar, useHistoryAround, useNews } from "@/lib/api";
import { whenLabel } from "@/lib/calendar";
import { anniversaryLabel } from "@/lib/history";
import { NEWS_SECTIONS } from "@/lib/stories";
import { useTheme } from "@/theme/theme";
import { SPACE, WIDE } from "@/theme/tokens";

/** Today's observances in the Sikh calendar, then the next few days ahead. */
function SikhCalendar({ today }: { today: string }) {
  const { data } = useCalendar(today, 45);
  if (!data) return null;
  const todays = data.events.filter((e) => e.date === today);
  const ahead = data.events.filter((e) => e.date > today && (e.major || e.category === "sangrand")).slice(0, 3);
  if (!todays.length && !ahead.length) return null;
  return (
    <Section title="Sikh calendar" href="/calendar" more="Full calendar">
      <Card>
        {[...todays, ...ahead].map((e, n) => (
          <View key={e.id} style={{ gap: SPACE.md }}>
            {n > 0 && <Divider />}
            <CalendarEventRow event={e} when={whenLabel(e.date, today)} />
          </View>
        ))}
      </Card>
    </Section>
  );
}

/** The front page's news: the lead story, picture cards, the Briefing, then a short list. */
function TopStories({ wide }: { wide: boolean }) {
  const { colors } = useTheme();
  const { data, error, isPending, refetch } = useNews();
  if (isPending) return <Loading label="Gathering the news…" />;
  if (error) return <ErrorState message={friendlyError(error)} onRetry={() => refetch()} />;
  const stories = NEWS_SECTIONS[0]!.stories(data.items).filter((i) => i.language === "en");
  const lead = stories.find((i) => i.image) ?? stories[0];
  if (!lead) return <Text variant="small">No stories right now.</Text>;
  const others = stories.filter((i) => i !== lead);
  // Picture cards only for stories with photos; the rest go in the list.
  const photos = others.filter((i) => i.image);
  const grid = photos.length < 2 ? [] : photos.slice(0, wide ? 3 : 4);
  const inGrid = new Set(grid.map((i) => i.id));
  const list = others.filter((i) => !inGrid.has(i.id)).slice(0, wide ? 6 : 4);
  return (
    <View style={{ gap: SPACE.xl }}>
      <StoryCard item={lead} variant="lead" />
      {grid.length > 0 && (
        <View style={{ paddingTop: SPACE.lg, borderTopWidth: 1, borderTopColor: colors.line }}>
          <StoryGrid items={grid} />
        </View>
      )}
      <BriefingCard items={data.items} />
      <StoryList items={list} />
      <View style={{ alignItems: "center" }}>
        <Button label="More good news" kind="quiet" icon="newspaper-outline" onPress={() => router.navigate("/news")} />
      </View>
    </View>
  );
}

function OnThisDay({ today }: { today: string }) {
  const { data, isPending } = useHistoryAround(today, 0, 6);
  if (isPending || !data?.events.length) return null;
  return (
    <Section title="This week in Sikh history" href="/history" more="More history">
      <Card>
        {data.events.slice(0, 4).map((e, n) => (
          <View key={e.id} style={{ gap: SPACE.md }}>
            {n > 0 && <Divider />}
            <EventRow event={e} when={anniversaryLabel(e, today)} />
          </View>
        ))}
      </Card>
    </Section>
  );
}

export default function TodayScreen() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const now = new Date();
  const today = localDate(now);
  const { colors } = useTheme();
  const wide = useWindowDimensions().width >= WIDE;

  const refresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  };

  return (
    <Screen masthead refreshing={refreshing} onRefresh={refresh}>
      {/* The front page: the news leads, and beside it on wide screens a rail with the Hukamnama and the dates. */}
      <View style={wide ? styles.front : { gap: SPACE.xl }}>
        <View style={wide ? styles.lead : { gap: SPACE.xl }}>
          <Section title="Good news" href="/news" more="All news">
            <TopStories wide={wide} />
          </Section>
        </View>
        <View style={wide ? [styles.rail, { borderLeftColor: colors.line }] : { gap: SPACE.xl }}>
          <HukamnamaCard />
          <SikhCalendar today={today} />
          <OnThisDay today={today} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  front: { flexDirection: "row", alignItems: "flex-start" },
  lead: { flex: 1, gap: SPACE.xl, paddingRight: 40 },
  rail: { width: 360, gap: SPACE.xl, paddingLeft: 36, borderLeftWidth: 1 },
});
