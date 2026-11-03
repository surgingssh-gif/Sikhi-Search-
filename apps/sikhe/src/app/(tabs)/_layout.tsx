import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router/js-tabs";
import { Platform, StyleSheet, useWindowDimensions } from "react-native";
import type { IconName } from "@/components/ui";
import { useTheme } from "@/theme/theme";
import { FONT, WIDE } from "@/theme/tokens";

const TABS: { name: string; title: string; icon: IconName; active: IconName }[] = [
  { name: "index", title: "Today", icon: "sunny-outline", active: "sunny" },
  { name: "news", title: "News", icon: "newspaper-outline", active: "newspaper" },
  { name: "gurbani", title: "Gurbani", icon: "book-outline", active: "book" },
  { name: "history", title: "History", icon: "time-outline", active: "time" },
  { name: "ask", title: "Ask", icon: "chatbubble-ellipses-outline", active: "chatbubble-ellipses" },
];

export default function TabsLayout() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  // On a wide browser window the tabs become a sidebar.
  const sidebar = Platform.OS === "web" && width >= WIDE;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: sidebar ? "left" : "bottom",
        tabBarVariant: sidebar ? "material" : "uikit",
        tabBarLabelPosition: sidebar ? "beside-icon" : "below-icon",
        tabBarActiveTintColor: colors.accentInk,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          borderRightColor: colors.line,
          borderTopWidth: sidebar ? 0 : StyleSheet.hairlineWidth,
          borderRightWidth: sidebar ? StyleSheet.hairlineWidth : 0,
          ...(sidebar ? { width: 220, paddingTop: 24 } : {}),
        },
        tabBarLabelStyle: { fontFamily: FONT.sansMedium, fontSize: sidebar ? 15 : 11 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ focused, color, size }) => <Ionicons name={focused ? t.active : t.icon} size={size} color={String(color)} />,
          }}
        />
      ))}
    </Tabs>
  );
}
