import { Screen } from "@/components/Screen";
import { ComingSoon } from "@/components/ui";

export default function AskScreen() {
  return (
    <Screen title="Ask">
      <ComingSoon icon="chatbubble-ellipses-outline" title="Ask about Sikhi" body="Ask a question about Gurbani, history or living as a Sikh. Answers quote Gurbani from BaniDB and never make it up." />
    </Screen>
  );
}
