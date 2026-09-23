import "server-only";
import { loadChunks, type Chunk } from "./documents";

/**
 * Recuperación léxica con BM25 (sin embeddings, sin base de datos).
 *
 * 1. Cada chunk se tokeniza: minúsculas, sin tildes, sin stopwords y con un
 *    "stemming" mínimo (quitar plural + truncar a 6 caracteres), para que
 *    "certificaciones", "certificado" y "certification" compartan raíz.
 * 2. Al título de la sección se le da doble peso y a cada archivo se le añaden
 *    palabras-pista (FILE_HINTS) para preguntas genéricas como "¿Qué estudia?".
 * 3. La consulta se puntúa con BM25 contra todos los chunks y se devuelven los
 *    mejores que superan un umbral relativo, con un límite de tamaño total.
 */

const TOP_K = 10; // suficiente para listar todos los proyectos o certificaciones
const RELATIVE_THRESHOLD = 0.3; // descarta chunks con < 30 % de la puntuación del mejor
const MAX_CONTEXT_CHARS = 6000;
const HISTORY_WEIGHT = 0.5; // peso de la pregunta anterior (para preguntas de seguimiento)
const BM25_K1 = 1.2;
const BM25_B = 0.75;

/** Palabras que orientan hacia un archivo aunque no aparezcan en su texto. */
const FILE_HINTS: Record<string, string> = {
  "about.md":
    "perfil profile presentacion about experiencia experience trabaja trabajo work job empresa company puesto role contacto contact email correo linkedin ubicacion vive live lives location ciudad city idiomas idioma habla speak spoken languages ingles english espanol spanish",
  "education.md":
    "estudia estudios estudio study studies formacion education grado degree master universidad university carrera titulacion curso",
  "certifications.md":
    "certificacion certificado certification certificate credencial credential badge acreditacion examen",
  "skills.md":
    "tecnologias technologies tecnologia conocimientos skills habilidades herramientas tools lenguajes stack domina utiliza usa",
  "projects.md":
    "proyecto projects desarrollado developed construido built portfolio aplicacion app demo github repositorio",
};

const STOPWORDS = new Set(
  (
    // español
    "a al algo algun alguna algunas alguno algunos ante antes aqui asi aun cada como con cual cuales cuando cuanto de del desde donde dos el ella ellas ello ellos en entre era eres es esa esas ese eso esos esta estan estas este esto estos fue fueron ha han has hay hace hacer la las le les lo los mas me mi mis muy nada ni no nos o os otra otro para pero poco por porque puede pues que se sea ser si sido sin sobre son su sus tambien te tengo tiene tienen ti tu tus un una unas uno unos usted y ya yo " +
    "cuentame dime puedes podrias sabes decir hablame explica " +
    // inglés
    "an and are as at be been but by can could did do does for from had has have he her him his how i if in is it its me my of on or our she so tell than that the their them then there these they this to was we were what when where which will with would you your about " +
    // el propio nombre aparece en todas partes: no discrimina
    "borja nunez"
  ).split(/\s+/),
);

export interface ScoredChunk extends Chunk {
  score: number;
}

interface IndexedChunk {
  chunk: Chunk;
  tf: Map<string, number>;
  length: number;
}

interface Index {
  docs: IndexedChunk[];
  df: Map<string, number>;
  avgLength: number;
}

let indexCache: Index | null = null;

export function normalize(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036F]/g, "").toLowerCase();
}

function stem(token: string): string {
  const singular = token.length > 4 && token.endsWith("s") ? token.slice(0, -1) : token;
  return singular.slice(0, 6);
}

export function tokenize(text: string): string[] {
  const words = normalize(text).match(/[a-z0-9][a-z0-9+#]*/g) ?? [];
  return words.filter((w) => w.length > 1 && !STOPWORDS.has(w)).map(stem);
}

function countTerms(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  return tf;
}

function buildIndex(chunks: Chunk[]): Index {
  const df = new Map<string, number>();
  const docs = chunks.map((chunk) => {
    const headingTokens = tokenize(chunk.heading);
    const tokens = [
      ...headingTokens,
      ...headingTokens, // el título pesa doble
      ...tokenize(chunk.text),
      ...tokenize(FILE_HINTS[chunk.file] ?? ""),
    ];
    const tf = countTerms(tokens);
    for (const term of tf.keys()) df.set(term, (df.get(term) ?? 0) + 1);
    return { chunk, tf, length: tokens.length };
  });
  const avgLength = docs.reduce((sum, d) => sum + d.length, 0) / Math.max(docs.length, 1);
  return { docs, df, avgLength };
}

function getIndex(): Index {
  indexCache ??= buildIndex(loadChunks());
  return indexCache;
}

/** Términos de la consulta con su peso (la pregunta actual pesa más que la anterior). */
function queryTerms(question: string, previousQuestion?: string): Map<string, number> {
  const weights = new Map<string, number>();
  for (const t of tokenize(previousQuestion ?? "")) weights.set(t, HISTORY_WEIGHT);
  for (const t of tokenize(question)) weights.set(t, 1);
  return weights;
}

function bm25(doc: IndexedChunk, terms: Map<string, number>, index: Index): number {
  const n = index.docs.length;
  let score = 0;
  for (const [term, weight] of terms) {
    const freq = doc.tf.get(term);
    if (!freq) continue;
    const df = index.df.get(term) ?? 0;
    const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
    const norm = freq + BM25_K1 * (1 - BM25_B + (BM25_B * doc.length) / index.avgLength);
    score += weight * idf * ((freq * (BM25_K1 + 1)) / norm);
  }
  return score;
}

/** Recupera los chunks más relevantes para la pregunta. Puede devolver []. */
export function retrieve(question: string, previousQuestion?: string): ScoredChunk[] {
  const index = getIndex();
  const terms = queryTerms(question, previousQuestion);
  if (terms.size === 0) return fallbackForProfileQuestion(question, index);

  const ranked = index.docs
    .map((doc) => ({ ...doc.chunk, score: bm25(doc, terms, index) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);

  const best = ranked[0]?.score ?? 0;
  const selected: ScoredChunk[] = [];
  let totalChars = 0;
  for (const chunk of ranked) {
    if (selected.length >= TOP_K || chunk.score < best * RELATIVE_THRESHOLD) break;
    if (totalChars + chunk.text.length > MAX_CONTEXT_CHARS) break;
    selected.push(chunk);
    totalChars += chunk.text.length;
  }
  return selected.length ? selected : fallbackForProfileQuestion(question, index);
}

/**
 * "¿Quién es Borja?" se queda sin términos útiles tras quitar stopwords.
 * Si la pregunta nombra a Borja, devolvemos el perfil (about.md) como contexto.
 */
function fallbackForProfileQuestion(question: string, index: Index): ScoredChunk[] {
  if (!/\bborja\b/.test(normalize(question))) return [];
  return index.docs
    .filter((d) => d.chunk.file === "about.md")
    .slice(0, 2)
    .map((d) => ({ ...d.chunk, score: 0 }));
}
