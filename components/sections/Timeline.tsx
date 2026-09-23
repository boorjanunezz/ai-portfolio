"use client";

import type { TimelineEntry } from "@/lib/site-types";
import { useLang } from "../LangProvider";

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  const { t, pick } = useLang();
  return (
    <ol>
      {entries.map((e, i) => {
        const dot = e.now ? "animate-pulse-dot border-accent bg-accent" : e.kind === "work" ? "border-ink bg-ink" : "border-ink bg-surface";
        return (
          <li key={e.when + e.title.es} className="flex gap-5">
            <div aria-hidden className="flex flex-[0_0_12px] flex-col items-center pt-[9px]">
              <span className={`size-[11px] rounded-full border-[1.5px] ${dot}`} />
              <span className={`mt-1.5 w-px flex-1 ${i === entries.length - 1 ? "bg-transparent" : "bg-rule"}`} />
            </div>
            <div className="flex min-w-0 flex-1 flex-wrap gap-x-8 gap-y-1 pb-11">
              <div className="flex flex-[0_0_7.5rem] flex-col gap-0.5">
                <span className="font-mono text-[0.8125rem] leading-7 text-ink">{e.when}</span>
                <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint">{e.kind === "work" ? t.work : t.edu}</span>
              </div>
              <div className="min-w-0 flex-[1_1_320px]">
                <h3 className="text-[1.3125rem] font-medium leading-7">{pick(e.title)}</h3>
                {pick(e.org) && <p className="mt-0.5 text-[0.9375rem] text-accent-ink">{pick(e.org)}</p>}
                {pick(e.text) && <p className="mt-2.5 max-w-[62ch] text-ink-soft">{pick(e.text)}</p>}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
