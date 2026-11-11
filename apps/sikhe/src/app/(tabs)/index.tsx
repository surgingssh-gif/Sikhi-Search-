import { useQueryClient } from "@tanstack/react-query";
import { Link, router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { EditionNote } from "@/components/BriefingCard";
import { CalendarEventRow } from "@/components/CalendarEventRow";
import { EventRow } from "@/components/History";
import { HukamnamaCard } from "@/components/HukamnamaCard";
import { Screen } from "@/components/Screen";
import { StoryColumns, StoryHeadlines, StoryLead, StoryList } from "@/components/StoryCard";
import { Text } from "@/components/Text";
import { Button, Card, Divider, ErrorState, Loading, Section } from "@/components/ui";
import { friendlyError, localDate, useCalendar, useHistoryAround, useNews } from "@/lib/api";
import { whenLabel } from "@/lib/calendar";
import { anniversaryLabel } from "@/lib/history";
import { useArea } from "@/lib/area";
import { NEWS_SECTIONS, nearSection } from "@/lib/stories";
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
  const lead = stories[0];
  if (!lead) return <Text variant="small">No stories right now.</Text>;
  // Under the lead, a row of three; then the Briefing and a short list.
  const across = stories.slice(1, 4);
  const list = stories.slice(4, wide ? 10 : 8);
  return (
    <View style={{ gap: SPACE.md }}>
      <EditionNote />
      <StoryLead item={lead} />
      {across.length > 0 && <StoryColumns items={across} />}
      {list.length > 0 && <StoryList items={list} />}
      <View style={{ alignItems: "center" }}>
        <Button label="More news" kind="quiet" icon="newspaper-outline" onPress={() => router.navigate("/news")} />
      </View>
    </View>
  );
}

/** News from the reader's own area, or an invitation to choose one. */
function NearYou() {
  const { colors } = useTheme();
  const { area } = useArea();
  const { data } = useNews();
  if (!area) {
    return (
      <Link href="/settings" asChild>
        <Pressable accessibilityRole="link" style={StyleSheet.flatten([styles.nearPrompt, { borderColor: colors.line }])}>
          <Text variant="label">Near you</Text>
          <Text variant="small">See the news from your own Sangat.</Text>
          <Text variant="button" color="accentInk">
            Choose your area ›
          </Text>
        </Pressable>
      </Link>
    );
  }
  const stories = data ? nearSection(area).stories(data.items).slice(0, 3) : [];
  return (
    <Section title={`Near you · ${area.label}`} href="/news" more="More">
      {stories.length ? <StoryHeadlines items={stories} /> : <Text variant="small">No new stories from {area.label} this week.</Text>}
    </Section>
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
          <Section title="Top stories" href="/news" more="All news">
            <TopStories wide={wide} />
          </Section>
        </View>
        <View style={wide ? [styles.rail, { borderLeftColor: colors.line }] : { gap: SPACE.xl }}>
          <HukamnamaCard />
          <NearYou />
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
  nearPrompt: { gap: SPACE.xs, padding: SPACE.lg, borderWidth: 1, borderRadius: 6 },
  rail: { width: 330, gap: SPACE.xl, paddingLeft: 30, borderLeftWidth: 1 },
});
