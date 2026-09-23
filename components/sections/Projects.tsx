import type { Project } from "@/lib/portfolio";
import { Blocks, ExternalLink, Pending, SectionShell } from "./Shared";

export function Projects({ projects, index }: { projects: Project[]; index: number }) {
  return (
    <SectionShell id="projects" index={index} title="Proyectos" file="projects.md">
      {projects.length === 0 ? (
        <Pending>Aún no hay proyectos en projects.md</Pending>
      ) : (
        <ol className="divide-y divide-rule">
          {projects.map((p, i) => (
            <li key={p.name + i} className="grid gap-6 py-12 first:pt-0 md:grid-cols-[3rem_1fr]">
              <span className="font-mono text-sm text-ink-faint">{String(i + 1).padStart(2, "0")}</span>
              <article className="grid gap-6 lg:grid-cols-[1fr_16rem] lg:gap-12">
                <div>
                  <h3 className="font-display text-3xl leading-tight text-ink">
                    {p.placeholder ? <Pending>{p.name}</Pending> : p.name}
                  </h3>
                  <Blocks blocks={p.description} className="mt-4 text-ink-soft" />
                  <p className="mt-6 font-mono text-[0.8125rem] text-ink-soft">
                    {p.technologies.length ? p.technologies.join("  /  ") : <Pending>tecnologías</Pending>}
                  </p>
                  <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    {p.github ? <ExternalLink href={p.github}>GitHub</ExternalLink> : <Pending>GitHub</Pending>}
                    {p.demo ? <ExternalLink href={p.demo}>Demo</ExternalLink> : <Pending>Demo</Pending>}
                  </p>
                </div>
                {p.image && (
                  <img
                    src={p.image}
                    alt={`Captura de ${p.name}`}
                    loading="lazy"
                    width={512}
                    height={320}
                    className="aspect-[8/5] w-full rounded-sm bg-sunken object-cover"
                  />
                )}
              </article>
            </li>
          ))}
        </ol>
      )}
    </SectionShell>
  );
}
