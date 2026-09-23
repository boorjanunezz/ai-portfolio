"use client";

import { useCallback, useRef, useState } from "react";
import { MAX_HISTORY_MESSAGES, MAX_MESSAGE_LENGTH, type AnswerStatus, type ChatEvent, type ChatTurn, type Source } from "@/lib/types";

export interface UIMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  status?: AnswerStatus;
  streaming?: boolean;
  error?: boolean;
  retry?: string; // pregunta a reenviar si hubo error
}

interface Messages {
  noConnection: string;
  interrupted: string;
}

/** Estado del chat y envío con respuesta en streaming (NDJSON, ver lib/types.ts). */
export function useChat(texts: Messages) {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const nextId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const update = (id: number, patch: (m: UIMessage) => Partial<UIMessage>) =>
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch(m) } : m)));

  /** `base`: conversación sobre la que se pregunta (en un reintento, sin la pregunta fallida). */
  const send = useCallback(
    async (text: string, base?: UIMessage[]) => {
      const question = text.trim();
      if (!question || loading || question.length > MAX_MESSAGE_LENGTH) return;

      const clean = (base ?? messages).filter((m) => !m.error);
      const history: ChatTurn[] = clean.map((m) => ({ role: m.role, content: m.content })).slice(-MAX_HISTORY_MESSAGES);
      const answerId = nextId.current + 1;
      nextId.current += 2;
      setMessages([...clean, { id: answerId - 1, role: "user", content: question }]);
      setLoading(true);

      const controller = new AbortController();
      abortRef.current = controller;
      let started = false;
      const ensureAnswer = () => {
        if (started) return;
        started = true;
        setMessages((prev) => [...prev, { id: answerId, role: "assistant", content: "", streaming: true }]);
      };

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: question, history }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          const data = (await res.json().catch(() => null)) as { error?: unknown } | null;
          throw new Error(typeof data?.error === "string" ? data.error : texts.noConnection);
        }

        let finished = false;
        for await (const event of readEvents(res.body)) {
          if (event.type === "delta") {
            ensureAnswer();
            update(answerId, (m) => ({ content: m.content + event.text }));
          } else if (event.type === "reset") {
            if (started) update(answerId, () => ({ content: "" }));
          } else if (event.type === "done") {
            ensureAnswer();
            update(answerId, () => ({ streaming: false, sources: event.sources, status: event.status }));
            finished = true;
          } else {
            throw new Error(event.message);
          }
        }
        if (!finished) throw new Error(texts.interrupted);
      } catch (err) {
        if (controller.signal.aborted) return; // conversación reiniciada por el usuario
        const message = err instanceof Error && err.message !== "Failed to fetch" ? err.message : texts.noConnection;
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== answerId),
          { id: answerId, role: "assistant", content: message, error: true, retry: question },
        ]);
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setLoading(false);
        }
      }
    },
    [loading, messages, texts.interrupted, texts.noConnection],
  );

  const retry = useCallback((question: string) => void send(question, messages.slice(0, -2)), [messages, send]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setMessages([]);
  }, []);

  return { messages, loading, send, retry, reset };
}

/** Lee el cuerpo NDJSON línea a línea. */
async function* readEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<ChatEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) if (line.trim()) yield JSON.parse(line) as ChatEvent;
  }
  if (buffer.trim()) yield JSON.parse(buffer) as ChatEvent;
}
