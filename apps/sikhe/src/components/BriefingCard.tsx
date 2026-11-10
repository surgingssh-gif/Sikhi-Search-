import { useState } from "react";
import { Pressable, View } from "react-native";
import { useBriefing, type NewsItem } from "@/lib/api";
import { openStory } from "@/lib/stories";
import { useTheme } from "@/theme/theme";
import { SPACE } from "@/theme/tokens";
import { Text } from "./Text";

/**
 * The Briefing: today's Sikh news in a few lines. Each line opens the story it
 * was written from. Hidden when there is no briefing.
 */
export function BriefingCard({ items }: { items: NewsItem[] }) {
  const { colors } = useTheme();
  const { data, isPending, error } = useBriefing();
  const [all, setAll] = useState(false);
  if (error || data === null || (data && !data.bullets.length)) return null;
  const byId = new Map(items.map((i) => [i.id, i]));

  return (
    <View style={{ gap: SPACE.md, borderTopWidth: 1, borderTopColor: colors.rule, paddingTop: SPACE.md }}>
      <Text variant="label" accessibilityRole="header">
        The Briefing
      </Text>
      {isPending ? (
        <Text variant="small">Writing today&apos;s briefing…</Text>
      ) : (
        <View style={{ gap: SPACE.md }}>
          {data.bullets.slice(0, all ? 5 : 3).map((b) => {
            const story = b.itemIds.map((id) => byId.get(id)).find(Boolean);
            return (
              <Pressable
                key={b.text}
                disabled={!story}
                onPress={() => story && openStory(story)}
                accessibilityRole={story ? "link" : undefined}
                style={({ pressed }) => ({ flexDirection: "row", gap: SPACE.md, opacity: pressed ? 0.7 : 1 })}
              >
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.ink, marginTop: 9 }} />
                <Text variant="small" color="ink" style={{ flex: 1 }}>
                  {b.text}
                  {story && <Text variant="meta" color="accentInk">{`  ${story.source} ›`}</Text>}
                </Text>
              </Pressable>
            );
          })}
          {data.bullets.length > 3 && (
            <Pressable onPress={() => setAll(!all)} accessibilityRole="button" hitSlop={8} style={{ alignSelf: "flex-start" }}>
              <Text variant="button" color="accentInk">
                {all ? "Show less" : `Show all ${Math.min(5, data.bullets.length)}`}
              </Text>
            </Pressable>
          )}
        </View>
      )}
      <Text variant="meta" color="inkFaint" style={{ fontSize: 11 }}>
        Summarised by AI from today&apos;s stories. Tap a line to read the original.
      </Text>
    </View>
  );
}
