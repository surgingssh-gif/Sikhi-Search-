import { Link, router, useLocalSearchParams } from "expo-router";
import { useRef } from "react";
import { View, type ScrollViewInstance } from "react-native";
import { PrevNext, ReaderOptions, SaveButton, ShabadMeta, VerseView } from "@/components/Gurbani";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button, ErrorState, Loading } from "@/components/ui";
import { useChats } from "@/lib/ask";
import { englishOf, openingLines } from "@/lib/shabad";
import { friendlyError } from "@/lib/api";
import { useShabad } from "@/lib/gurbani";
import { SPACE } from "@/theme/tokens";

/** A whole shabad. Opened from search, `?verse=` marks the line that was found. */
export default function ShabadScreen() {
  const params = useLocalSearchParams<{ id: string; verse?: string }>();
  const id = Number(params.id);
  const verseId = Number(params.verse);
  const { data, error, isPending, refetch } = useShabad(id);
  const shabad = data?.shabad;
  const { start } = useChats();
  const askAbout = () => {
    if (!shabad) return;
    const id = start({ shabadId: shabad.shabadId, subject: englishOf(openingLines(shabad.verses, 1)[0] ?? shabad.verses[0]!) });
    router.push({ pathname: "/chat/[id]", params: { id } });
  };
  // Scrolls once to the line a search found, when it has been laid out.
  const scroll = useRef<ScrollViewInstance>(null);
  const listY = useRef(0);
  const scrolledTo = useRef<number | null>(null);

  return (
    <Screen back title="Shabad" right={shabad && <SaveButton shabad={shabad} />} scrollRef={scroll}>
      {isPending ? (
        <Loading />
      ) : error || !shabad ? (
        <ErrorState message={friendlyError(error)} onRetry={() => refetch()} />
      ) : (
        <>
          <View style={{ gap: SPACE.md }}>
            <ShabadMeta shabad={shabad} />
            <ReaderOptions />
          </View>
          <View style={{ gap: SPACE.xl }} onLayout={(e) => (listY.current = e.nativeEvent.layout.y)}>
            {shabad.verses.map((v) => (
              <View
                key={v.verseId}
                onLayout={(e) => {
                  if (v.verseId !== verseId || scrolledTo.current === verseId) return;
                  scrolledTo.current = verseId;
                  const y = listY.current + e.nativeEvent.layout.y;
                  if (y > 300) scroll.current?.scrollTo({ y: y - 120, animated: true });
                }}
              >
                <VerseView verse={v} highlight={v.verseId === verseId} />
              </View>
            ))}
          </View>
          <View style={{ alignItems: "flex-start" }}>
            <Button label="Ask about this shabad" icon="chatbubble-ellipses-outline" onPress={askAbout} />
          </View>
          <Link href={`/ang/${shabad.ang}`}>
            <Text variant="button" color="accentInk">
              Read Ang {shabad.ang} ›
            </Text>
          </Link>
          <PrevNext
            prevLabel="Previous shabad"
            nextLabel="Next shabad"
            onPrev={shabad.navigation.previous ? () => router.setParams({ id: String(shabad.navigation.previous), verse: "" }) : undefined}
            onNext={shabad.navigation.next ? () => router.setParams({ id: String(shabad.navigation.next), verse: "" }) : undefined}
          />
          <Text variant="meta" color="inkFaint" style={{ fontSize: 11 }}>
            {data.attribution}
          </Text>
        </>
      )}
    </Screen>
  );
}
