import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button, ErrorState, Loading } from "@/components/ui";
import { friendlyError } from "@/lib/api";
import { useChats } from "@/lib/ask";
import { useArticle } from "@/lib/history";
import { openStory } from "@/lib/stories";
import { useTheme } from "@/theme/theme";
import { RADIUS, SPACE } from "@/theme/tokens";

/** A Wikipedia article on Sikh history, read in the app, with its source and licence. */
export default function ArticleScreen() {
  const { colors } = useTheme();
  const title = String(useLocalSearchParams<{ title: string }>().title ?? "");
  const { data, error, isPending, refetch } = useArticle(title);
  const article = data?.article;
  const { start } = useChats();
  const askAbout = (name: string) => {
    const id = start();
    router.push({ pathname: "/chat/[id]", params: { id, draft: `What should I know about ${name} in Sikh history?` } });
  };

  return (
    <Screen back title={article?.title ?? title} kicker={article?.description || undefined}>
      {isPending ? (
        <Loading />
      ) : error || !article ? (
        <ErrorState message={friendlyError(error)} onRetry={() => refetch()} />
      ) : (
        <>
          {article.image && (
            <Image
              source={article.image}
              style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: RADIUS.md, backgroundColor: colors.sunken }}
              contentFit="contain"
              accessibilityIgnoresInvertColors
            />
          )}
          {article.sections.map((s, n) => (
            <View key={`${s.heading}-${n}`} style={{ gap: SPACE.md }}>
              {s.heading && (
                <Text variant={s.level <= 2 ? "headline" : "title"} accessibilityRole="header" style={s.level <= 2 ? { fontSize: 22, lineHeight: 28 } : undefined}>
                  {s.heading}
                </Text>
              )}
              {s.paragraphs.map((p, i) => (
                <Text key={i} variant="body" style={{ lineHeight: 26 }}>
                  {p}
                </Text>
              ))}
            </View>
          ))}
          <View style={{ gap: SPACE.md, paddingTop: SPACE.md, borderTopWidth: 0.5, borderColor: colors.line }}>
            <Button label="Ask Sikhe about this" icon="chatbubble-ellipses-outline" onPress={() => askAbout(article.title)} />
            <Button label="Read on Wikipedia" icon="open-outline" kind="quiet" onPress={() => openStory({ url: article.url })} />
            <Pressable onPress={() => openStory({ url: "https://creativecommons.org/licenses/by-sa/4.0/" })} accessibilityRole="link">
              <Text variant="meta" color="inkFaint">
                {data.attribution} Wikipedia is written by volunteers; check important facts against other sources.
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </Screen>
  );
}
