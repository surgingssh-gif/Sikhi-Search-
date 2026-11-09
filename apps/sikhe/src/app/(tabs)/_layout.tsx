import { Tabs } from "expo-router/js-tabs";
import { useTheme } from "@/theme/theme";

/**
 * The five sections. There is no tab bar: like a newspaper, every section
 * opens with the masthead, and its row of section links is how you move
 * between them. Each section keeps its place while you are away.
 */
export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs tabBar={() => null} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="index" options={{ title: "Today" }} />
      <Tabs.Screen name="news" options={{ title: "News" }} />
      <Tabs.Screen name="gurbani" options={{ title: "Gurbani" }} />
      <Tabs.Screen name="history" options={{ title: "History" }} />
      <Tabs.Screen name="ask" options={{ title: "Ask" }} />
    </Tabs>
  );
}
