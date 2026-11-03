import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";
import { useBriefing, type NewsItem } from "@/lib/api";
import { openStory } from "@/lib/stories";
import { useTheme } from "@/theme/theme";
import { SPACE } from "@/theme/tokens";
import { Text } from "./Text";
import { Card } from "./ui";

/**
 * The Briefing: today's Sikh news in a few lines. Each line opens the story it
 * was written from. Hidden when there is no briefing.
 */
export function BriefingCard({ items }: { items: NewsItem[] }) {
  const { colors } = useTheme();
  const { data, isPending, error } = useBriefing();
  if (error || data === null || (data && !data.bullets.length)) return null;
  const byId = new Map(items.map((i) => [i.id, i]));

  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: SPACE.sm }}>
        <Ionicons name="sparkles-outline" size={16} color={colors.accentInk} />
        <Text variant="label">The Briefing</Text>
      </View>
      {isPending ? (
        <Text variant="small">Writing today&apos;s briefing…</Text>
      ) : (
        <View style={{ gap: SPACE.md }}>
          {data.bullets.slice(0, 5).map((b) => {
            const story = b.itemIds.map((id) => byId.get(id)).find(Boolean);
            return (
              <Pressable
                key={b.text}
                disabled={!story}
                onPress={() => story && openStory(story)}
                accessibilityRole={story ? "link" : undefined}
                style={({ pressed }) => ({ flexDirection: "row", gap: SPACE.md, opacity: pressed ? 0.7 : 1 })}
              >
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent, marginTop: 9 }} />
                <Text variant="body" style={{ flex: 1 }}>
                  {b.text}
                  {story && <Text variant="meta" color="accentInk">{`  ${story.source} ›`}</Text>}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
      <Text variant="meta" color="inkFaint" style={{ fontSize: 11 }}>
        Summarised by AI from the stories below. Tap a line to read the original.
      </Text>
    </Card>
  );
}
