import { LibreFranklin_400Regular, LibreFranklin_500Medium, LibreFranklin_700Bold } from "@expo-google-fonts/libre-franklin";
import { NotoSerifGurmukhi_400Regular, NotoSerifGurmukhi_600SemiBold } from "@expo-google-fonts/noto-serif-gurmukhi";
import { SourceSerif4_400Regular, SourceSerif4_400Regular_Italic, SourceSerif4_600SemiBold, SourceSerif4_700Bold } from "@expo-google-fonts/source-serif-4";
import { PlayfairDisplay_800ExtraBold } from "@expo-google-fonts/playfair-display";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect, useState } from "react";
import { AreaProvider } from "@/lib/area";
import { ChatsProvider } from "@/lib/ask";
import { LibraryProvider } from "@/lib/library";
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
      if (url === "/" || url === "/hukamnama" || url === "/calendar") router.push(url);
    });
    return () => sub.remove();
  }, []);
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SourceSerif4_400Regular,
    SourceSerif4_400Regular_Italic,
    SourceSerif4_600SemiBold,
    SourceSerif4_700Bold,
    LibreFranklin_400Regular,
    LibreFranklin_500Medium,
    LibreFranklin_700Bold,
    PlayfairDisplay_800ExtraBold,
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
        <LibraryProvider>
          <ChatsProvider>
            <AreaProvider>
              <Root />
            </AreaProvider>
          </ChatsProvider>
        </LibraryProvider>
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
        <Stack.Screen name="hukamnama" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="map" />
        <Stack.Screen name="shabad/[id]" />
        <Stack.Screen name="ang/[ang]" />
        <Stack.Screen name="bani/[id]" />
        <Stack.Screen name="article" />
        <Stack.Screen name="timeline" />
        <Stack.Screen name="chat/[id]" />
      </Stack>
    </>
  );
}
