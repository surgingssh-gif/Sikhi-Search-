import { View } from "react-native";
import { EventRow } from "@/components/History";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Card, Divider, ErrorState, Loading } from "@/components/ui";
import { friendlyError, type HistoryEvent } from "@/lib/api";
import { ERAS, eraOf, useTimeline } from "@/lib/history";
import { SPACE } from "@/theme/tokens";

/** Our own dated events, oldest first, era by era. Each opens its Wikipedia article. */
export default function TimelineScreen() {
  const { data, error, isPending, refetch } = useTimeline();
  const byEra = new Map<string, HistoryEvent[]>();
  for (const e of [...(data?.events ?? [])].sort((a, b) => (a.date < b.date ? -1 : 1))) {
    const era = eraOf(Number(e.date.slice(0, 4))).title;
    byEra.set(era, [...(byEra.get(era) ?? []), e]);
  }

  return (
    <Screen back kicker="Sikh history" title="The timeline">
      {isPending ? (
        <Loading />
      ) : error ? (
        <ErrorState message={friendlyError(error)} onRetry={() => refetch()} />
      ) : (
        <>
          {ERAS.filter((era) => byEra.has(era.title)).map((era) => (
            <View key={era.title} style={{ gap: SPACE.md }}>
              <View>
                <Text variant="headline">{era.title}</Text>
                <Text variant="meta">{era.blurb}</Text>
              </View>
              <Card>
                {byEra.get(era.title)!.map((e, n) => (
                  <View key={e.id} style={{ gap: SPACE.md }}>
                    {n > 0 && <Divider />}
                    <EventRow event={e} />
                  </View>
                ))}
              </Card>
            </View>
          ))}
          <Text variant="meta" color="inkFaint">
            Every date was checked against its Wikipedia article. Gurpurabs move with the lunar calendar, so they are in the Sikh calendar instead.
          </Text>
        </>
      )}
    </Screen>
  );
}
