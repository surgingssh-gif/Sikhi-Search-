import { router } from "expo-router";
import { View } from "react-native";
import { ReaderOptions, SaveButton, ShabadMeta, VerseView } from "@/components/Gurbani";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button, ErrorState, Loading } from "@/components/ui";
import { friendlyError, useHukamnama } from "@/lib/api";
import { useChats } from "@/lib/ask";
import { englishOf, openingLines } from "@/lib/shabad";
import { SPACE } from "@/theme/tokens";

/** "Monday, November 9" for BaniDB's YYYY-MM-DD date. */
function dayOf(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

/** Today's Hukamnama from Sri Darbar Sahib, in full, read the way the reader likes. */
export default function HukamnamaScreen() {
  const { data, error, isPending, refetch } = useHukamnama();
  const { start } = useChats();
  const shabads = data?.shabads ?? [];

  return (
    <Screen masthead width={860} title="Today's Hukamnama" kicker={data ? `From Sri Darbar Sahib, Amritsar · ${dayOf(data.date)}` : "From Sri Darbar Sahib, Amritsar"}>
      {isPending ? (
        <Loading />
      ) : error || !shabads.length ? (
        <ErrorState message={error ? friendlyError(error) : "Today's Hukamnama hasn't been published yet."} onRetry={() => refetch()} />
      ) : (
        <>
          <ReaderOptions />
          {shabads.map((shabad) => (
            <View key={shabad.shabadId} style={{ gap: SPACE.xl }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: SPACE.md }}>
                <View style={{ flex: 1 }}>
                  <ShabadMeta shabad={shabad} />
                </View>
                <SaveButton shabad={shabad} />
              </View>
              {shabad.verses.map((v) => (
                <VerseView key={v.verseId} verse={v} />
              ))}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACE.sm }}>
                <Button
                  label="Ask about this Hukamnama"
                  icon="chatbubble-ellipses-outline"
                  onPress={() => {
                    const id = start({ shabadId: shabad.shabadId, subject: englishOf(openingLines(shabad.verses, 1)[0] ?? shabad.verses[0]!) });
                    router.push({ pathname: "/chat/[id]", params: { id } });
                  }}
                />
                <Button label={`Read Ang ${shabad.ang}`} kind="quiet" icon="book-outline" onPress={() => router.push(`/ang/${shabad.ang}`)} />
              </View>
            </View>
          ))}
          <Text variant="meta" color="inkFaint" style={{ fontSize: 11 }}>
            {data.attribution}
          </Text>
        </>
      )}
    </Screen>
  );
}
