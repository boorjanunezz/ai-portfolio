"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { SUGGESTIONS } from "@/lib/i18n";
import type { SiteData } from "@/lib/site-types";
import { useLang } from "./LangProvider";

interface Props {
  data: SiteData;
  askRef: RefObject<HTMLButtonElement | null>;
  onOpen: (question?: string) => void;
}

export function Hero({ data, askRef, onOpen }: Props) {
  const { t, lang, pick } = useLang();
  const booted = useBoot(data.files.length);
  const questions = SUGGESTIONS[lang];
  const typed = useTypewriter(questions);

  return (
    <section className="pb-[clamp(64px,8vw,96px)] pt-[clamp(48px,8vw,112px)]">
      <p aria-hidden className="flex flex-wrap gap-x-3.5 gap-y-1 font-mono text-xs leading-[18px] text-ink-faint">
        <span className="text-accent-ink">›</span>
        <span>{t.boot}</span>
        {data.files.map((f, i) => (
          <span
            key={f}
            className={`whitespace-nowrap transition-colors duration-[var(--dur-med)] ${i < booted ? "text-ink" : i === booted ? "text-ink-soft" : "text-rule"}`}
          >
            {f} <span className="text-accent-ink">{i < booted ? "✓" : ""}</span>
          </span>
        ))}
        {booted >= data.files.length && <span className="animate-rise text-ink">· {t.ready}</span>}
      </p>

      <h1 className="mt-8 animate-rise font-display text-[clamp(4.25rem,1rem+12vw,11.5rem)] leading-[0.86] tracking-[-0.035em] text-ink [animation-delay:40ms]">
        {firstName(data.name)} <em className="text-accent-ink">{lastName(data.name)}</em>
      </h1>

      <div className="mt-10 flex animate-rise flex-wrap items-start gap-x-16 gap-y-6 [animation-delay:120ms]">
        <div className="flex max-w-[360px] flex-[1_1_260px] flex-col gap-1.5">
          <p className="text-xl font-medium leading-7">{data.headline}</p>
          {pick(data.meta) && <p className="text-[0.9375rem] text-ink-soft">{pick(data.meta)}</p>}
          {pick(data.languages) && <p className="text-[0.9375rem] text-ink-soft">{pick(data.languages)}</p>}
        </div>
        <p className="max-w-[58ch] flex-[2_1_420px] text-lead text-ink">{pick(data.lead)}</p>
      </div>

      <div className="mt-14 max-w-[880px] animate-rise [animation-delay:200ms]">
        <button
          ref={askRef}
          type="button"
          onClick={() => onOpen()}
          aria-label={t.askLabel}
          className="flex w-full cursor-text items-center gap-4 rounded-sm bg-sunken py-4 pl-6 pr-4 text-left transition-colors duration-[var(--dur-fast)] hover:bg-rule active:scale-[0.995]"
        >
          <span aria-hidden className="font-mono text-lg text-accent-ink">
            ›
          </span>
          <span aria-hidden className="min-w-0 flex-1 truncate font-display text-[clamp(1.375rem,1.1rem+1.2vw,2rem)] leading-[1.2]">
            {typed}
            <span className="ml-0.5 inline-block h-[0.95em] w-[0.08em] min-w-[2px] animate-blink bg-accent align-[-0.1em]" />
          </span>
          <kbd className="hidden rounded-sm border border-rule px-2 py-0.5 font-mono text-xs text-ink-soft wide:inline">/</kbd>
          <span className="shrink-0 rounded-sm bg-ink px-4 py-2.5 text-sm font-medium text-surface">{t.ask}</span>
        </button>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">{t.tryWith}</span>
          {questions.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onOpen(q)}
              className="rounded-sm px-3 py-1.5 text-sm text-ink-soft shadow-[inset_0_0_0_1px_var(--color-rule)] transition-colors duration-[var(--dur-fast)] hover:bg-sunken hover:text-ink active:scale-[0.98]"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <dl className="mt-[clamp(64px,8vw,96px)] grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] border-t border-ink">
        {data.stats.map((s) => (
          <div key={s.value + s.label.es} className="flex flex-col gap-1 pr-6 pt-5">
            <dt className="order-2 text-sm text-ink-soft">{pick(s.label)}</dt>
            <dd className="order-1 m-0 font-display text-[56px] leading-none">{s.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const firstName = (name: string) => name.split(" ")[0] ?? name;
const lastName = (name: string) => name.split(" ").slice(1).join(" ");

/** Marca los archivos como "indexados" uno a uno al cargar la página. */
function useBoot(count: number): number {
  const [booted, setBooted] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setBooted(count);
    const timer = setInterval(() => setBooted((b) => (b >= count ? b : b + 1)), 240);
    return () => clearInterval(timer);
  }, [count]);
  return booted;
}

/** Escribe y borra las preguntas sugeridas en bucle (estático con reduced-motion). */
function useTypewriter(questions: string[]): string {
  const [typed, setTyped] = useState(questions[0] ?? "");
  const state = useRef({ i: 0, c: 0, dir: 1, hold: 10 });

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTyped(questions[0] ?? "");
      return;
    }
    state.current = { i: 0, c: 0, dir: 1, hold: 10 };
    const timer = setInterval(() => {
      const s = state.current;
      const q = questions[s.i % questions.length] ?? "";
      if (s.hold > 0) return void s.hold--;
      if (s.dir === 1) {
        s.c++;
        if (s.c >= q.length) Object.assign(s, { dir: -1, hold: 44 });
      } else {
        s.c -= 2;
        if (s.c <= 0) Object.assign(s, { c: 0, dir: 1, i: s.i + 1, hold: 8 });
      }
      setTyped(q.slice(0, s.c));
    }, 45);
    return () => clearInterval(timer);
  }, [questions]);

  return typed;
}
