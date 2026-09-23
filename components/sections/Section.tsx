"use client";

import type { ReactNode } from "react";
import { useLang } from "../LangProvider";

/** Sección con cabecera lateral: número, título, archivo fuente y enlace para preguntar al asistente. */
export function Section({
  id,
  index,
  title,
  files,
  onAsk,
  children,
}: {
  id: string;
  index: number;
  title: string;
  files: readonly string[];
  onAsk?: () => void;
  children: ReactNode;
}) {
  const { t } = useLang();
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex flex-wrap gap-x-6 gap-y-10 border-t border-rule py-[clamp(72px,9vw,128px)]">
      <header className="max-w-[320px] flex-[1_1_240px]">
        <p className="font-mono text-sm text-accent-ink">{String(index).padStart(2, "0")}</p>
        <h2 id={`${id}-title`} className="mt-2 font-display text-title text-ink">
          {title}
        </h2>
        {files.length > 0 && (
          <p className="mt-3 text-sm text-ink-faint">
            {t.source} <span className="font-mono text-[0.8125rem]">{files.join(" · ")}</span>
          </p>
        )}
        {onAsk && (
          <button
            type="button"
            onClick={onAsk}
            className="mt-5 font-mono text-[0.8125rem] text-accent-ink underline decoration-rule underline-offset-4 transition-colors duration-[var(--dur-fast)] hover:decoration-accent active:opacity-70"
          >
            › {t.askAbout}
          </button>
        )}
      </header>
      <div className="min-w-0 flex-[999_1_560px]">{children}</div>
    </section>
  );
}
