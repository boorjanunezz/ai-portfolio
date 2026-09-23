"use client";

import { SECTIONS } from "@/lib/i18n";
import type { Lang } from "@/lib/site-types";
import { useLang } from "./LangProvider";

export function SiteHeader({ name, cvUrl }: { name: string; cvUrl?: string }) {
  const { t, lang, setLang, pick } = useLang();

  return (
    <header className="flex items-center justify-between gap-4 border-b border-rule py-5">
      <a href="#top" className="flex shrink-0 items-center gap-2.5 whitespace-nowrap text-sm font-medium no-underline">
        <span aria-hidden className="size-2 animate-pulse-dot rounded-full bg-accent" />
        <span>{name}</span>
        <span className="hidden font-mono text-xs font-normal text-ink-faint min-[480px]:inline">/ portfolio</span>
      </a>

      <div className="flex items-center gap-6">
        <nav aria-label={t.sections} className="hidden gap-5 text-sm wide:flex">
          {SECTIONS.map((s, i) => (
            <a key={s.id} href={`#${s.id}`} className="flex items-baseline gap-1.5 text-ink-soft no-underline transition-colors duration-[var(--dur-fast)] hover:text-ink">
              <span className="font-mono text-[11px] text-ink-faint">0{i + 1}</span>
              {pick(s.label)}
            </a>
          ))}
        </nav>

        <div role="group" aria-label={t.language} className="flex rounded-sm bg-sunken p-0.5 font-mono text-xs">
          {(["es", "en"] as Lang[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              aria-pressed={lang === l}
              className={`rounded-[3px] px-2 py-1 transition-colors duration-[var(--dur-fast)] ${lang === l ? "bg-ink text-surface" : "text-ink-faint hover:text-ink"}`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {cvUrl && (
          <a
            href={cvUrl}
            download
            className="flex items-center gap-2 rounded-sm bg-ink px-3.5 py-2 text-sm font-medium text-surface no-underline transition-colors duration-[var(--dur-fast)] hover:bg-accent-ink hover:text-surface active:scale-[0.98]"
          >
            {t.cv}
            <span aria-hidden className="font-mono">
              ↓
            </span>
          </a>
        )}
      </div>
    </header>
  );
}
