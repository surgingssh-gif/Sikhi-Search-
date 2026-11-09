import { useState } from "react";
import { View } from "react-native";
import { CalendarEventRow } from "@/components/CalendarEventRow";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Card, Chip, Divider, ErrorState, Loading } from "@/components/ui";
import { friendlyError, localDate, useCalendar, type CalendarEvent } from "@/lib/api";
import { dayLabel, whenLabel } from "@/lib/calendar";
import { SPACE } from "@/theme/tokens";

const FILTERS: { id: string; label: string; test: (e: CalendarEvent) => boolean }[] = [
  { id: "major", label: "Gurpurabs", test: (e) => e.major },
  { id: "all", label: "Everything", test: () => true },
  { id: "historical", label: "History", test: (e) => e.category === "historical" },
  { id: "bhagat", label: "Bhagats", test: (e) => e.category === "bhagat" },
  { id: "sangrand", label: "Sangrand", test: (e) => e.category === "sangrand" },
];

/** The Sikh calendar for the year ahead, month by month. */
export default function CalendarScreen() {
  const today = localDate();
  const { data, error, isPending, refetch } = useCalendar(today, 366);
  const [filter, setFilter] = useState("major");

  const test = FILTERS.find((f) => f.id === filter)!.test;
  const months = new Map<string, CalendarEvent[]>();
  for (const e of data?.events.filter(test) ?? []) {
    const key = e.date.slice(0, 7);
    months.set(key, [...(months.get(key) ?? []), e]);
  }

  return (
    <Screen masthead width={860} title="Sikh calendar" kicker={data?.today ? `${data.today.label} Nanakshahi` : undefined}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACE.sm }}>
        {FILTERS.map((f) => (
          <Chip key={f.id} label={f.label} active={f.id === filter} onPress={() => setFilter(f.id)} />
        ))}
      </View>

      {isPending ? (
        <Loading />
      ) : error ? (
        <ErrorState message={friendlyError(error)} onRetry={() => refetch()} />
      ) : (
        <>
          {[...months].map(([month, events]) => (
            <View key={month} style={{ gap: SPACE.md }}>
              <Text variant="label">{dayLabel(`${month}-15`, { month: "long", year: "numeric" })}</Text>
              <Card>
                {events.map((e, n) => (
                  <View key={e.id} style={{ gap: SPACE.md }}>
                    {n > 0 && <Divider />}
                    <CalendarEventRow event={e} when={whenLabel(e.date, today)} />
                  </View>
                ))}
              </Card>
            </View>
          ))}
          <Text variant="meta" color="inkFaint">
            {data.attribution} The SGPC has published dates up to {dayLabel(data.coversUntil, { month: "long", day: "numeric", year: "numeric" })}; later
            days will appear when the next Jantri is out.
          </Text>
        </>
      )}
    </Screen>
  );
}
