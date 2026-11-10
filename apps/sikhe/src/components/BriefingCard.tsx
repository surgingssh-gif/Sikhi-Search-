import { useState } from "react";
import { Pressable, View } from "react-native";
import { useBriefing, type NewsItem } from "@/lib/api";
import { openStory } from "@/lib/stories";
import { useTheme } from "@/theme/theme";
import { FONT, RADIUS, SPACE } from "@/theme/tokens";
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
    <View style={{ gap: SPACE.md, borderWidth: 1, borderColor: colors.line, borderRadius: RADIUS.md, backgroundColor: colors.sunken, padding: SPACE.lg }}>
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

/**
 * Today's edition: one warm sentence from the editor's desk naming the day's
 * best stories, written with the Briefing. Hidden when there is none.
 */
export function EditionNote() {
  const { colors } = useTheme();
  const { data } = useBriefing();
  if (!data?.lede) return null;
  const day = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  return (
    <View style={{ gap: SPACE.xs, paddingLeft: SPACE.md, borderLeftWidth: 2, borderLeftColor: colors.accent }}>
      <Text variant="label" color="inkSoft">
        {`Today's edition · ${day}`}
      </Text>
      <Text style={{ fontFamily: FONT.displayItalic, fontSize: 19, lineHeight: 27, color: colors.ink }}>{data.lede}</Text>
    </View>
  );
}
