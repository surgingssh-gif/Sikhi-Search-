import { useState } from "react";
import { View } from "react-native";
import { friendlyError, useHukamnama } from "@/lib/api";
import { englishOf, isHeading, openingLines } from "@/lib/shabad";
import { SPACE } from "@/theme/tokens";
import { Text } from "./Text";
import { Button, Card, ErrorState, Loading } from "./ui";

/**
 * Today's Hukamnama from Sri Darbar Sahib, live from BaniDB: the opening lines
 * with their meaning, and the whole shabad a tap away.
 */
export function HukamnamaCard() {
  const { data, error, isPending, refetch } = useHukamnama();
  const [open, setOpen] = useState(false);
  const shabad = data?.shabads[0];

  return (
    <Card featured>
      <Text variant="label">Today&apos;s Hukamnama</Text>
      {isPending ? (
        <Loading />
      ) : error || !shabad ? (
        <ErrorState message={error ? friendlyError(error) : "Today's Hukamnama hasn't been published yet."} onRetry={() => refetch()} />
      ) : (
        <>
          <View style={{ gap: SPACE.lg }}>
            {(open ? shabad.verses : openingLines(shabad.verses, 2)).map((v) =>
              isHeading(v) ? (
                <Text key={v.verseId} variant="meta" style={{ fontStyle: "italic" }}>
                  {englishOf(v)}
                </Text>
              ) : (
                <View key={v.verseId} style={{ gap: SPACE.xs }}>
                  <Text variant="gurmukhiLarge">{v.gurmukhi}</Text>
                  <Text variant="small">{englishOf(v)}</Text>
                </View>
              ),
            )}
          </View>
          <Text variant="meta">
            Sri Darbar Sahib · Ang {shabad.ang}
            {shabad.writer ? ` · ${shabad.writer.english}` : ""}
            {shabad.raag ? ` · ${shabad.raag.english}` : ""}
          </Text>
          <Button label={open ? "Show less" : "Read the full shabad"} kind="quiet" icon={open ? "chevron-up" : "book-outline"} onPress={() => setOpen(!open)} />
          <Text variant="meta" color="inkFaint" style={{ fontSize: 11 }}>
            {data.attribution}
          </Text>
        </>
      )}
    </Card>
  );
}
