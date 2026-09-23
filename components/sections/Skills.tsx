"use client";

import type { SkillGroup } from "@/lib/site-types";
import { useLang } from "../LangProvider";

export function Skills({ groups }: { groups: SkillGroup[] }) {
  const { pick } = useLang();
  return (
    <dl className="m-0">
      {groups.map((g) => (
        <div key={g.category.es} className="flex flex-wrap gap-x-6 gap-y-1.5 border-t border-rule py-4.5">
          <dt className="flex-[0_0_11rem] text-xs font-medium uppercase leading-[27px] tracking-[0.14em]">{pick(g.category)}</dt>
          <dd className="m-0 flex-[1_1_320px] text-ink-soft">{g.items.join(" · ")}</dd>
        </div>
      ))}
    </dl>
  );
}
