import type { Entry } from "@/lib/portfolio";
import { Blocks, ExternalLink, Pending, SectionShell } from "./Shared";

/** Lista de entradas con título, metadatos y descripción (formación, certificaciones). */
export function Entries({
  id,
  index,
  title,
  file,
  entries,
  linkLabel = "Ver credencial",
}: {
  id: string;
  index: number;
  title: string;
  file: string;
  entries: Entry[];
  linkLabel?: string;
}) {
  return (
    <SectionShell id={id} index={index} title={title} file={file}>
      {entries.length === 0 ? (
        <Pending>Sin entradas todavía en {file}</Pending>
      ) : (
        <ul className="divide-y divide-rule">
          {entries.map((e, i) => (
            <li key={e.title + i} className="grid gap-3 py-8 first:pt-0 md:grid-cols-[1fr_14rem] md:gap-12">
              <div>
                <h3 className="text-xl font-medium leading-snug text-ink">{e.placeholder ? <Pending>{e.title}</Pending> : e.title}</h3>
                <Blocks blocks={e.description} className="mt-3 text-ink-soft" />
                {e.url && (
                  <p className="mt-3 text-sm">
                    <ExternalLink href={e.url}>{linkLabel}</ExternalLink>
                  </p>
                )}
              </div>
              <p className="text-sm text-ink-soft md:text-right">
                {e.meta.length ? e.meta.join(" · ") : <Pending>centro y fechas</Pending>}
              </p>
            </li>
          ))}
        </ul>
      )}
    </SectionShell>
  );
}
