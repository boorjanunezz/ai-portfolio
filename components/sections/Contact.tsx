"use client";

import { useEffect, useRef, useState } from "react";
import type { SiteData } from "@/lib/site-types";
import { useLang } from "../LangProvider";

/** Ruptura de la retícula: el contacto ocupa todo el ancho, con el email en tipografía display. */
export function Contact({ data, index, onAsk }: { data: SiteData; index: number; onAsk: () => void }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    if (!data.email) return;
    try {
      await navigator.clipboard.writeText(data.email);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  const rows = [
    ...data.links.map((l) => ({ label: l.label, value: l.value, href: l.href, external: true, arrow: "↗" })),
    ...(data.cvUrl ? [{ label: t.cvRow, value: t.cvValue, href: data.cvUrl, external: false, arrow: "↓" }] : []),
  ];

  return (
    <section id="contacto" aria-labelledby="contacto-title" className="border-t border-rule py-[clamp(72px,9vw,128px)]">
      <p className="font-mono text-sm text-accent-ink">{String(index).padStart(2, "0")}</p>
      <h2 id="contacto-title" className="mt-2 font-display text-display text-ink">
        {t.letsTalk}
        <em className="text-accent-ink">.</em>
      </h2>

      {data.email && (
        <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-4 border-b border-t border-b-rule border-t-ink py-7">
          <a
            href={`mailto:${data.email}`}
            className="min-w-0 flex-[1_1_auto] font-display text-[clamp(1.75rem,0.9rem+3.6vw,4rem)] leading-[1.05] no-underline [overflow-wrap:anywhere] hover:text-accent-ink"
          >
            {data.email}
          </a>
          <button
            type="button"
            onClick={copy}
            aria-live="polite"
            className={`flex shrink-0 items-center gap-2 rounded-sm px-4 py-2.5 font-mono text-[0.8125rem] transition-colors duration-[var(--dur-fast)] active:scale-95 ${copied ? "bg-accent-ink text-surface" : "bg-sunken text-ink hover:bg-rule"}`}
          >
            {copied ? t.copied : t.copy}
          </button>
        </div>
      )}

      <ul>
        {rows.map((r) => (
          <li key={r.label} className="border-b border-rule">
            <a
              href={r.href}
              {...(r.external ? { target: "_blank", rel: "noopener noreferrer" } : { download: true })}
              className="group flex flex-wrap items-baseline gap-x-6 gap-y-1 py-5 no-underline transition-colors duration-[var(--dur-fast)] hover:text-accent-ink"
            >
              <span className="flex-[0_0_11rem] text-sm text-ink-soft">{r.label}</span>
              <span className="flex-[1_1_auto] font-display text-[clamp(1.5rem,1.2rem+1.2vw,2.25rem)] leading-[1.2] [overflow-wrap:anywhere]">{r.value}</span>
              <span aria-hidden className="text-xl text-ink-faint transition-transform duration-[var(--dur-med)] ease-[var(--ease-out)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                {r.arrow}
              </span>
            </a>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onAsk}
        className="mt-10 font-mono text-sm text-ink-soft transition-colors duration-[var(--dur-fast)] hover:text-accent-ink"
      >
        <span className="text-accent-ink">›</span> {t.orAsk}
        <span aria-hidden className="ml-1 inline-block h-3.5 w-[7px] animate-blink bg-accent align-[-2px]" />
      </button>
    </section>
  );
}
