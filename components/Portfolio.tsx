"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FILE_SECTION, SECTION_QUESTION, SECTIONS, SUGGESTIONS } from "@/lib/i18n";
import type { SiteData } from "@/lib/site-types";
import { AssistantPanel } from "./assistant/AssistantPanel";
import { useChat } from "./assistant/useChat";
import { Hero } from "./Hero";
import { useLang } from "./LangProvider";
import { Certifications } from "./sections/Certifications";
import { Contact } from "./sections/Contact";
import { Projects } from "./sections/Projects";
import { Section } from "./sections/Section";
import { Skills } from "./sections/Skills";
import { Timeline } from "./sections/Timeline";
import { SiteHeader } from "./SiteHeader";

export function Portfolio({ data }: { data: SiteData }) {
  const { t, lang, pick } = useLang();
  const chat = useChat(t);
  const [open, setOpen] = useState(false);
  const [dock, setDock] = useState(false);
  const askRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const openPanel = useCallback(
    (question?: string) => {
      returnFocus.current = document.activeElement as HTMLElement | null;
      setOpen(true);
      setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 320);
      if (question) void chat.send(question);
    },
    [chat],
  );

  const closePanel = useCallback(() => {
    setOpen(false);
    returnFocus.current?.focus?.({ preventScroll: true });
  }, []);

  // "/" abre el asistente, Esc lo cierra.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName ?? "";
      if (e.key === "/" && !open && !/INPUT|TEXTAREA|SELECT/.test(tag)) {
        e.preventDefault();
        openPanel();
      }
      if (e.key === "Escape" && open) closePanel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, openPanel, closePanel]);

  // Con el panel abierto, la página de fondo no hace scroll.
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
  }, [open]);

  // La barra fija aparece cuando la barra de pregunta de la portada sale de la pantalla.
  useEffect(() => {
    const el = askRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setDock(!entry!.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /** Fuente citada → cerrar el panel y saltar a su sección. */
  const goTo = useCallback((file: string) => {
    setOpen(false);
    const el = document.getElementById(FILE_SECTION[file] ?? "top");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(() => el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }), 240);
  }, []);

  const askFor = (sectionId: string) => {
    const i = SECTION_QUESTION[sectionId];
    return i === undefined ? undefined : () => openPanel(SUGGESTIONS[lang][i]);
  };
  const section = (id: (typeof SECTIONS)[number]["id"]) => {
    const index = SECTIONS.findIndex((s) => s.id === id);
    const s = SECTIONS[index]!;
    return { id, index: index + 1, title: pick(s.label), files: s.files, onAsk: askFor(id) };
  };

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-ink focus:px-4 focus:py-2 focus:text-surface"
      >
        {t.skip}
      </a>

      <div id="top" className="page">
        <SiteHeader name={data.name} cvUrl={data.cvUrl} />
        <main id="main">
          <Hero data={data} askRef={askRef} onOpen={openPanel} />
          <Section {...section("trayectoria")}>
            <Timeline entries={data.timeline} />
          </Section>
          <Section {...section("proyectos")}>
            <Projects projects={data.projects} />
          </Section>
          <Section {...section("certificaciones")}>
            <Certifications certs={data.certs} />
          </Section>
          <Section {...section("tecnologias")}>
            <Skills groups={data.skills} />
          </Section>
          <Contact data={data} index={SECTIONS.length} onAsk={() => openPanel()} />
        </main>
      </div>

      <footer className="page flex flex-wrap justify-between gap-4 border-t border-rule pb-28 pt-8 text-sm text-ink-faint">
        <p>
          © {new Date().getFullYear()} {data.name}
        </p>
        <p>{t.footer}</p>
      </footer>

      <button
        type="button"
        onClick={() => openPanel()}
        aria-label={t.askLabel}
        tabIndex={dock && !open ? 0 : -1}
        className={`fixed bottom-[max(20px,env(safe-area-inset-bottom))] left-1/2 z-20 flex w-[min(560px,calc(100vw-24px))] items-center gap-3 rounded-sm bg-ink py-2.5 pl-4.5 pr-2.5 text-left text-surface transition-[transform,opacity] duration-[var(--dur-med)] ease-[var(--ease-out)] ${
          dock && !open ? "-translate-x-1/2 translate-y-0 opacity-100" : "pointer-events-none -translate-x-1/2 translate-y-[140%] opacity-0"
        }`}
      >
        <span aria-hidden className="size-2 animate-pulse-dot rounded-full bg-accent" />
        <span className="min-w-0 flex-1 truncate text-[0.9375rem]">{t.dock}</span>
        <kbd className="rounded-sm border border-ink-soft px-2 py-0.5 font-mono text-xs text-rule">/</kbd>
      </button>

      <AssistantPanel open={open} onClose={closePanel} files={data.files} chat={chat} inputRef={inputRef} onGoTo={goTo} />
    </>
  );
}
