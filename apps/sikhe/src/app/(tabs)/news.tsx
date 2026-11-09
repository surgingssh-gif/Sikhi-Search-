import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { BriefingCard } from "@/components/BriefingCard";
import { Screen } from "@/components/Screen";
import { StoryCard } from "@/components/StoryCard";
import { Text } from "@/components/Text";
import { Chip, Divider, ErrorState, Loading } from "@/components/ui";
import { friendlyError, useNews } from "@/lib/api";
import { NEWS_SECTIONS } from "@/lib/stories";
import { useTheme } from "@/theme/theme";
import { SPACE } from "@/theme/tokens";

/** How many stories a section shows before "Show more". */
const PAGE = 20;

function MapButton() {
  const { colors } = useTheme();
  return (
    <Link href="/map" asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Story map"
        hitSlop={8}
        style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm, borderRadius: 999, borderWidth: 1, borderColor: colors.line }}
      >
        <Ionicons name="map-outline" size={18} color={colors.ink} />
        <Text variant="meta" color="ink">
          Map
        </Text>
      </Pressable>
    </Link>
  );
}

export default function NewsScreen() {
  const { data, error, isPending, refetch } = useNews();
  const queryClient = useQueryClient();
  const [sectionId, setSectionId] = useState("top");
  const [shown, setShown] = useState(PAGE);
  const [refreshing, setRefreshing] = useState(false);

  const section = NEWS_SECTIONS.find((s) => s.id === sectionId)!;
  const stories = data ? section.stories(data.items) : [];
  // Lead with a photo when the section has one near the top.
  const lead = stories.slice(0, 5).find((i) => i.image) ?? stories[0];
  const rest = stories.filter((i) => i !== lead).slice(0, shown - 1);

  const refresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["news"] });
    await queryClient.invalidateQueries({ queryKey: ["briefing"] });
    setRefreshing(false);
  };

  return (
    <Screen title="News" right={<MapButton />} refreshing={refreshing} onRefresh={refresh}>
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

      {isPending ? (
        <Loading label="Gathering the news…" />
      ) : error ? (
        <ErrorState message={friendlyError(error)} onRetry={() => refetch()} />
      ) : (
        <>
          {sectionId === "top" ? <BriefingCard items={data.items} /> : <Text variant="small">{section.blurb}</Text>}
          {!lead ? (
            <Text variant="small">No stories in this section right now.</Text>
          ) : (
            <View style={{ gap: SPACE.lg }}>
              <StoryCard item={lead} variant="lead" />
              {rest.map((item) => (
                <View key={item.id} style={{ gap: SPACE.lg }}>
                  <Divider />
                  <StoryCard item={item} />
                </View>
              ))}
              {stories.length > shown && (
                <Pressable onPress={() => setShown(shown + PAGE)} accessibilityRole="button" style={{ alignSelf: "center", padding: SPACE.md }}>
                  <Text variant="button" color="accentInk">
                    Show more
                  </Text>
                </Pressable>
              )}
            </View>
          )}
          <Text variant="meta" color="inkFaint">
            From Sikh outlets, Google News and Indian papers. Stories are ranked for Sikhs in America; crime and politics are kept off the top.
          </Text>
        </>
      )}
    </Screen>
  );
}
