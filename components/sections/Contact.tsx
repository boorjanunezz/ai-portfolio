import type { ContactLink } from "@/lib/portfolio";
import { Pending } from "./Shared";

/** Ruptura de la retícula: el contacto ocupa las 12 columnas con tipografía display. */
export function Contact({ links, index }: { links: ContactLink[]; index: number }) {
  return (
    <section id="contact" aria-labelledby="contact-title" className="border-t border-rule py-24 lg:py-32">
      <p className="font-mono text-sm text-accent-ink">{String(index).padStart(2, "0")}</p>
      <h2 id="contact-title" className="mt-2 font-display text-display text-ink">
        Hablemos<em className="text-accent-ink">.</em>
      </h2>
      <ul className="mt-16 divide-y divide-rule border-y border-rule">
        {links.map((l) => (
          <li key={l.label} className="grid items-baseline gap-2 py-6 sm:grid-cols-[12rem_1fr]">
            <span className="text-sm text-ink-soft">{l.label}</span>
            {l.href ? (
              <a
                href={l.href}
                {...(l.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="group inline-flex items-baseline gap-3 font-display text-3xl text-ink transition-colors duration-[var(--dur-fast)] hover:text-accent-ink sm:text-4xl"
              >
                <span className="break-all">{l.value}</span>
                <span
                  aria-hidden
                  className="text-xl text-ink-faint transition-transform duration-[var(--dur-med)] ease-[var(--ease-out)] group-hover:translate-x-1 group-hover:-translate-y-1"
                >
                  ↗
                </span>
              </a>
            ) : l.value ? (
              <span className="font-display text-3xl text-ink sm:text-4xl">{l.value}</span>
            ) : (
              <Pending />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
