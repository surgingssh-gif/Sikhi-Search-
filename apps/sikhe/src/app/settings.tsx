import { AREAS, useArea } from "@/lib/area";
import { useEffect, useState } from "react";
import { Switch, View } from "react-native";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Card, Chip, Divider, Section } from "@/components/ui";
import { allowNotifications, DEFAULT_PREFS, loadPrefs, remindersSupported, savePrefs, scheduleReminders, type ReminderPrefs } from "@/lib/reminders";
import { useTheme, type Appearance } from "@/theme/theme";
import { SPACE } from "@/theme/tokens";

const APPEARANCES: { id: Appearance; label: string }[] = [
  { id: "system", label: "Automatic" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

/** Amritvela through the morning. */
const TIMES = [4, 5, 6, 7, 8, 9].map((hour) => ({ hour, label: `${hour}:00 AM` }));

function Row({ title, body, value, onChange }: { title: string; body: string; value: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: SPACE.md }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="body">{title}</Text>
        <Text variant="meta">{body}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={title}
        trackColor={{ true: colors.accent, false: colors.line }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const { area, setArea } = useArea();
  const { appearance, setAppearance } = useTheme();
  const [prefs, setPrefs] = useState<ReminderPrefs>(DEFAULT_PREFS);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    loadPrefs().then(setPrefs);
  }, []);

  const update = async (next: ReminderPrefs) => {
    if ((next.hukamnama || next.gurpurabs) && !(await allowNotifications())) {
      setDenied(true);
      return;
    }
    setDenied(false);
    setPrefs(next);
    await savePrefs(next);
    await scheduleReminders(next).catch(() => {});
  };

  return (
    <Screen back title="Settings">
      <Section title="Appearance">
        <View style={{ flexDirection: "row", gap: SPACE.sm }}>
          {APPEARANCES.map((a) => (
            <Chip key={a.id} label={a.label} active={appearance === a.id} onPress={() => setAppearance(a.id)} />
          ))}
        </View>
        <Text variant="meta">Automatic follows your phone. Dark is easier on the eyes at Amritvela.</Text>
      </Section>

      <Section title="Near you">
        <Text variant="small">Choose your area for a section of news from your own Sangat. It is kept on this device only.</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACE.sm }}>
          <Chip label="None" active={!area} onPress={() => setArea(null)} />
          {AREAS.map((a) => (
            <Chip key={a.id} label={a.label} active={area?.id === a.id} onPress={() => setArea(a.id)} />
          ))}
        </View>
        {area && <Text variant="meta">{area.towns}</Text>}
      </Section>

      <Section title="Reminders">
        {remindersSupported ? (
          <Card>
            <Row
              title="Today's Hukamnama"
              body="A reminder each morning to read the Hukamnama."
              value={prefs.hukamnama}
              onChange={(hukamnama) => update({ ...prefs, hukamnama })}
            />
            <Divider />
            <Row
              title="Gurpurabs"
              body="A note on the morning of each Gurpurab and major day in the Sikh calendar."
              value={prefs.gurpurabs}
              onChange={(gurpurabs) => update({ ...prefs, gurpurabs })}
            />
            {(prefs.hukamnama || prefs.gurpurabs) && (
              <>
                <Divider />
                <Text variant="meta">Remind me at</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACE.sm }}>
                  {TIMES.map((t) => (
                    <Chip key={t.hour} label={t.label} active={prefs.hour === t.hour && prefs.minute === 0} onPress={() => update({ ...prefs, hour: t.hour, minute: 0 })} />
                  ))}
                </View>
              </>
            )}
            {denied && (
              <Text variant="meta" color="danger">
                Notifications are turned off for Sikhe. You can allow them in your phone&apos;s Settings.
              </Text>
            )}
          </Card>
        ) : (
          <Text variant="small">Reminders are in the Sikhe app for iPhone and Android.</Text>
        )}
      </Section>

      <Section title="About">
        <Text variant="small">
          Sikhe keeps your settings on this device; there is no account. Gurbani comes from BaniDB by Khalis Foundation, and Sikh calendar dates from
          the SGPC&apos;s Nanakshahi Jantri.
        </Text>
      </Section>
    </Screen>
  );
}
