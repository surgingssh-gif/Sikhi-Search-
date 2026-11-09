import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
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
      <Pressable accessibilityRole="button" accessibilityLabel="Settings" hitSlop={10} style={{ padding: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.line }}>
        <Ionicons name="settings-outline" size={16} color={colors.inkSoft} />
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

/**
 * The front page's nameplate: a small top line, "Sikhe" in blackletter, then a
 * dateline between a rule and a double rule, with the Gregorian and Nanakshahi
 * dates side by side.
 */
function Masthead({ now, today }: { now: Date; today: string }) {
  const { colors } = useTheme();
  const { data } = useCalendar(today, 45);
  const ns = data?.today;
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text variant="meta" color="inkFaint" style={{ fontFamily: FONT.sansMedium }}>
          Sikh news, Gurbani and history
        </Text>
        <SettingsButton />
      </View>
      <View style={{ marginTop: SPACE.sm, marginBottom: SPACE.md }}>
        <Wordmark size={40} />
      </View>
      <View style={[styles.dateline, { borderTopColor: colors.rule }]}>
        <Text variant="meta" color="ink" style={[styles.dateText, { flexGrow: 0, flexShrink: 0, flexBasis: "auto" }]} numberOfLines={1}>
          {now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
        </Text>
        {ns && (
          <>
            <Text variant="meta" color="ink" style={[styles.dateText, { fontFamily: FONT.gurmukhiBold, textAlign: "center" }]} numberOfLines={1}>
              {ns.labelPa}
            </Text>
            <Text variant="meta" color="inkSoft" style={[styles.dateText, { fontFamily: FONT.displayItalic, fontSize: 12, textAlign: "right" }]} numberOfLines={1}>
              {ns.label} NS
            </Text>
          </>
        )}
      </View>
      {/* The double rule under the dateline. */}
      <View style={{ height: 4, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.rule }} />
    </View>
  );
}

const styles = StyleSheet.create({
  dateline: { flexDirection: "row", alignItems: "center", gap: SPACE.sm, borderTopWidth: 1, paddingVertical: 6 },
  dateText: { flex: 1, fontFamily: FONT.sansBold, fontSize: 11, letterSpacing: 0.2 },
});

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
      <Masthead now={now} today={today} />
      <HukamnamaCard />
      <SikhCalendar today={today} />
      <Section title="Top stories" href="/news" more="All news">
        <TopStories />
      </Section>
      <OnThisDay today={today} />
    </Screen>
  );
}
