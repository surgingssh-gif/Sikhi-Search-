import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "expo-router";
import { Pressable, View } from "react-native";
import { CalendarEventRow } from "@/components/CalendarEventRow";
import { EventRow } from "@/components/History";
import { HukamnamaCard } from "@/components/HukamnamaCard";
import { Screen } from "@/components/Screen";
import { StoryCard } from "@/components/StoryCard";
import { Text } from "@/components/Text";
import { Card, Divider, ErrorState, Loading, Section } from "@/components/ui";
import { Wordmark } from "@/components/Wordmark";
import { friendlyError, localDate, useCalendar, useHistoryAround, useNews } from "@/lib/api";
import { whenLabel } from "@/lib/calendar";
import { anniversaryLabel } from "@/lib/history";
import { NEWS_SECTIONS } from "@/lib/stories";
import { useTheme } from "@/theme/theme";
import { FONT, SPACE } from "@/theme/tokens";

function SettingsButton() {
  const { colors } = useTheme();
  return (
    <Link href="/settings" asChild>
      <Pressable accessibilityRole="button" accessibilityLabel="Settings" hitSlop={10} style={{ padding: SPACE.sm, borderRadius: 999, backgroundColor: colors.sunken }}>
        <Ionicons name="settings-outline" size={20} color={colors.ink} />
      </Pressable>
    </Link>
  );
}

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

function TopStories() {
  const { data, error, isPending, refetch } = useNews();
  if (isPending) return <Loading />;
  if (error) return <ErrorState message={friendlyError(error)} onRetry={() => refetch()} />;
  const stories = NEWS_SECTIONS[0]!.stories(data.items).filter((i) => i.language === "en");
  const lead = stories.find((i) => i.image) ?? stories[0];
  const rest = stories.filter((i) => i !== lead).slice(0, 4);
  if (!lead) return <Text variant="small">No stories right now.</Text>;
  return (
    <View style={{ gap: SPACE.lg }}>
      <StoryCard item={lead} variant="lead" />
      {rest.map((item) => (
        <View key={item.id} style={{ gap: SPACE.lg }}>
          <Divider />
          <StoryCard item={item} />
        </View>
      ))}
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

function NanakshahiLine({ today }: { today: string }) {
  const { data } = useCalendar(today, 45);
  if (!data?.today) return null;
  return (
    <Text variant="meta">
      {data.today.label} Nanakshahi · <Text variant="meta" style={{ fontFamily: FONT.gurmukhi }}>{data.today.labelPa}</Text>
    </Text>
  );
}

export default function TodayScreen() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const now = new Date();
  const today = localDate(now);

  const refresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  };

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Wordmark />
        <SettingsButton />
      </View>
      <View style={{ gap: 2, marginTop: -SPACE.sm }}>
        <Text variant="label">{now.toLocaleDateString("en-US", { weekday: "long" })}</Text>
        <Text variant="display">{now.toLocaleDateString("en-US", { month: "long", day: "numeric" })}</Text>
        <NanakshahiLine today={today} />
      </View>
      <HukamnamaCard />
      <SikhCalendar today={today} />
      <Section title="Top stories" href="/news" more="All news">
        <TopStories />
      </Section>
      <OnThisDay today={today} />
    </Screen>
  );
}
