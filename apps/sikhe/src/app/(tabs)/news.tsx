import { Screen } from "@/components/Screen";
import { ComingSoon } from "@/components/ui";

export default function NewsScreen() {
  return (
    <Screen title="News">
      <ComingSoon icon="newspaper-outline" title="Sikh news, America first" body="Stories about Sikhs in America and around the world, with photos, sections and a map of where each story happened." />
    </Screen>
  );
}
