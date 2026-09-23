// Secciones de la página y su archivo de origen. Las fuentes del chat enlazan aquí.

export const SECTIONS = [
  { id: "about", label: "Sobre mí", file: "about.md" },
  { id: "projects", label: "Proyectos", file: "projects.md" },
  { id: "skills", label: "Tecnologías", file: "skills.md" },
  { id: "education", label: "Formación", file: "education.md" },
  { id: "certifications", label: "Certificaciones", file: "certifications.md" },
  { id: "contact", label: "Contacto", file: null },
] as const;

export function sectionForFile(file: string) {
  return SECTIONS.find((s) => s.file === file);
}

export const SUGGESTED_QUESTIONS = [
  "¿Qué estudia Borja?",
  "¿Qué certificaciones tiene?",
  "¿Qué proyectos de IA ha desarrollado?",
  "¿Qué tecnologías utiliza?",
  "¿Qué experiencia tiene con Azure?",
];
