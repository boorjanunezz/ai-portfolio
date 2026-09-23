import type { ReactNode } from "react";
import type { TextBlock } from "@/lib/portfolio";

export function SectionShell({
  id,
  index,
  title,
  file,
  children,
}: {
  id: string;
  index: number;
  title: string;
  file?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="grid-12 gap-y-8 border-t border-rule py-24 lg:py-32">
      <header className="col-span-12 lg:col-span-3">
        <p className="font-mono text-sm text-accent-ink">{String(index).padStart(2, "0")}</p>
        <h2 id={`${id}-title`} className="mt-2 font-display text-title text-ink">
          {title}
        </h2>
        {file && (
          <p className="mt-3 text-sm text-ink-faint">
            Fuente: <span className="font-mono text-[0.8125rem]">{file}</span>
          </p>
        )}
      </header>
      <div className="col-span-12 lg:col-span-9 lg:pt-8">{children}</div>
    </section>
  );
}

/** Marca visible para huecos PLACEHOLDER: texto + estilo, no solo color. */
export function Pending({ children = "Por completar" }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-baseline gap-2 text-ink-faint">
      <span className="rounded-sm bg-sunken px-1.5 py-0.5 font-mono text-[0.6875rem] uppercase tracking-wider">pendiente</span>
      <span className="italic">{children}</span>
    </span>
  );
}

export function Blocks({ blocks, className = "" }: { blocks: TextBlock[]; className?: string }) {
  if (blocks.length === 0) return null;
  return (
    <div className={`max-w-[65ch] space-y-3 ${className}`}>
      {blocks.map((b, i) => (
        <p key={i}>{b.placeholder ? <Pending>{b.text}</Pending> : b.text}</p>
      ))}
    </div>
  );
}

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-baseline gap-1 text-ink underline decoration-rule underline-offset-4 transition-colors duration-[var(--dur-fast)] hover:decoration-accent active:text-accent-ink"
    >
      {children}
      <span aria-hidden className="text-ink-faint">↗</span>
      <span className="sr-only">(se abre en otra pestaña)</span>
    </a>
  );
}
