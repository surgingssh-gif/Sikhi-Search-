import { useLocalSearchParams } from "expo-router";
import { ArticlePage } from "@/components/Magazine";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { ErrorState, Loading } from "@/components/ui";
import { friendlyError, useEdition } from "@/lib/api";

/** One story from the day's paper, on its own page. */
export default function IssueArticleScreen() {
  const { date, slug } = useLocalSearchParams<{ date: string; slug: string }>();
  const { data, error, isPending, refetch } = useEdition(date);
  const article = data?.articles.find((a) => a.slug === slug);
  return (
    <Screen masthead back>
      {isPending ? (
        <Loading label="Opening the story…" />
      ) : error ? (
        <ErrorState message={friendlyError(error)} onRetry={() => refetch()} />
      ) : data && article ? (
        <ArticlePage edition={data} article={article} />
      ) : (
        <Text variant="small">That story isn&apos;t in this paper.</Text>
      )}
    </Screen>
  );
}
