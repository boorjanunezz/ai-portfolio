import "server-only";
import fs from "node:fs";
import path from "node:path";
import { isPlaceholder, loadMarkdownFiles, stripComments } from "./documents";
import type { CertItem, ContactLink, L, ProjectItem, SiteData, SkillGroup, TimelineEntry } from "./site-types";

/**
 * Datos de la web derivados de /content (los mismos Markdown que usa el asistente).
 * Se ejecuta en build: la página es estática.
 *
 * Convenciones de los Markdown:
 *  - "## Título" = una entrada; "### Título" = sub-entrada (p. ej. cada puesto en Experiencia).
 *  - "Clave: valor" solo es un campo si la clave está en la lista de ese archivo (KEYS);
 *    cualquier otra línea con dos puntos ("TFM: ...", "Español: nativo.") es texto normal.
 *  - "EN:", "EN título:", "EN organización:" = traducción opcional para la web en inglés.
 *  - Lo marcado con PLACEHOLDER no se muestra.
 */

interface Node {
  title: string;
  fields: Record<string, string>;
  paragraphs: string[];
  items: string[];
  children: Node[];
}

const EN_KEYS = ["en", "en título", "en titulo", "en organización", "en organizacion"];
const CONTACT_KEYS = ["email", "linkedin", "github", "web", "twitter", "x"];
const KEYS: Record<string, string[]> = {
  "about.md": ["titular", "empresa", "periodo", "resumen", ...CONTACT_KEYS, ...EN_KEYS],
  "education.md": ["centro", "periodo", "estado", ...EN_KEYS],
  "certifications.md": ["emisor", "fecha", "credencial", ...EN_KEYS],
  "projects.md": ["tecnologías", "tecnologias", "github", "demo", "imagen", ...EN_KEYS],
  "skills.md": EN_KEYS,
};

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// ── Parser ────────────────────────────────────────────────────────────

function parseFile(file: string): Node {
  const markdown = stripComments(loadMarkdownFiles().find((f) => f.file === file)?.content ?? "");
  const keys = KEYS[file] ?? [];
  const root: Node = { title: "", fields: {}, paragraphs: [], items: [], children: [] };
  let section: Node | null = null;
  let current: Node = root;
  let paragraph: string[] = [];

  const closeParagraph = () => {
    if (paragraph.length) current.paragraphs.push(paragraph.join(" "));
    paragraph = [];
  };
  const newNode = (title: string): Node => ({ title, fields: {}, paragraphs: [], items: [], children: [] });

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    const heading = /^(#{2,3})\s+(.*)$/.exec(line);
    if (heading) {
      closeParagraph();
      const node = newNode(heading[2]!.trim());
      if (heading[1] === "##" || !section) {
        root.children.push(node);
        section = node;
      } else {
        section.children.push(node);
      }
      current = node;
      continue;
    }
    if (!line || isPlaceholder(line)) {
      closeParagraph();
      continue;
    }
    const item = /^[-*]\s+(.*)$/.exec(line);
    const field = /^([\p{L} ]{2,30}):\s*(.*)$/u.exec(line);
    const key = field?.[1]!.trim().toLowerCase();
    if (item) {
      closeParagraph();
      current.items.push(item[1]!.trim());
    } else if (field && key && keys.includes(key)) {
      closeParagraph();
      if (field[2]!.trim()) current.fields[key] = field[2]!.trim();
    } else {
      paragraph.push(line);
    }
  }
  closeParagraph();
  return root;
}

// ── Helpers ───────────────────────────────────────────────────────────

const real = (nodes: Node[]) => nodes.filter((n) => !isPlaceholder(n.title));
const find = (root: Node, title: string) => root.children.find((n) => n.title.toLowerCase() === title);
const field = (node: Node | undefined, ...keys: string[]) => keys.map((k) => node?.fields[k]).find(Boolean);
const text = (node: Node | undefined) => node?.paragraphs.join(" ") ?? "";
const firstSentence = (s: string) => s.split(/(?<=\.)\s/)[0] ?? s;
const years = (when: string) => (when.match(/\d{4}/g) ?? []).map(Number);

/** Solo URLs http(s)/mailto, para no inyectar enlaces javascript: desde el Markdown. */
function safeUrl(raw: string | undefined): string | undefined {
  return raw && /^(https?:\/\/|mailto:)/i.test(raw) ? raw : undefined;
}

function lText(es: string, en: string | undefined): L {
  return en ? { es, en } : { es };
}

// ── Secciones ─────────────────────────────────────────────────────────

function workEntries(about: Node): TimelineEntry[] {
  return real(find(about, "experiencia")?.children ?? []).map((n) => {
    const when = field(n, "periodo") ?? "";
    return {
      when,
      kind: "work",
      title: lText(n.title, field(n, "en título", "en titulo")),
      org: lText(field(n, "empresa") ?? "", field(n, "en organización", "en organizacion")),
      text: lText(text(n), field(n, "en")),
      now: /—\s*$|-\s*$|actualidad|presente|present/i.test(when),
    };
  });
}

function educationEntries(education: Node): TimelineEntry[] {
  return real(education.children).map((n) => ({
    when: field(n, "periodo") ?? "",
    kind: "edu",
    title: lText(n.title, field(n, "en título", "en titulo")),
    org: lText(field(n, "centro") ?? "", field(n, "en organización", "en organizacion")),
    text: lText(text(n), field(n, "en")),
    now: false,
  }));
}

/** Más reciente primero: por año de inicio y, a igualdad, por año de fin (abierto = actual). */
function sortTimeline(entries: TimelineEntry[]): TimelineEntry[] {
  const key = (e: TimelineEntry) => {
    const y = years(e.when);
    return [y[0] ?? 0, e.now ? 9999 : (y.at(-1) ?? 0)] as const;
  };
  return [...entries].sort((a, b) => {
    const [as, ae] = key(a);
    const [bs, be] = key(b);
    return bs - as || be - ae;
  });
}

function projects(): ProjectItem[] {
  return real(parseFile("projects.md").children).map((n) => ({
    name: n.title,
    summary: lText(firstSentence(n.paragraphs[0] ?? ""), field(n, "en")),
    technologies: (field(n, "tecnologías", "tecnologias") ?? "").split(",").map((t) => t.trim()).filter(Boolean),
    github: safeUrl(field(n, "github")),
    demo: safeUrl(field(n, "demo")),
    image: field(n, "imagen")?.startsWith("/") ? field(n, "imagen") : undefined,
  }));
}

function formatDate(raw: string | undefined): string {
  if (!raw) return "";
  const lower = raw.toLowerCase();
  const month = MONTHS.findIndex((m) => lower.includes(m));
  const year = raw.match(/\d{4}/)?.[0];
  return month >= 0 && year ? `${String(month + 1).padStart(2, "0")} · ${year}` : raw;
}

function certs(): CertItem[] {
  return real(parseFile("certifications.md").children).map((n) => {
    const code = /\(([^)]+)\)\s*$/.exec(n.title)?.[1] ?? "";
    const name = n.title.replace(/\s*\([^)]+\)\s*$/, "").replace(/^[^:]+:\s*/, "");
    return { code, name, issuer: field(n, "emisor") ?? "", date: formatDate(field(n, "fecha")), url: safeUrl(field(n, "credencial")) };
  });
}

function skills(): SkillGroup[] {
  return real(parseFile("skills.md").children).map((n) => ({
    category: lText(n.title, field(n, "en")),
    items: n.items.map((i) => i.split(/\s+—\s+/)[0]!.trim()),
  }));
}

function contactLinks(about: Node): { email?: string; links: ContactLink[] } {
  const c = find(about, "contacto");
  const email = field(c, "email");
  const links = CONTACT_KEYS.filter((k) => k !== "email")
    .map((k) => ({ key: k, href: safeUrl(field(c, k)) }))
    .filter((l): l is { key: string; href: string } => Boolean(l.href))
    .map(({ key, href }) => ({
      label: key === "linkedin" ? "LinkedIn" : key === "github" ? "GitHub" : key.charAt(0).toUpperCase() + key.slice(1),
      value: href.replace(/^https?:\/\/(www\.)?/, "").replace(/^linkedin\.com\//, "").replace(/\/$/, ""),
      href,
    }));
  return { email, links };
}

// ── Ensamblado ────────────────────────────────────────────────────────

export function getSiteData(): SiteData {
  const aboutRaw = loadMarkdownFiles().find((f) => f.file === "about.md")?.content ?? "";
  const about = parseFile("about.md");
  const education = parseFile("education.md");
  const profile = find(about, "perfil");

  const timeline = sortTimeline([...workEntries(about), ...educationEntries(education)]);
  const current = timeline.find((e) => e.now);
  const location = text(find(about, "ubicación") ?? find(about, "ubicacion"))
    .replace(/\s*\([^)]*\)/, "")
    .replace(/\.$/, "");
  const where = (sep: string, e?: TimelineEntry, en = false) =>
    [e ? `${en ? e.title.en ?? e.title.es : e.title.es}${sep}${en ? e.org.en ?? e.org.es : e.org.es}` : "", location]
      .filter(Boolean)
      .join(" · ");

  const languagesNode = find(about, "idiomas");
  const projectList = projects();
  const certList = certs();
  const issuers = [...new Set(certList.map((c) => c.issuer))];
  const master = real(education.children).find((n) => /(\d+)\s*horas/.test(text(n)));
  const hours = master ? /(\d+)\s*horas/.exec(text(master))![1] : undefined;

  const stats: SiteData["stats"] = [
    {
      value: String(certList.length),
      label: issuers.length === 1 ? { es: `certificaciones ${issuers[0]}`, en: `${issuers[0]} certifications` } : { es: "certificaciones", en: "certifications" },
    },
    { value: String(projectList.length), label: { es: "proyectos documentados", en: "documented projects" } },
  ];
  if (master && hours) stats.push({ value: `${hours} h`, label: lText(master.title, field(master, "en título", "en titulo")) });

  return {
    name: /^#\s+Sobre\s+(.+)$/m.exec(aboutRaw)?.[1]?.trim() ?? "Borja Núñez",
    headline: field(profile, "titular") ?? "",
    meta: { es: where(" en ", current), en: where(" at ", current, true) },
    languages: lText(field(languagesNode, "resumen") ?? text(languagesNode), field(languagesNode, "en")),
    lead: lText(profile?.paragraphs.at(-1) ?? "", field(profile, "en")),
    stats,
    timeline,
    projects: projectList,
    certs: certList,
    skills: skills(),
    ...contactLinks(about),
    cvUrl: fs.existsSync(path.join(process.cwd(), "public", "cv.pdf")) ? "/cv.pdf" : undefined,
    files: loadMarkdownFiles().map((f) => f.file),
  };
}
