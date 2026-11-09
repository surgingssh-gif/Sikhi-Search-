import type { AskResult, DiscussResult, Stage } from "@ask-sikhi/core";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { fetch as streamingFetch } from "expo/fetch";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { API_URL, ApiError, getJson } from "./api";

export type { AskResult, DiscussResult, Passage, Segment, Stage } from "@ask-sikhi/core";

/**
 * Conversations with Sikhe, kept on the device. The server keeps nothing: each
 * question goes up with the turns before it, and the answer comes back over
 * Server-Sent Events so the reader can watch it being worked out.
 */

export interface Turn {
  id: string;
  question: string;
  status: "pending" | "done" | "error";
  stage: Stage | null;
  /** An answer from the Ask pipeline, or a reply about one shabad. */
  result?: (AskResult | DiscussResult) & { attribution?: string };
  error?: string;
}

export interface Chat {
  id: string;
  /** Set for a conversation about one shabad. */
  shabadId?: number;
  /** The shabad's opening line in English, for the list. */
  subject?: string;
  turns: Turn[];
  createdAt: string;
  updatedAt: string;
}

export const isAnswer = (r: Turn["result"]): r is AskResult & { attribution?: string } => Boolean(r && "passages" in r);

const STORE_KEY = "sikhe.chats";
const MAX_CHATS = 50;
/** The server accepts 12 earlier messages, each up to 4,000 characters. */
const MAX_HISTORY = 12;

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/** A chat's name in the list: its first question, or what it is about. */
export function chatTitle(chat: Chat): string {
  return chat.turns[0]?.question ?? chat.subject ?? "New conversation";
}

/** Whether Ask is switched on at the server. */
export function useAskAvailable() {
  return useQuery({ queryKey: ["health"], queryFn: () => getJson<{ ok: boolean; ai: boolean }>("/v1/health"), staleTime: 5 * 60_000 });
}

/**
 * POST to an AI endpoint and follow its progress. Resolves with the result;
 * rejects with ApiError.
 */
async function streamPost<T>(path: string, body: object, onStage: (stage: Stage) => void): Promise<T> {
  let res: Awaited<ReturnType<typeof streamingFetch>>;
  try {
    res = await streamingFetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "text/event-stream" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("network");
  }
  if (!res.ok || !res.headers.get("content-type")?.includes("text/event-stream") || !res.body) {
    const err = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new ApiError(err.error ?? "internal_error", err.message);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
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
      else if (event === "result") return parsed as T;
      else if (event === "error") throw new ApiError(parsed.error ?? "internal_error", parsed.message);
    }
  }
  throw new ApiError("network");
}

const FRIENDLY: Record<string, string> = {
  rate_limited: "You've asked several questions in a row. Please wait a minute and try again.",
  ai_not_configured: "Ask isn't available right now.",
  upstream_unavailable: "BaniDB, the Gurbani source, couldn't be reached. Please try again shortly.",
  declined: "This question can't be answered here.",
  invalid_request: "Questions need to be between 3 and 500 characters.",
  network: "Couldn't reach Sikhe. Check your connection and try again.",
};

function errorText(err: unknown): string {
  if (err instanceof ApiError) return FRIENDLY[err.code] ?? (err.code === "internal_error" ? "Something went wrong on our side. Please try again." : err.message);
  return FRIENDLY.network!;
}

interface Chats {
  ready: boolean;
  /** Conversations with at least one question, newest first. */
  chats: Chat[];
  get: (id: string) => Chat | undefined;
  /** Starts a conversation, about a shabad if given, asks its first question if given, and returns its id. */
  start: (about?: { shabadId: number; subject: string }, question?: string) => string;
  send: (chatId: string, question: string) => void;
  /** Asks the last question again after an error. */
  retry: (chatId: string) => void;
  remove: (chatId: string) => void;
}

const ChatsContext = createContext<Chats | null>(null);

export function ChatsProvider({ children }: { children: ReactNode }) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [ready, setReady] = useState(false);
  // The latest chats, for requests that finish after several renders.
  const latest = useRef<Chat[]>([]);
  latest.current = chats;

  useEffect(() => {
    AsyncStorage.getItem(STORE_KEY)
      .then((raw) => {
        if (!raw) return;
        // An answer still pending when the app closed will never arrive.
        const saved = (JSON.parse(raw) as Chat[]).map((c) => ({
          ...c,
          turns: c.turns.map((t): Turn => (t.status === "pending" ? { ...t, status: "error", stage: null, error: "This answer was interrupted. Ask again?" } : t)),
        }));
        setChats((now) => [...now, ...saved.filter((s) => !now.some((c) => c.id === s.id))]);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    const keep = chats.filter((c) => c.turns.length > 0).slice(0, MAX_CHATS);
    AsyncStorage.setItem(STORE_KEY, JSON.stringify(keep)).catch(() => {});
  }, [chats, ready]);

  const update = useCallback((chatId: string, fn: (c: Chat) => Chat) => {
    setChats((cs) => {
      const chat = cs.find((c) => c.id === chatId);
      if (!chat) return cs;
      const next = fn(chat);
      return [next, ...cs.filter((c) => c.id !== chatId)];
    });
  }, []);

  const updateTurn = useCallback(
    (chatId: string, turnId: string, patch: Partial<Turn>) =>
      update(chatId, (c) => ({ ...c, updatedAt: new Date().toISOString(), turns: c.turns.map((t) => (t.id === turnId ? { ...t, ...patch } : t)) })),
    [update],
  );

  const run = useCallback(
    (chat: Chat, turn: Turn) => {
      const history = chat.turns
        .filter((t) => t.id !== turn.id && t.status === "done" && t.result)
        .flatMap((t) => [
          { role: "user" as const, content: t.question.slice(0, 4000) },
          { role: "assistant" as const, content: t.result!.answer.slice(0, 4000) },
        ])
        .slice(-MAX_HISTORY);
      const onStage = (stage: Stage) => updateTurn(chat.id, turn.id, { stage });
      const request = chat.shabadId
        ? streamPost<Turn["result"]>("/v1/discuss", { shabadId: chat.shabadId, question: turn.question, history }, onStage)
        : streamPost<Turn["result"]>("/v1/ask", { question: turn.question, history }, onStage);
      request
        .then((result) => updateTurn(chat.id, turn.id, { status: "done", stage: null, result }))
        .catch((err: unknown) => updateTurn(chat.id, turn.id, { status: "error", stage: null, error: errorText(err) }));
    },
    [updateTurn],
  );

  const value = useMemo<Chats>(
    () => ({
      ready,
      chats: chats.filter((c) => c.turns.length > 0),
      get: (id) => chats.find((c) => c.id === id),
      start: (about, question) => {
        const now = new Date().toISOString();
        const q = question?.trim();
        const turn: Turn | undefined = q ? { id: newId(), question: q, status: "pending", stage: null } : undefined;
        const chat: Chat = { id: newId(), turns: turn ? [turn] : [], createdAt: now, updatedAt: now, ...(about ?? {}) };
        setChats((cs) => [chat, ...cs.filter((c) => c.turns.length > 0)]);
        if (turn) run(chat, turn);
        return chat.id;
      },
      send: (chatId, question) => {
        const chat = latest.current.find((c) => c.id === chatId);
        const q = question.trim();
        if (!chat || q.length === 0) return;
        const turn: Turn = { id: newId(), question: q, status: "pending", stage: null };
        update(chatId, (c) => ({ ...c, updatedAt: new Date().toISOString(), turns: [...c.turns, turn] }));
        run(chat, turn);
      },
      retry: (chatId) => {
        const chat = latest.current.find((c) => c.id === chatId);
        const last = chat?.turns.at(-1);
        if (!chat || !last || last.status !== "error") return;
        updateTurn(chatId, last.id, { status: "pending", error: undefined });
        run(chat, last);
      },
      remove: (chatId) => setChats((cs) => cs.filter((c) => c.id !== chatId)),
    }),
    [chats, ready, run, update, updateTurn],
  );

  return <ChatsContext.Provider value={value}>{children}</ChatsContext.Provider>;
}

export function useChats(): Chats {
  const ctx = useContext(ChatsContext);
  if (!ctx) throw new Error("useChats needs a ChatsProvider");
  return ctx;
}

/** Steps shown while an answer is worked out, in the order the server sends them. */
export const ASK_STEPS: { stage: Stage; label: string }[] = [
  { stage: "understanding", label: "Understanding your question" },
  { stage: "searching", label: "Searching Gurbani" },
  { stage: "reading", label: "Reading shabads in context" },
  { stage: "writing", label: "Writing the answer" },
  { stage: "checking", label: "Checking every citation" },
];

export const DISCUSS_STEPS: { stage: Stage; label: string }[] = [
  { stage: "reading", label: "Reading the shabad" },
  { stage: "writing", label: "Thinking it through" },
  { stage: "checking", label: "Checking line references" },
];

export const STARTERS = [
  "What does Gurbani say about ego?",
  "Why do Sikhs wear a dastar?",
  "What is Naam Simran?",
  "Who was Bhai Ghanaiya Ji?",
  "How should I deal with anger?",
  "What happened at Chamkaur?",
];

export const SHABAD_STARTERS = ["What is this shabad about?", "Explain the Rahao line", "How can I live this today?"];
