import { useLocalSearchParams } from "expo-router";
import { useRef } from "react";
import type { ScrollViewInstance } from "react-native";
import { BackIssues, Magazine } from "@/components/Magazine";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { ErrorState, Loading } from "@/components/ui";
import { friendlyError, useEdition } from "@/lib/api";

/** A back issue of the magazine. */
export default function IssueScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { data, error, isPending, refetch } = useEdition(date);
  const scrollRef = useRef<ScrollViewInstance>(null);
  return (
    <Screen masthead back scrollRef={scrollRef}>
      {isPending ? (
        <Loading label="Opening the issue…" />
      ) : error ? (
        <ErrorState message={friendlyError(error)} onRetry={() => refetch()} />
      ) : data ? (
        <>
          <Magazine edition={data} scrollRef={scrollRef} />
          <BackIssues current={data.date} />
        </>
      ) : (
        <Text variant="small">There's no issue for that day.</Text>
      )}
    </Screen>
  );
}
