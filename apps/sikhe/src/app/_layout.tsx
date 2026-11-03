import { Fraunces_400Regular_Italic, Fraunces_600SemiBold } from "@expo-google-fonts/fraunces";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { NotoSerifGurmukhi_400Regular, NotoSerifGurmukhi_600SemiBold } from "@expo-google-fonts/noto-serif-gurmukhi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect, useState } from "react";
import { loadPrefs, remindersSupported, scheduleReminders } from "@/lib/reminders";
import { ThemeProvider, useTheme } from "@/theme/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

if (remindersSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
  });
}

/** Opens the page a reminder points to, and tops up Gurpurab reminders each time the app starts. */
function useReminders() {
  useEffect(() => {
    if (!remindersSupported) return;
    loadPrefs()
      .then((prefs) => scheduleReminders(prefs))
      .catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (url === "/" || url === "/calendar") router.push(url);
    });
    return () => sub.remove();
  }, []);
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_400Regular_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    NotoSerifGurmukhi_400Regular,
    NotoSerifGurmukhi_600SemiBold,
  });
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }));

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Root />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function Root() {
  const { colors, dark } = useTheme();
  useReminders();
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
  }, [colors.bg]);
  return (
    <>
      <StatusBar style={dark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="calendar" />
        <Stack.Screen name="settings" />
      </Stack>
    </>
  );
}
