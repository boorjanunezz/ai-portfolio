import "server-only";
import fs from "node:fs";
import path from "node:path";

/**
 * Carga de documentos y chunking.
 *
 * Fuente de verdad: los archivos .md de /content. Cada archivo se divide por
 * encabezados (#, ##, ###) y, si una sección es muy larga, por párrafos.
 * Las líneas con "PLACEHOLDER" y los comentarios HTML no se indexan: así el
 * modelo nunca ve datos de relleno y responde "no tengo información".
 */

const CONTENT_DIR = path.join(process.cwd(), "content");
const MAX_CHUNK_CHARS = 900;

export interface MarkdownFile {
  file: string; // p. ej. "projects.md"
  content: string;
}

export interface Chunk {
  id: string; // p. ej. "projects.md#2"
  file: string;
  heading: string; // ruta de encabezados: "Proyectos > Portfolio con asistente de IA"
  text: string;
}

let filesCache: MarkdownFile[] | null = null;
let chunksCache: Chunk[] | null = null;

/** Lee todos los .md de /content (cacheado por instancia serverless). */
export function loadMarkdownFiles(): MarkdownFile[] {
  if (filesCache) return filesCache;
  const names = fs
    .readdirSync(CONTENT_DIR)
    .filter((name) => name.endsWith(".md"))
    .sort();
  filesCache = names.map((file) => ({
    file,
    content: fs.readFileSync(path.join(CONTENT_DIR, file), "utf8"),
  }));
  return filesCache;
}

export function loadChunks(): Chunk[] {
  if (chunksCache) return chunksCache;
  chunksCache = loadMarkdownFiles().flatMap(chunkFile);
  return chunksCache;
}

export function isPlaceholder(text: string): boolean {
  return /PLACEHOLDER/i.test(text);
}

export function stripComments(markdown: string): string {
  return markdown.replace(/<!--[\s\S]*?-->/g, "");
}

/** Líneas que no aportan nada al índice: placeholders y campos vacíos ("Imagen:"). */
function isNoise(line: string): boolean {
  return isPlaceholder(line) || /^\s*[\p{L} ]{2,30}:\s*$/u.test(line);
}

function chunkFile({ file, content }: MarkdownFile): Chunk[] {
  const chunks: Chunk[] = [];
  const headings: string[] = []; // pila de encabezados por nivel
  let buffer: string[] = [];

  const flush = () => {
    const body = buffer.join("\n").trim();
    buffer = [];
    if (!body) return;
    const heading = headings.filter(Boolean).join(" > ");
    for (const piece of splitLongText(body)) {
      chunks.push({ id: `${file}#${chunks.length}`, file, heading, text: piece });
    }
  };

  for (const line of stripComments(content).split(/\r?\n/)) {
    const match = /^(#{1,3})\s+(.*)$/.exec(line);
    if (match) {
      flush();
      const level = match[1]!.length;
      const title = match[2]!.trim();
      headings.length = level - 1;
      headings[level - 1] = isPlaceholder(title) ? "" : title;
    } else if (!isNoise(line)) {
      buffer.push(line);
    }
  }
  flush();
  return chunks;
}

/** Divide por párrafos para que ningún chunk supere MAX_CHUNK_CHARS. */
function splitLongText(text: string): string[] {
  if (text.length <= MAX_CHUNK_CHARS) return [text];
  const pieces: string[] = [];
  let current = "";
  for (const paragraph of text.split(/\n\s*\n/)) {
    if (current && current.length + paragraph.length > MAX_CHUNK_CHARS) {
      pieces.push(current.trim());
      current = "";
    }
    current += paragraph + "\n\n";
  }
  if (current.trim()) pieces.push(current.trim());
  return pieces;
}
