import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { ReaderOptions, VerseView } from "@/components/Gurbani";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { ErrorState, Loading } from "@/components/ui";
import { friendlyError } from "@/lib/api";
import { baniTitle, useBani, type BaniVerse } from "@/lib/gurbani";
import { FONT, SPACE } from "@/theme/tokens";

/** Lines that share a paragraph number are recited together. */
function paragraphs(verses: BaniVerse[]): BaniVerse[][] {
  const out: BaniVerse[][] = [];
  for (const v of verses) {
    const last = out[out.length - 1];
    if (last && last[0]!.paragraph === v.paragraph && !v.header && !last[0]!.header) last.push(v);
    else out.push([v]);
  }
  return out;
}

/** A bani from Nitnem or beyond, read from start to finish. */
export default function BaniScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const { data, error, isPending, refetch } = useBani(id);
  const bani = data?.bani;

  return (
    <Screen back title={bani ? baniTitle(bani) : "Bani"}>
      {isPending ? (
        <Loading label="Opening the bani…" />
      ) : error || !bani ? (
        <ErrorState message={friendlyError(error)} onRetry={() => refetch()} />
      ) : (
        <>
          <View style={{ gap: SPACE.sm }}>
            <Text style={{ fontFamily: FONT.gurmukhi, fontSize: 22, lineHeight: 36 }} color="accentInk">
              {bani.gurmukhi}
            </Text>
            <Text variant="meta">{[bani.source?.english, bani.writer?.english].filter(Boolean).join(" · ")}</Text>
            <ReaderOptions />
          </View>
          {paragraphs(bani.verses).map((para) => (
            <View key={para[0]!.verseId} style={{ gap: SPACE.lg }}>
              {para.map((v) =>
                v.header ? (
                  <Text key={v.verseId} style={{ fontFamily: FONT.gurmukhiBold, fontSize: 20, lineHeight: 34, textAlign: "center" }}>
                    {v.gurmukhi}
                  </Text>
                ) : (
                  <VerseView key={v.verseId} verse={v} />
                ),
              )}
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
