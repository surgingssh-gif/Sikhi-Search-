import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { HukamnamaCard } from "@/components/HukamnamaCard";
import { Screen } from "@/components/Screen";
import { StoryCard } from "@/components/StoryCard";
import { Text } from "@/components/Text";
import { Card, Divider, ErrorState, Loading, Section } from "@/components/ui";
import { Wordmark } from "@/components/Wordmark";
import { friendlyError, localDate, useHistoryAround, useNews } from "@/lib/api";
import { isSikhNews, ranked } from "@/lib/stories";
import { useTheme, type Appearance } from "@/theme/theme";
import { SPACE } from "@/theme/tokens";

const NEXT_APPEARANCE: Record<Appearance, Appearance> = { system: "light", light: "dark", dark: "system" };
const APPEARANCE_ICON = { system: "contrast-outline", light: "sunny-outline", dark: "moon-outline" } as const;

function AppearanceButton() {
  const { colors, appearance, setAppearance } = useTheme();
  return (
    <Pressable
      onPress={() => setAppearance(NEXT_APPEARANCE[appearance])}
      accessibilityRole="button"
      accessibilityLabel={`Appearance: ${appearance}. Tap to change.`}
      hitSlop={10}
      style={{ padding: SPACE.sm, borderRadius: 999, backgroundColor: colors.sunken }}
    >
      <Ionicons name={APPEARANCE_ICON[appearance]} size={20} color={colors.ink} />
    </Pressable>
  );
}

function TopStories() {
  const { data, error, isPending, refetch } = useNews();
  if (isPending) return <Loading />;
  if (error) return <ErrorState message={friendlyError(error)} onRetry={() => refetch()} />;
  const stories = ranked(data.items.filter((i) => isSikhNews(i) && i.language === "en" && i.interest >= 2));
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
    <Section title="This week in Sikh history">
      <Card>
        {data.events.slice(0, 4).map((e, n) => (
          <View key={e.id} style={{ gap: SPACE.md }}>
            {n > 0 && <Divider />}
            <View style={{ gap: 2 }}>
              <Text variant="meta" color="accentInk">
                {e.daysAway === 0 ? "Today" : new Date(`${today.slice(0, 4)}${e.date.slice(4)}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                {" · "}
                {e.yearsAgo} years ago
              </Text>
              <Text variant="title">{e.title}</Text>
              <Text variant="small">{e.summary}</Text>
            </View>
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

  const refresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  };

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Wordmark />
        <AppearanceButton />
      </View>
      <View style={{ gap: 2, marginTop: -SPACE.sm }}>
        <Text variant="label">{now.toLocaleDateString("en-US", { weekday: "long" })}</Text>
        <Text variant="display">{now.toLocaleDateString("en-US", { month: "long", day: "numeric" })}</Text>
      </View>
      <HukamnamaCard />
      <Section title="Top stories" href="/news" more="All news">
        <TopStories />
      </Section>
      <OnThisDay today={today} />
    </Screen>
  );
}
