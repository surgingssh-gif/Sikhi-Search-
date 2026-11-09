import { Link, router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { PrevNext, ReaderOptions, VerseView } from "@/components/Gurbani";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Divider, ErrorState, Loading } from "@/components/ui";
import { friendlyError } from "@/lib/api";
import { LAST_ANG, useAng } from "@/lib/gurbani";
import { SPACE } from "@/theme/tokens";

/** One Ang (page) of Sri Guru Granth Sahib Ji, as it is printed. */
export default function AngScreen() {
  const ang = Number(useLocalSearchParams<{ ang: string }>().ang);
  const valid = Number.isInteger(ang) && ang >= 1 && ang <= LAST_ANG;
  const { data, error, isPending, refetch } = useAng(ang);
  const go = (n: number) => router.setParams({ ang: String(n) });

  return (
    <Screen back kicker="Sri Guru Granth Sahib Ji" title={valid ? `Ang ${ang}` : "Ang"}>
      {!valid ? (
        <ErrorState message={`Sri Guru Granth Sahib Ji has Angs 1 to ${LAST_ANG}.`} />
      ) : isPending ? (
        <Loading />
      ) : error ? (
        <ErrorState message={friendlyError(error)} onRetry={() => refetch()} />
      ) : (
        <>
          <ReaderOptions />
          {data.shabads.map((shabad, n) => (
            <View key={shabad.shabadId} style={{ gap: SPACE.xl }}>
              {n > 0 && <Divider />}
              {shabad.verses.map((v) => (
                <VerseView key={v.verseId} verse={v} />
              ))}
              <Link href={`/shabad/${shabad.shabadId}`}>
                <Text variant="meta" color="accentInk">
                  {[shabad.raag?.english, shabad.writer?.english].filter(Boolean).join(" · ")}
                  {" · "}Read the whole shabad ›
                </Text>
              </Link>
            </View>
          ))}
          <PrevNext prevLabel={`Ang ${ang - 1}`} nextLabel={`Ang ${ang + 1}`} onPrev={ang > 1 ? () => go(ang - 1) : undefined} onNext={ang < LAST_ANG ? () => go(ang + 1) : undefined} />
          <Text variant="meta" color="inkFaint" style={{ fontSize: 11 }}>
            {data.attribution}
          </Text>
        </>
      )}
    </Screen>
  );
}
