"use client";

import type { CertItem } from "@/lib/site-types";
import { useLang } from "../LangProvider";

export function Certifications({ certs }: { certs: CertItem[] }) {
  const { t } = useLang();
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
      {certs.map((c) => {
        const body = (
          <>
            <span className="flex justify-between font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint">
              <span>{c.issuer}</span>
              <span>{c.date}</span>
            </span>
            <span className="mt-3.5 font-display text-5xl leading-none tracking-[-0.02em]">{c.code}</span>
            <span className="min-h-[2.8em] text-[0.9375rem] font-medium leading-[1.4]">{c.name}</span>
            {c.url && (
              <span className="mt-auto border-t border-rule pt-3.5 text-[0.8125rem] text-accent-ink">
                {t.verify} <span aria-hidden>↗</span>
              </span>
            )}
          </>
        );
        const cls = "flex h-full flex-col gap-1.5 rounded-sm bg-surface p-5 no-underline";
        return (
          <li key={c.code + c.name}>
            {c.url ? (
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${cls} transition-colors duration-[var(--dur-fast)] hover:bg-sunken hover:text-ink active:scale-[0.99]`}
              >
                {body}
              </a>
            ) : (
              <div className={cls}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
