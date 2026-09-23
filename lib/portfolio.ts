import "server-only";
import { isPlaceholder, loadMarkdownFiles, stripComments } from "./documents";

/**
 * Datos derivados de /content para las secciones de la web.
 * No hay datos duplicados: todo sale de los mismos Markdown que usa el asistente.
 * Se ejecuta en build (la página es estática), así que no cuesta nada en runtime.
 */

interface Section {
  title: string;
  placeholder: boolean;
  fields: Record<string, string>;
  paragraphs: string[];
  items: string[];
}

export interface TextBlock {
  text: string;
  placeholder: boolean;
}

export interface ContactLink {
  label: string;
  value?: string;
  href?: string;
}

export interface Project {
  name: string;
  placeholder: boolean;
  description: TextBlock[];
  technologies: string[];
  github?: string;
  demo?: string;
  image?: string;
}

export interface SkillGroup {
  category: string;
  items: { name: string; detail?: string; placeholder: boolean }[];
}

export interface Entry {
  title: string;
  placeholder: boolean;
  meta: string[]; // centro, periodo, emisor, fecha... ya filtrados
  description: TextBlock[];
  url?: string;
}

function readFile(file: string): string {
  return stripComments(loadMarkdownFiles().find((f) => f.file === file)?.content ?? "");
}

/** Divide un Markdown en secciones "##" con campos "Clave: valor", listas y párrafos. */
function parseSections(markdown: string): Section[] {
  const sections: Section[] = [];
  let current: Section | null = null;
  let paragraph: string[] = [];

  const closeParagraph = () => {
    if (current && paragraph.length) current.paragraphs.push(paragraph.join(" "));
    paragraph = [];
  };

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    const heading = /^##\s+(.*)$/.exec(line);
    if (heading) {
      closeParagraph();
      const title = heading[1]!.trim();
      current = { title, placeholder: isPlaceholder(title), fields: {}, paragraphs: [], items: [] };
      sections.push(current);
      continue;
    }
    if (!current) continue;

    const item = /^[-*]\s+(.*)$/.exec(line);
    const field = /^([\p{L} ]{2,30}):\s*(.*)$/u.exec(line);
    if (!line) {
      closeParagraph();
    } else if (item) {
      closeParagraph();
      current.items.push(item[1]!.trim());
    } else if (field && !isPlaceholder(field[1]!)) {
      closeParagraph();
      current.fields[field[1]!.trim().toLowerCase()] = field[2]!.trim();
    } else {
      // Cada línea placeholder es su propio bloque para poder marcarla aparte.
      if (isPlaceholder(line)) {
        closeParagraph();
        current.paragraphs.push(line);
      } else {
        paragraph.push(line);
      }
    }
  }
  closeParagraph();
  return sections;
}

/** Valor real de un campo, o undefined si está vacío o es placeholder. */
function value(raw: string | undefined): string | undefined {
  return raw && !isPlaceholder(raw) ? raw : undefined;
}

/** Solo URLs http(s)/mailto, para no inyectar enlaces javascript: desde el Markdown. */
function safeUrl(raw: string | undefined): string | undefined {
  const v = value(raw);
  return v && /^(https?:\/\/|mailto:)/i.test(v) ? v : undefined;
}

function blocks(paragraphs: string[]): TextBlock[] {
  return paragraphs.map((text) => ({ text: text.replace(/^PLACEHOLDER:\s*/i, ""), placeholder: isPlaceholder(text) }));
}

export function getAbout() {
  const sections = parseSections(readFile("about.md"));
  const profile = sections.find((s) => s.title.toLowerCase() === "perfil");
  const intro = profile?.paragraphs.find((p) => !isPlaceholder(p)) ?? "";
  const details = sections
    .filter((s) => s !== profile && s.title.toLowerCase() !== "contacto")
    .map((s) => ({ title: s.title, description: blocks(s.paragraphs) }));
  return { intro, profile: blocks(profile?.paragraphs ?? []), details };
}

export function getContact(): ContactLink[] {
  const contact = parseSections(readFile("about.md")).find((s) => s.title.toLowerCase() === "contacto");
  return Object.entries(contact?.fields ?? {}).map(([key, raw]) => {
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    const v = value(raw);
    const href = key === "email" && v && !v.startsWith("mailto:") ? `mailto:${v}` : safeUrl(raw);
    return { label: label === "Linkedin" ? "LinkedIn" : label === "Github" ? "GitHub" : label, value: v, href };
  });
}

export function getProjects(): Project[] {
  return parseSections(readFile("projects.md")).map((s) => ({
    name: s.title.replace(/^PLACEHOLDER:\s*/i, ""),
    placeholder: s.placeholder,
    description: blocks(s.paragraphs),
    technologies: (value(s.fields["tecnologías"] ?? s.fields["tecnologias"]) ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    github: safeUrl(s.fields.github),
    demo: safeUrl(s.fields.demo),
    image: value(s.fields.imagen)?.startsWith("/") ? s.fields.imagen : undefined,
  }));
}

export function getSkills(): SkillGroup[] {
  return parseSections(readFile("skills.md")).map((s) => ({
    category: s.title,
    items: s.items.map((raw) => {
      const [name, detail] = raw.replace(/^PLACEHOLDER:\s*/i, "").split(/\s+—\s+/);
      return { name: name!.trim(), detail: detail?.trim(), placeholder: isPlaceholder(raw) };
    }),
  }));
}

function getEntries(file: string, metaKeys: string[], urlKey?: string): Entry[] {
  return parseSections(readFile(file)).map((s) => ({
    title: s.title.replace(/^PLACEHOLDER:\s*/i, ""),
    placeholder: s.placeholder,
    meta: metaKeys.map((k) => value(s.fields[k])).filter((v): v is string => Boolean(v)),
    description: blocks(s.paragraphs),
    url: urlKey ? safeUrl(s.fields[urlKey]) : undefined,
  }));
}

export const getEducation = () => getEntries("education.md", ["centro", "periodo", "estado"]);
export const getCertifications = () => getEntries("certifications.md", ["emisor", "fecha"], "credencial");
