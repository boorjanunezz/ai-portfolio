"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type RefObject } from "react";
import { SUGGESTIONS } from "@/lib/i18n";
import { MAX_MESSAGE_LENGTH } from "@/lib/types";
import { useLang } from "../LangProvider";
import { RichText } from "./RichText";
import type { UIMessage, useChat } from "./useChat";

interface Props {
  open: boolean;
  onClose: () => void;
  files: string[];
  chat: ReturnType<typeof useChat>;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onGoTo: (file: string) => void;
}

/** Panel del asistente: lateral en escritorio (≥ 1040 px), pantalla completa en móvil. */
export function AssistantPanel({ open, onClose, files, chat, inputRef, onGoTo }: Props) {
  const { t, lang } = useLang();
  const { messages, loading, send, retry, reset } = chat;
  const [input, setInput] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const scan = useScan(loading, files.length);

  const last = messages.at(-1);
  const waitingFirstToken = loading && last?.role === "user";
  const cited = !loading && last?.role === "assistant" ? (last.sources ?? []).map((s) => s.file) : [];

  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    log.scrollTo({ top: log.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [messages, loading]);

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!input.trim() || loading || input.length > MAX_MESSAGE_LENGTH) return;
    void send(input);
    setInput("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  const remaining = MAX_MESSAGE_LENGTH - input.length;
  const canSend = input.trim().length > 0 && remaining >= 0 && !loading;

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-ink/30 transition-opacity duration-[var(--dur-med)] ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={t.panelTitle}
        inert={!open}
        className={`fixed inset-y-0 right-0 z-40 flex w-full flex-col bg-surface transition-transform duration-[420ms] ease-[var(--ease-out)] wide:w-[min(600px,100%)] ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <header className="flex items-center justify-between gap-4 border-b border-rule py-3.5 pl-6 pr-5">
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            <span aria-hidden className="size-2 rounded-full bg-accent" />
            {t.panelTitle}
          </p>
          <div className="flex items-center gap-4">
            {messages.length > 0 && (
              <button type="button" onClick={reset} className="text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline active:text-accent-ink">
                {t.newConv}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={t.close}
              className="flex items-center gap-2 rounded-sm bg-sunken px-2.5 py-1.5 font-mono text-xs text-ink-soft transition-colors duration-[var(--dur-fast)] hover:bg-rule hover:text-ink active:scale-95"
            >
              esc ✕
            </button>
          </div>
        </header>

        <div aria-hidden className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1 border-b border-rule px-6 py-2.5 font-mono text-xs">
          <span className="text-ink-faint">{t.kb}</span>
          {files.map((file, i) => {
            const citedIndex = cited.indexOf(file);
            const color = citedIndex >= 0 ? "text-accent-ink" : loading && scan === i ? "text-ink" : "text-ink-faint";
            return (
              <span key={file} className={`transition-colors duration-[var(--dur-med)] ${color} ${loading ? "animate-scan" : ""}`} style={{ animationDelay: `${i * 180}ms` }}>
                {file}
                {citedIndex >= 0 && <sup className="ml-0.5 text-accent-ink">{citedIndex + 1}</sup>}
              </span>
            );
          })}
        </div>

        <div ref={logRef} role="log" aria-live="polite" aria-busy={loading} className="flex-1 overflow-y-auto px-[clamp(20px,4vw,40px)] py-8">
          <div className="mx-auto flex min-h-full max-w-[720px] flex-col">
            {messages.length === 0 && !loading ? (
              <EmptyState files={files.length} onPick={(q) => void send(q)} questions={SUGGESTIONS[lang]} />
            ) : (
              <ol className="flex flex-col gap-5">
                {messages.map((m, i) => (
                  <Message key={m.id} message={m} first={i === 0} onRetry={retry} onGoTo={onGoTo} />
                ))}
                {waitingFirstToken && (
                  <li role="status" className="flex items-center gap-2.5 text-sm text-ink-soft">
                    <span className="font-mono text-accent-ink">›</span>
                    {t.thinking} <span className="font-mono text-[0.8125rem] text-ink">{files[scan]}</span>
                    <span aria-hidden className="inline-block h-3.5 w-[7px] animate-blink bg-accent" />
                  </li>
                )}
              </ol>
            )}
          </div>
        </div>

        <form onSubmit={submit} className="border-t border-rule px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3.5">
          <div className="mx-auto max-w-[752px]">
            <div className="flex items-end gap-3 rounded-sm bg-bg py-2.5 pl-4 pr-2.5 transition-colors focus-within:bg-sunken">
              <span aria-hidden className="font-mono leading-9 text-accent-ink">
                ›
              </span>
              <label htmlFor="chat-input" className="sr-only">
                {t.placeholder}
              </label>
              <textarea
                id="chat-input"
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                maxLength={MAX_MESSAGE_LENGTH + 100}
                placeholder={t.placeholder}
                aria-describedby="chat-hint"
                className="field-sizing-content max-h-40 min-h-7 flex-1 resize-none bg-transparent py-1 text-base leading-7 text-ink placeholder:text-ink-faint focus:outline-none"
              />
              <button
                type="submit"
                disabled={!canSend}
                aria-label={t.send}
                className="grid size-9 shrink-0 place-items-center rounded-sm bg-ink text-surface transition-[transform,opacity,background-color] duration-[var(--dur-fast)] hover:bg-accent-ink active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <p id="chat-hint" className="mt-2 flex justify-between gap-4 px-1 text-xs text-ink-faint">
              <span>{t.hint}</span>
              {remaining < 100 && (
                <span className={remaining < 0 ? "font-medium text-danger" : ""} aria-live="polite">
                  {remaining}
                </span>
              )}
            </p>
          </div>
        </form>
      </section>
    </>
  );
}

function EmptyState({ files, questions, onPick }: { files: number; questions: string[]; onPick: (q: string) => void }) {
  const { t } = useLang();
  return (
    <div className="mt-auto flex flex-col gap-7">
      <p className="max-w-[18ch] font-display text-[clamp(2rem,1.4rem+2vw,2.75rem)] leading-[1.05] text-ink">
        {t.empty1} <em>{t.emptyEm}</em>.
      </p>
      <p className="max-w-[52ch] text-sm text-ink-soft">{t.empty2(files)}</p>
      <ol className="border-t border-rule">
        {questions.map((q, i) => (
          <li key={q} className="border-b border-rule">
            <button
              type="button"
              onClick={() => onPick(q)}
              className="flex w-full items-baseline gap-4 py-3 text-left text-[0.9375rem] text-ink-soft transition-colors duration-[var(--dur-fast)] hover:text-ink active:text-accent-ink"
            >
              <span className="font-mono text-xs text-accent-ink">0{i + 1}</span>
              <span className="flex-1">{q}</span>
              <span aria-hidden className="text-ink-faint">
                ↵
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Message({
  message: m,
  first,
  onRetry,
  onGoTo,
}: {
  message: UIMessage;
  first: boolean;
  onRetry: (q: string) => void;
  onGoTo: (file: string) => void;
}) {
  const { t } = useLang();

  if (m.role === "user") {
    return (
      <li className={`animate-message ${first ? "" : "pt-7"}`}>
        <p className="sr-only">{t.yourQuestion}</p>
        <p className="max-w-[40ch] font-display text-[1.75rem] leading-[1.15] text-ink">{m.content}</p>
      </li>
    );
  }

  if (m.error) {
    return (
      <li role="alert" className="flex max-w-[62ch] animate-message flex-wrap items-baseline gap-x-4 gap-y-2">
        <p className="text-danger">
          <span className="font-medium">{t.error}</span> {m.content}
        </p>
        {m.retry && (
          <button type="button" onClick={() => onRetry(m.retry!)} className="text-sm font-medium text-ink underline underline-offset-4 hover:text-accent-ink active:opacity-70">
            {t.retry}
          </button>
        )}
      </li>
    );
  }

  const label = m.status === "no_info" ? t.noInfoLabel : m.status === "off_topic" ? t.offTopicLabel : undefined;
  return (
    <li className="max-w-[62ch] animate-message">
      <p className="sr-only">{t.answer}</p>
      {label && <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">{label}</p>}
      <div className={label ? "text-ink-soft" : "text-ink"}>
        <RichText text={m.content} caret={m.streaming} />
      </div>
      {m.sources && m.sources.length > 0 && (
        <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-rule pt-3 text-sm">
          <span className="text-ink-faint">{t.sources}</span>
          {m.sources.map((s, i) => (
            <button
              key={s.file}
              type="button"
              onClick={() => onGoTo(s.file)}
              title={t.goTo}
              className="text-ink-soft underline decoration-rule underline-offset-4 transition-colors duration-[var(--dur-fast)] hover:text-ink hover:decoration-accent active:text-accent-ink"
            >
              <sup className="mr-1 text-accent-ink">{i + 1}</sup>
              <span className="font-mono text-[0.8125rem]">{s.file}</span>
            </button>
          ))}
        </div>
      )}
    </li>
  );
}

/** Índice del archivo "leído" mientras se espera la respuesta (efecto visual del carril). */
function useScan(active: boolean, count: number): number {
  const [scan, setScan] = useState(0);
  useEffect(() => {
    if (!active || count === 0) return;
    const timer = setInterval(() => setScan((s) => (s + 1) % count), 200);
    return () => clearInterval(timer);
  }, [active, count]);
  return scan;
}
