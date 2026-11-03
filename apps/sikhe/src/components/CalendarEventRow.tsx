import { StyleSheet, View } from "react-native";
import type { CalendarEvent } from "@/lib/api";
import { kindOf } from "@/lib/calendar";
import { useTheme } from "@/theme/theme";
import { FONT, RADIUS, SPACE } from "@/theme/tokens";
import { Text } from "./Text";

/**
 * A day in the Sikh calendar: a date badge, the day's name in English and
 * Gurmukhi, and what kind of day it is. Gurpurabs and major days get kesri.
 */
export function CalendarEventRow({ event, when, showPunjabi = true }: { event: CalendarEvent; when: string; showPunjabi?: boolean }) {
  const { colors } = useTheme();
  const kind = kindOf(event);
  const [day, month] = event.ns.split(" ");
  return (
    <View style={styles.row}>
      <View style={[styles.badge, { backgroundColor: event.major ? colors.accentWash : colors.sunken }]}>
        <Text variant="title" style={{ lineHeight: 22 }} color={event.major ? "accentInk" : "ink"}>
          {day}
        </Text>
        <Text variant="meta" style={{ fontSize: 11, lineHeight: 14 }} color={event.major ? "accentInk" : "inkSoft"}>
          {month}
        </Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="meta" color={event.major ? "accentInk" : "inkSoft"}>
          {when}
        </Text>
        <Text variant={event.major ? "title" : "body"} style={event.major ? undefined : { lineHeight: 22 }}>
          {event.en}
        </Text>
        {showPunjabi && event.category !== "sangrand" && (
          <Text variant="small" style={{ fontFamily: FONT.gurmukhi, fontSize: 15, lineHeight: 26 }}>
            {event.pa}
          </Text>
        )}
        {kind && (
          <Text variant="meta" color="inkFaint">
            {kind}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: SPACE.md, alignItems: "flex-start" },
  badge: { width: 56, paddingVertical: SPACE.sm, borderRadius: RADIUS.md, alignItems: "center" },
});
