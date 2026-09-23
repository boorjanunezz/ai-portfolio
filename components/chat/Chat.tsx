"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { MAX_HISTORY_MESSAGES, MAX_MESSAGE_LENGTH, type ChatResponse, type ChatTurn } from "@/lib/types";
import { SUGGESTED_QUESTIONS } from "@/lib/sections";
import { Message, type UIMessage } from "./Message";
import { Thinking } from "./Thinking";

export function Chat({ files }: { files: string[] }) {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const nextId = useRef(0);

  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    log.scrollTo({ top: log.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [messages, loading]);

  /** `base`: conversación sobre la que se pregunta (en un reintento, sin la pregunta fallida). */
  async function send(text: string, base: UIMessage[] = messages) {
    const question = text.trim();
    if (!question || loading || question.length > MAX_MESSAGE_LENGTH) return;

    const clean = base.filter((m) => !m.error);
    const history: ChatTurn[] = clean.map((m) => ({ role: m.role, content: m.content })).slice(-MAX_HISTORY_MESSAGES);

    setMessages([...clean, { id: nextId.current++, role: "user", content: question }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, history }),
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok || !isChatResponse(data)) {
        const message = (data as { error?: unknown } | null)?.error;
        throw new Error(typeof message === "string" ? message : "Respuesta inesperada del servidor.");
      }
      setMessages((prev) => [
        ...prev,
        { id: nextId.current++, role: "assistant", content: data.answer, sources: data.sources, status: data.status },
      ]);
    } catch (err) {
      const message = err instanceof Error && err.message !== "Failed to fetch" ? err.message : "No hay conexión con el servidor.";
      setMessages((prev) => [...prev, { id: nextId.current++, role: "assistant", content: message, error: true, retry: question }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus({ preventScroll: true });
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send(input);
    }
  }

  function retry(question: string) {
    void send(question, messages.slice(0, -2)); // quita la pregunta fallida y el error
  }

  const remaining = MAX_MESSAGE_LENGTH - input.length;
  const canSend = input.trim().length > 0 && remaining >= 0 && !loading;

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-label="Asistente sobre Borja"
        className="flex h-[min(72vh,720px)] min-h-[480px] flex-col rounded-sm bg-surface"
      >
        <header className="flex items-center justify-between gap-4 border-b border-rule px-4 py-3 sm:px-6">
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            <span aria-hidden className="size-2 rounded-full bg-accent" />
            Asistente · responde solo con los documentos de Borja
          </p>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setMessages([])}
              disabled={loading}
              className="text-sm text-ink-soft underline-offset-4 transition-colors duration-[var(--dur-fast)] hover:text-ink hover:underline active:text-accent-ink disabled:opacity-40"
            >
              Nueva conversación
            </button>
          )}
        </header>

        <div ref={logRef} role="log" aria-live="polite" aria-busy={loading} className="flex-1 overflow-y-auto px-4 py-8 sm:px-8">
          {messages.length === 0 && !loading ? (
            <EmptyState files={files} />
          ) : (
            <ol className="space-y-12">
              {messages.map((m) => (
                <Message key={m.id} message={m} onRetry={retry} />
              ))}
              {loading && (
                <li>
                  <Thinking files={files} />
                </li>
              )}
            </ol>
          )}
        </div>

        <form onSubmit={onSubmit} className="border-t border-rule p-3 sm:p-4">
          <div className="flex items-end gap-3 rounded-sm bg-bg px-4 py-3 transition-colors focus-within:bg-sunken">
            <label htmlFor="chat-input" className="sr-only">
              Tu pregunta sobre Borja
            </label>
            <textarea
              id="chat-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              maxLength={MAX_MESSAGE_LENGTH + 100}
              placeholder="Pregúntame cualquier cosa sobre Borja..."
              aria-describedby="chat-hint"
              className="field-sizing-content max-h-40 min-h-7 flex-1 resize-none bg-transparent text-base leading-7 text-ink placeholder:text-ink-faint focus:outline-none"
            />
            <button
              type="submit"
              disabled={!canSend}
              aria-label="Enviar pregunta"
              className="grid size-9 shrink-0 place-items-center rounded-sm bg-ink text-surface transition-[transform,opacity,background-color] duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:bg-accent-ink active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <p id="chat-hint" className="mt-2 flex justify-between px-1 text-xs text-ink-faint">
            <span>Enter para enviar · Shift+Enter nueva línea</span>
            <span className={remaining < 0 ? "font-medium text-danger" : remaining < 100 ? "" : "invisible"} aria-live="polite">
              {remaining < 0 ? `${-remaining} caracteres de más` : `${remaining} restantes`}
            </span>
          </p>
        </form>
      </section>

      <Suggestions disabled={loading} onPick={(q) => void send(q)} />
    </div>
  );
}

function EmptyState({ files }: { files: string[] }) {
  return (
    <div className="flex h-full max-w-[34ch] flex-col justify-end gap-4 animate-rise">
      <p className="font-display text-title text-ink">
        Pregúntame por su formación, sus proyectos o <em>cómo trabaja</em>.
      </p>
      <p className="text-sm text-ink-soft">
        Cada respuesta sale de {files.length} documentos y cita sus fuentes. Si algo no está escrito en ellos, te lo diré.
      </p>
    </div>
  );
}

function Suggestions({ disabled, onPick }: { disabled: boolean; onPick: (q: string) => void }) {
  return (
    <div>
      <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">Prueba con</h2>
      <ul className="flex flex-wrap gap-2">
        {SUGGESTED_QUESTIONS.map((q, i) => (
          <li key={q} className="animate-rise" style={{ animationDelay: `${300 + i * 60}ms` }}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(q)}
              className="rounded-sm bg-sunken px-3 py-2 text-sm text-ink-soft transition-[color,background-color,transform] duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:bg-rule hover:text-ink active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {q}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function isChatResponse(data: unknown): data is ChatResponse {
  const d = data as ChatResponse | null;
  return typeof d?.answer === "string" && Array.isArray(d.sources) && typeof d.status === "string";
}
