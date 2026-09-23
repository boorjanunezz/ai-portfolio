"use client";

import type { ProjectItem } from "@/lib/site-types";
import { useLang } from "../LangProvider";
import { ExternalLink } from "./ExternalLink";

export function Projects({ projects }: { projects: ProjectItem[] }) {
  const { pick } = useLang();
  return (
    <ol className="border-t border-rule">
      {projects.map((p, i) => (
        <li key={p.name} className="flex flex-wrap gap-x-6 gap-y-3 border-b border-rule py-7">
          <span className="flex-[0_0_2.5rem] font-mono text-[0.8125rem] leading-8 text-ink-faint">{String(i + 1).padStart(2, "0")}</span>
          <div className="min-w-0 flex-[1_1_380px]">
            <h3 className="font-display text-[1.75rem] leading-8">{p.name}</h3>
            <p className="mt-2 max-w-[62ch] text-ink-soft">{pick(p.summary)}</p>
            {p.technologies.length > 0 && <p className="mt-3 font-mono text-[0.78rem] text-ink-faint">{p.technologies.join(" / ")}</p>}
          </div>
          {(p.github || p.demo) && (
            <div className="flex flex-[0_0_auto] gap-4 pt-1.5 text-sm">
              {p.github && <ExternalLink href={p.github}>GitHub</ExternalLink>}
              {p.demo && <ExternalLink href={p.demo}>Demo</ExternalLink>}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
