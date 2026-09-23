import type { ReactNode } from "react";

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-baseline gap-1 underline decoration-rule underline-offset-4 transition-colors duration-[var(--dur-fast)] hover:decoration-accent active:text-accent-ink"
    >
      {children}
      <span aria-hidden className="text-ink-faint">
        ↗
      </span>
    </a>
  );
}
