import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useState, type ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { getJson } from "@/lib/api";
import { PreviewContext } from "@/lib/preview";
import { openStory, timeAgo, type Story } from "@/lib/stories";
import { useTheme } from "@/theme/theme";
import { FONT, NARROW, RADIUS, SPACE } from "@/theme/tokens";
import { cleanTitle, kickerOf, outletName } from "./StoryCard";
import { Text } from "./Text";

/** A story's opening paragraphs, from the API. */
function useOpening(id: string | undefined) {
  return useQuery({
    queryKey: ["article", id],
    queryFn: () => getJson<{ id: string; url: string; paragraphs: string[] }>(`/v1/news/article/${id}`),
    enabled: Boolean(id),
    staleTime: 60 * 60_000,
    retry: false,
  });
}

/** Two grey bars while the story loads. */
function Placeholder() {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 8 }} accessibilityLabel="Loading the story">
      {[100, 96, 88, 0, 100, 72].map((w, i) => (w ? <View key={i} style={{ height: 12, width: `${w}%`, borderRadius: 3, backgroundColor: colors.sunken }} /> : <View key={i} style={{ height: 6 }} />))}
    </View>
  );
}

function Sheet({ story, onClose }: { story: Story; onClose: () => void }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const narrow = width < NARROW;
  const { data, isPending } = useOpening(story.id);
  const [photoFailed, setPhotoFailed] = useState(false);

  // The article's own opening, or failing that what we already know: our summary and the publisher's description.
  const fallback = [story.summary, story.snippet].filter((t): t is string => Boolean(t && t.trim()));
  const paragraphs = data?.paragraphs.length ? data.paragraphs : fallback.filter((t, i) => i === 0 || !fallback[0]!.startsWith(t.slice(0, 40)));
  const outlet = outletName(story.source);
  const others = (story.also ?? []).map(outletName);

  return (
    <View style={[styles.backdrop, narrow && { justifyContent: "flex-end", padding: 0 }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close the preview" />
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.line },
          narrow && { maxWidth: undefined, maxHeight: "90%", borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0 },
        ]}
        accessibilityViewIsModal
      >
        <ScrollView contentContainerStyle={[styles.inner, narrow && { padding: SPACE.lg + 2 }]}>
          <View style={styles.top}>
            <Text numberOfLines={1} style={[styles.kicker, { color: colors.accentInk }]}>
              {kickerOf(story).toUpperCase()}
            </Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close" style={StyleSheet.flatten([styles.close, { borderColor: colors.line }])}>
              <Ionicons name="close" size={16} color={colors.inkSoft} />
            </Pressable>
          </View>

          <Text style={[styles.title, { color: colors.ink }, narrow && { fontSize: 21, lineHeight: 26 }]}>{cleanTitle(story.title)}</Text>
          <Text variant="meta" color="inkFaint">
            <Text variant="meta" color="inkSoft" style={{ fontFamily: FONT.sansMedium }}>
              {outlet}
            </Text>
            {story.publishedAt ? `  ·  ${timeAgo(story.publishedAt)}` : ""}
          </Text>

          {story.image && !photoFailed && (
            <Image
              source={story.image}
              style={[styles.photo, { backgroundColor: colors.sunken }]}
              contentFit="cover"
              transition={200}
              onError={() => setPhotoFailed(true)}
              accessibilityIgnoresInvertColors
            />
          )}

          <View style={{ gap: SPACE.md, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: SPACE.lg }}>
            {isPending ? (
              <Placeholder />
            ) : (
              paragraphs.map((p, i) => (
                <Text key={i} variant="body" style={i === 0 ? { color: colors.ink } : undefined} color={i === 0 ? undefined : "inkSoft"}>
                  {p}
                </Text>
              ))
            )}
          </View>

          {others.length > 0 && (
            <Text variant="meta" color="inkFaint">
              {`Also covered by ${others.slice(0, 3).join(", ")}${others.length > 3 ? ` and ${others.length - 3} more` : ""}`}
            </Text>
          )}

          <Pressable
            onPress={() => {
              openStory({ url: data?.url ?? story.url });
              onClose();
            }}
            accessibilityRole="link"
            style={(state) => [styles.read, { backgroundColor: colors.ink, opacity: state.pressed ? 0.85 : 1 }]}
          >
            <Text style={[styles.readText, { color: colors.bg }]} numberOfLines={1}>
              {`Read more at ${outlet}`}
            </Text>
            <Ionicons name="arrow-forward" size={15} color={colors.bg} />
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

/** Holds the preview sheet for the whole app. Tapping a story opens it; tapping outside or Escape closes it. */
export function PreviewProvider({ children }: { children: ReactNode }) {
  const [story, setStory] = useState<Story | null>(null);
  return (
    <PreviewContext.Provider value={setStory}>
      {children}
      <Modal visible={Boolean(story)} transparent animationType="fade" onRequestClose={() => setStory(null)}>
        {story && <Sheet key={story.id} story={story} onClose={() => setStory(null)} />}
      </Modal>
    </PreviewContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: SPACE.xl },
  card: { width: "100%", maxWidth: 620, maxHeight: "88%", borderWidth: 1, borderRadius: RADIUS.lg + 4, overflow: "hidden" },
  inner: { padding: SPACE.xl + 4, gap: SPACE.md },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACE.md },
  kicker: { flex: 1, fontFamily: FONT.sansBold, fontSize: 9.5, lineHeight: 13, letterSpacing: 1 },
  close: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: FONT.display, fontSize: 25, lineHeight: 30, letterSpacing: -0.2 },
  photo: { width: "100%", aspectRatio: 16 / 9, maxHeight: 260, borderRadius: RADIUS.sm, marginTop: SPACE.xs },
  read: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 44, borderRadius: 999, marginTop: SPACE.sm, paddingHorizontal: SPACE.xl },
  readText: { fontFamily: FONT.sansBold, fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase" },
});
