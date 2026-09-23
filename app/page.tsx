import { Chat } from "@/components/chat/Chat";
import { About } from "@/components/sections/About";
import { Contact } from "@/components/sections/Contact";
import { Entries } from "@/components/sections/Entries";
import { Projects } from "@/components/sections/Projects";
import { Skills } from "@/components/sections/Skills";
import { loadMarkdownFiles } from "@/lib/documents";
import { getAbout, getCertifications, getContact, getEducation, getProjects, getSkills } from "@/lib/portfolio";
import { SECTIONS } from "@/lib/sections";

export default function HomePage() {
  const files = loadMarkdownFiles().map((f) => f.file);

  return (
    <>
      <a
        href="#chat-input"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-10 focus:rounded-sm focus:bg-ink focus:px-4 focus:py-2 focus:text-surface"
      >
        Ir al asistente
      </a>

      <main className="page">
        <div className="grid-12 gap-y-12 pb-24 pt-12 lg:pb-32 lg:pt-16">
          <Intro />
          <div className="col-span-12 animate-rise [animation-delay:160ms] lg:col-span-8">
            <Chat files={files} />
          </div>
        </div>

        <About about={getAbout()} index={1} />
        <Projects projects={getProjects()} index={2} />
        <Skills groups={getSkills()} index={3} />
        <Entries id="education" index={4} title="Formación" file="education.md" entries={getEducation()} />
        <Entries id="certifications" index={5} title="Certificaciones" file="certifications.md" entries={getCertifications()} />
        <Contact links={getContact()} index={6} />
      </main>

      <footer className="page flex flex-wrap justify-between gap-4 border-t border-rule py-8 text-sm text-ink-faint">
        <p>© {new Date().getFullYear()} Borja Núñez</p>
        <p>Next.js · Gemini · contenido en Markdown, sin base de datos</p>
      </footer>
    </>
  );
}

function Intro() {
  return (
    <aside className="col-span-12 flex flex-col lg:sticky lg:top-16 lg:col-span-4 lg:self-start">
      <p className="animate-rise text-sm text-ink-soft">Portfolio · {new Date().getFullYear()}</p>
      <h1 className="mt-6 animate-rise font-display text-display text-ink [animation-delay:40ms]">
        Borja <em>Núñez</em>
      </h1>
      <p className="mt-4 animate-rise text-lg font-medium text-ink [animation-delay:80ms]">AI &amp; Data Engineer</p>
      <p className="mt-8 max-w-[36ch] animate-rise text-ink-soft [animation-delay:120ms]">
        Este portfolio se explora conversando. Pregunta al asistente por mi formación, proyectos o tecnologías: responde solo
        con lo que está documentado aquí y te enseña de dónde lo saca.
      </p>

      <nav aria-label="Secciones" className="mt-12 animate-rise [animation-delay:200ms]">
        <ol className="border-t border-rule">
          {SECTIONS.map((s, i) => (
            <li key={s.id} className="border-b border-rule">
              <a
                href={`#${s.id}`}
                className="group flex items-baseline gap-4 py-2 text-sm text-ink-soft transition-colors duration-[var(--dur-fast)] hover:text-ink"
              >
                <span className="font-mono text-xs text-ink-faint group-hover:text-accent-ink">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="transition-transform duration-[var(--dur-med)] ease-[var(--ease-out)] group-hover:translate-x-1">
                  {s.label}
                </span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </aside>
  );
}
