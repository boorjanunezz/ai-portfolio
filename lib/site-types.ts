// Datos de la web ya derivados de /content, serializables para pasarlos a componentes cliente.

export type Lang = "es" | "en";

/** Texto con traducción opcional: si falta `en`, la web en inglés muestra `es`. */
export interface L {
  es: string;
  en?: string;
}

export interface TimelineEntry {
  when: string;
  kind: "work" | "edu";
  title: L;
  org: L;
  text: L;
  now: boolean;
}

export interface ProjectItem {
  name: string;
  summary: L;
  technologies: string[];
  github?: string;
  demo?: string;
  image?: string;
}

export interface CertItem {
  code: string;
  name: string;
  issuer: string;
  date: string; // "02 · 2026"
  url?: string;
}

export interface SkillGroup {
  category: L;
  items: string[];
}

export interface ContactLink {
  label: string;
  value: string;
  href: string;
}

export interface SiteData {
  name: string;
  headline: string;
  meta: L;
  languages: L;
  lead: L;
  stats: { value: string; label: L }[];
  timeline: TimelineEntry[];
  projects: ProjectItem[];
  certs: CertItem[];
  skills: SkillGroup[];
  email?: string;
  links: ContactLink[];
  cvUrl?: string;
  files: string[];
}
