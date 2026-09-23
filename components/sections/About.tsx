import type { getAbout } from "@/lib/portfolio";
import { Blocks, SectionShell } from "./Shared";

export function About({ about, index }: { about: ReturnType<typeof getAbout>; index: number }) {
  return (
    <SectionShell id="about" index={index} title="Sobre mí" file="about.md">
      <Blocks blocks={about.profile} className="text-lead text-ink" />
      {about.details.length > 0 && (
        <dl className="mt-16 divide-y divide-rule">
          {about.details.map((d) => (
            <div key={d.title} className="grid gap-2 py-6 sm:grid-cols-[12rem_1fr] sm:gap-6">
              <dt className="text-sm font-medium text-ink-soft">{d.title}</dt>
              <dd>
                <Blocks blocks={d.description} />
              </dd>
            </div>
          ))}
        </dl>
      )}
    </SectionShell>
  );
}
