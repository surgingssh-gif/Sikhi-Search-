import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { calendarPath, getJson, localDate, type CalendarResponse } from "./api";

/**
 * Reminders live on the phone: a daily nudge to read the Hukamnama and a
 * morning note on Gurpurabs. They are local notifications, so no account or
 * server is involved. The web has no reminders.
 */

export interface ReminderPrefs {
  hukamnama: boolean;
  /** Time of the daily Hukamnama reminder, 24-hour. */
  hour: number;
  minute: number;
  /** A note at the same time on the morning of each Gurpurab and major day. */
  gurpurabs: boolean;
}

export const DEFAULT_PREFS: ReminderPrefs = { hukamnama: false, hour: 6, minute: 0, gurpurabs: false };

export const remindersSupported = Platform.OS !== "web";

const KEY = "sikhe.reminders";
const CHANNEL = "daily";
/** How far ahead Gurpurab reminders are scheduled; they are topped up each time the app opens. */
const GURPURAB_DAYS = 60;

export async function loadPrefs(): Promise<ReminderPrefs> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<ReminderPrefs>) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function savePrefs(prefs: ReminderPrefs): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(prefs)).catch(() => {});
}

/** Asks for permission to notify. False if the reader says no. */
export async function allowNotifications(): Promise<boolean> {
  if (!remindersSupported) return false;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL, { name: "Daily reminders", importance: Notifications.AndroidImportance.DEFAULT });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Replaces every scheduled reminder with the ones `prefs` asks for. */
export async function scheduleReminders(prefs: ReminderPrefs, now = new Date()): Promise<void> {
  if (!remindersSupported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!prefs.hukamnama && !prefs.gurpurabs) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;

  if (prefs.hukamnama) {
    await Notifications.scheduleNotificationAsync({
      content: { title: "Today's Hukamnama", body: "The Hukamnama from Sri Darbar Sahib is ready to read.", data: { url: "/" } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: prefs.hour, minute: prefs.minute, channelId: CHANNEL },
    });
  }

  if (prefs.gurpurabs) {
    const { events } = await getJson<CalendarResponse>(calendarPath(localDate(now), GURPURAB_DAYS));
    const byDay = new Map<string, string[]>();
    for (const e of events) if (e.major) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e.en]);
    for (const [date, names] of byDay) {
      const [y, m, d] = date.split("-").map(Number);
      const at = new Date(y!, m! - 1, d!, prefs.hour, prefs.minute);
      if (at <= now) continue;
      await Notifications.scheduleNotificationAsync({
        content: { title: names[0]!, body: names.length > 1 ? `Also today: ${names.slice(1).join("; ")}` : "Today in the Sikh calendar.", data: { url: "/calendar" } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
      });
    }
  }
}
