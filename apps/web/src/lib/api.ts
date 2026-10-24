import type { AngContents, AskResult, ChatTurn, DiscussResult, ExploreResult, Hukamnama, Shabad, Stage } from "@ask-sikhi/core";

export type {
  AngContents,
  AngShabad,
  AskResult,
  ChatTurn,
  DiscussResult,
  ExploreResult,
  Hukamnama,
  Passage,
  PassageLine,
  Segment,
  Shabad,
  Stage,
  Verse,
} from "@ask-sikhi/core";

export type Mode = "ask" | "explore";

/** Browser-side base URL of the Ask Sikhi API. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";
/** Server-side base URL (can be an internal address in production). */
const SERVER_API_URL = process.env.API_URL ?? API_URL;

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
  }
}

const FRIENDLY: Record<string, string> = {
  rate_limited: "You've asked several questions in a row. Please wait a minute and try again.",
  ai_not_configured: "Answers aren't available right now: the server has no AI model configured.",
  upstream_unavailable: "BaniDB, the Gurbani source, couldn't be reached. Please try again shortly.",
  declined: "This question can't be answered here.",
  invalid_request: "Please write a question between 3 and 500 characters.",
  invalid_ang: "Sri Guru Granth Sahib Ji has Angs 1 to 1430.",
  not_found: "That shabad couldn't be found.",
  network: "Couldn't reach Ask Sikhi. Check your connection and try again.",
  internal_error: "Something went wrong on our side. Please try again.",
};

export function friendlyError(err: unknown): string {
  if (err instanceof ApiError) return FRIENDLY[err.code] ?? err.message;
  return FRIENDLY.network!;
}

/** Ask or Explore a question, following progress as it happens. */
export function askStream<M extends Mode>(
  mode: M,
  question: string,
  history: ChatTurn[],
  onStage: (stage: Stage) => void,
): Promise<M extends "ask" ? AskResult : ExploreResult> {
  return streamPost(`/v1/${mode}`, mode === "ask" ? { question, history } : { question }, onStage);
}

/** Ask about one shabad in an ongoing discussion. */
export function discussStream(shabadId: number, question: string, history: ChatTurn[], onStage: (stage: Stage) => void): Promise<DiscussResult> {
  return streamPost("/v1/discuss", { shabadId, question, history }, onStage);
}

/**
 * POST to an AI endpoint and follow progress over Server-Sent Events.
 * Resolves with the final result; rejects with ApiError.
 */
async function streamPost<T>(path: string, body: object, onStage: (stage: Stage) => void): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "text/event-stream" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("network");
  }

  if (!res.ok || !res.headers.get("content-type")?.includes("text/event-stream")) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new ApiError(body.error ?? "internal_error", body.message);
  }

  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const event = /^event: (.*)$/m.exec(raw)?.[1];
      const data = raw
        .split("\n")
        .filter((l) => l.startsWith("data: "))
        .map((l) => l.slice(6))
        .join("\n");
      if (!event || !data) continue;
      const parsed = JSON.parse(data);
      if (event === "stage") onStage(parsed.stage);
      else if (event === "result") return parsed;
      else if (event === "error") throw new ApiError(parsed.error ?? "internal_error", parsed.message);
    }
  }
  throw new ApiError("network");
}

export async function getShabad(id: number): Promise<Shabad | null> {
  const res = await fetch(`${SERVER_API_URL}/v1/shabads/${id}`, { next: { revalidate: 3600 } });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new ApiError("upstream_unavailable");
  return ((await res.json()) as { shabad: Shabad }).shabad;
}

/** Today's Hukamnama (server-side). Null if BaniDB can't be reached, so the page still renders. */
export async function getHukamnama(): Promise<Hukamnama | null> {
  try {
    const res = await fetch(`${SERVER_API_URL}/v1/hukamnama/today`, { next: { revalidate: 600 } });
    return res.ok ? ((await res.json()) as Hukamnama) : null;
  } catch {
    return null;
  }
}

/** The shabads on one Ang (browser-side). */
export async function fetchAng(ang: number): Promise<AngContents> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/v1/angs/${ang}`);
  } catch {
    throw new ApiError("network");
  }
  const body = (await res.json().catch(() => ({}))) as AngContents & { error?: string; message?: string };
  if (!res.ok) throw new ApiError(body.error ?? "internal_error", body.message);
  return body;
}
