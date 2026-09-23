// Textos de la interfaz en español e inglés, secciones de la página y preguntas sugeridas.
// El contenido (proyectos, formación...) no está aquí: sale de /content (ver lib/portfolio.ts).

import type { L, Lang } from "./site-types";

export const UI = {
  es: {
    cv: "CV",
    askLabel: "Abrir el asistente",
    ask: "Preguntar",
    tryWith: "Prueba con",
    boot: "indexando",
    ready: "listo, pregúntame",
    source: "Fuente:",
    askAbout: "preguntar al asistente",
    work: "Trabajo",
    edu: "Formación",
    verify: "Verificar credencial",
    copy: "Copiar email",
    copied: "Copiado ✓",
    cvRow: "Currículum",
    cvValue: "Descargar CV en PDF",
    letsTalk: "Hablemos",
    orAsk: "¿Dudas antes de escribir? Pregúntale al asistente",
    footer: "Next.js · Gemini · contenido en Markdown, sin base de datos",
    dock: "Pregúntale a mi asistente",
    panelTitle: "Asistente · responde solo con mis documentos",
    newConv: "Nueva conversación",
    close: "Cerrar",
    kb: "base:",
    empty1: "Pregúntame por su formación, sus proyectos o",
    emptyEm: "cómo trabaja",
    empty2: (n: number) => `Cada respuesta sale de ${n} documentos y cita sus fuentes. Si algo no está escrito en ellos, te lo diré.`,
    thinking: "Leyendo",
    placeholder: "Pregúntame cualquier cosa sobre Borja…",
    send: "Enviar pregunta",
    hint: "Enter para enviar · Shift+Enter nueva línea · Esc para cerrar",
    sources: "Fuentes",
    goTo: "Ir a la sección",
    retry: "Reintentar",
    error: "Error.",
    noConnection: "No hay conexión con el servidor.",
    interrupted: "La respuesta se interrumpió. Inténtalo de nuevo.",
    noInfoLabel: "Sin datos en los documentos",
    offTopicLabel: "Fuera del perfil de Borja",
    yourQuestion: "Tu pregunta:",
    answer: "Respuesta del asistente:",
    language: "Idioma",
    sections: "Secciones",
    skip: "Ir al contenido",
  },
  en: {
    cv: "CV",
    askLabel: "Open the assistant",
    ask: "Ask",
    tryWith: "Try",
    boot: "indexing",
    ready: "ready, ask me",
    source: "Source:",
    askAbout: "ask the assistant",
    work: "Work",
    edu: "Education",
    verify: "Verify credential",
    copy: "Copy email",
    copied: "Copied ✓",
    cvRow: "Résumé",
    cvValue: "Download CV as PDF",
    letsTalk: "Let's talk",
    orAsk: "Questions before you write? Ask the assistant",
    footer: "Next.js · Gemini · Markdown content, no database",
    dock: "Ask my assistant",
    panelTitle: "Assistant · answers only from my documents",
    newConv: "New conversation",
    close: "Close",
    kb: "base:",
    empty1: "Ask me about his education, his projects or",
    emptyEm: "how he works",
    empty2: (n: number) => `Every answer comes from ${n} documents and cites its sources. If something isn't written there, I'll say so.`,
    thinking: "Reading",
    placeholder: "Ask me anything about Borja…",
    send: "Send question",
    hint: "Enter to send · Shift+Enter new line · Esc to close",
    sources: "Sources",
    goTo: "Go to section",
    retry: "Retry",
    error: "Error.",
    noConnection: "Can't reach the server.",
    interrupted: "The answer was interrupted. Please try again.",
    noInfoLabel: "Not in the documents",
    offTopicLabel: "Outside Borja's profile",
    yourQuestion: "Your question:",
    answer: "Assistant's answer:",
    language: "Language",
    sections: "Sections",
    skip: "Skip to content",
  },
} as const;

export type UIStrings = (typeof UI)[Lang];

/** Secciones de la página, en orden. `file` = archivo de /content al que enlazan las fuentes del chat. */
export const SECTIONS = [
  { id: "trayectoria", label: { es: "Trayectoria", en: "Journey" }, files: ["about.md", "education.md"] },
  { id: "proyectos", label: { es: "Proyectos", en: "Projects" }, files: ["projects.md"] },
  { id: "certificaciones", label: { es: "Certificaciones", en: "Certifications" }, files: ["certifications.md"] },
  { id: "tecnologias", label: { es: "Tecnologías", en: "Stack" }, files: ["skills.md"] },
  { id: "contacto", label: { es: "Contacto", en: "Contact" }, files: [] },
] as const satisfies readonly { id: string; label: L; files: readonly string[] }[];

/** Sección a la que salta cada fuente citada por el asistente. */
export const FILE_SECTION: Record<string, string> = {
  "about.md": "top",
  "education.md": "trayectoria",
  "projects.md": "proyectos",
  "certifications.md": "certificaciones",
  "skills.md": "tecnologias",
};

export const SUGGESTIONS: Record<Lang, string[]> = {
  es: [
    "¿Qué estudia Borja?",
    "¿Qué certificaciones tiene?",
    "¿Qué proyectos de IA ha desarrollado?",
    "¿Qué tecnologías utiliza?",
    "¿Qué experiencia tiene con Azure?",
  ],
  en: [
    "What is Borja studying?",
    "Which certifications does he hold?",
    "What AI projects has he built?",
    "Which technologies does he use?",
    "What experience does he have with Azure?",
  ],
};

/** Pregunta sugerida que abre cada sección desde su enlace "preguntar al asistente". */
export const SECTION_QUESTION: Record<string, number> = { trayectoria: 0, proyectos: 2, certificaciones: 1, tecnologias: 3 };
