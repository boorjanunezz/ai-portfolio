import type { SkillGroup } from "@/lib/portfolio";
import { Pending, SectionShell } from "./Shared";

export function Skills({ groups, index }: { groups: SkillGroup[]; index: number }) {
  return (
    <SectionShell id="skills" index={index} title="Tecnologías" file="skills.md">
      <div className="grid gap-x-12 gap-y-12 sm:grid-cols-2">
        {groups.map((g) => (
          <div key={g.category}>
            <h3 className="border-b border-ink pb-2 text-xs font-medium uppercase tracking-[0.14em] text-ink">{g.category}</h3>
            <ul className="mt-4 space-y-3">
              {g.items.length === 0 && (
                <li>
                  <Pending />
                </li>
              )}
              {g.items.map((item) => (
                <li key={item.name}>
                  {item.placeholder ? (
                    <Pending>{item.name}</Pending>
                  ) : (
                    <>
                      <span className="font-medium text-ink">{item.name}</span>
                      {item.detail && <span className="text-ink-soft"> — {item.detail}</span>}
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
