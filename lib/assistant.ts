import "server-only";
import { retrieve, type ScoredChunk } from "./retrieval";
import { buildUserPrompt, PROMPT_CANARY, REFUSAL, sanitizeUserText, SOURCES_MARKER, SYSTEM_PROMPT } from "./prompts";
import { streamAnswer } from "./llm";
import type { AnswerStatus, ChatEvent, ChatTurn, Source } from "./types";

/**
 * Orquesta el RAG en streaming: pregunta → retrieval → prompt → LLM → eventos.
 * Recibe datos ya validados (ver validation.ts).
 *
 * El modelo escribe texto y cierra con la marca [[fuentes: ...]]. Mientras llega:
 *  - se emite el texto visible (todo lo anterior a la marca);
 *  - se retienen los últimos caracteres por si son el inicio de la marca o del canary;
 *  - si aparece el canary (fuga del prompt), se descarta todo y se responde con un rechazo.
 */

const HOLD_BACK = Math.max(PROMPT_CANARY.length, 2);

export async function* answerStream(message: string, history: ChatTurn[]): AsyncGenerator<ChatEvent> {
  const question = sanitizeUserText(message);
  const previousQuestion = [...history].reverse().find((t) => t.role === "user")?.content;
  const chunks = retrieve(question, previousQuestion);
  const historyText = history
    .map((t) => `${t.role === "user" ? "Usuario" : "Asistente"}: ${sanitizeUserText(t.content)}`)
    .join("\n");

  let full = "";
  let sent = 0;
  for await (const event of streamAnswer(SYSTEM_PROMPT, buildUserPrompt(question, chunks, historyText))) {
    if (event.type === "reset") {
      full = "";
      sent = 0;
      yield event;
      continue;
    }
    full += event.text;
    if (full.includes(PROMPT_CANARY)) {
      yield* refuse(question, sent > 0);
      return;
    }
    const visibleEnd = visibleLength(full, sent);
    if (visibleEnd > sent) {
      yield { type: "delta", text: full.slice(sent, visibleEnd) };
      sent = visibleEnd;
    }
  }

  const markerStart = full.search(SOURCES_MARKER);
  const answer = (markerStart >= 0 ? full.slice(0, markerStart) : full.replace(/\[\[[^\]]*$/, "")).trimEnd();
  if (!answer.trim()) {
    // Solo llegó la marca (o nada): se trata como "sin información".
    yield { type: "delta", text: pickLanguage(question).noInfo };
    yield { type: "done", sources: [], status: "no_info" };
    return;
  }
  if (answer.length > sent) yield { type: "delta", text: answer.slice(sent) };

  const status = statusOf(answer);
  const citedIds = SOURCES_MARKER.exec(full)?.[1]?.split(",").map((id) => id.trim()) ?? [];
  yield { type: "done", status, sources: status === "answered" ? sourcesFor(citedIds, chunks) : [] };
}

/**
 * Cuánto texto se puede mostrar ya: hasta la marca (sin el espacio que la precede)
 * o, si aún no ha llegado, todo salvo los últimos HOLD_BACK caracteres.
 */
function visibleLength(full: string, sent: number): number {
  const markerStart = full.indexOf("[[");
  if (markerStart < 0) return Math.max(sent, full.length - HOLD_BACK);
  let end = markerStart;
  while (end > sent && /\s/.test(full[end - 1]!)) end--;
  return end;
}

async function* refuse(question: string, alreadySent: boolean): AsyncGenerator<ChatEvent> {
  if (alreadySent) yield { type: "reset" };
  yield { type: "delta", text: pickLanguage(question).offTopic };
  yield { type: "done", sources: [], status: "off_topic" };
}

/** Las fuentes se limitan a chunks realmente enviados; el modelo no puede inventarlas. */
function sourcesFor(citedIds: string[], chunks: ScoredChunk[]): Source[] {
  const sentIds = new Map(chunks.map((c) => [c.id, c.file]));
  let files = citedIds.map((id) => sentIds.get(id)).filter((f): f is string => Boolean(f));
  if (files.length === 0 && chunks[0]) files = [chunks[0].file];
  return [...new Set(files)].map((file) => ({ file }));
}

/** El estado se deduce de la respuesta: las frases de rechazo son fijas (ver SYSTEM_PROMPT). */
function statusOf(answer: string): AnswerStatus {
  const text = answer.trim();
  if (text.startsWith(REFUSAL.es.noInfo) || text.startsWith(REFUSAL.en.noInfo)) return "no_info";
  if (text.startsWith(REFUSAL.es.offTopic) || text.startsWith(REFUSAL.en.offTopic)) return "off_topic";
  return "answered";
}

/** Heurística simple para elegir idioma de los mensajes fijos. */
function pickLanguage(text: string) {
  const englishHints = /\b(what|who|where|which|how|does|is|are|has|have|tell|can|the)\b/i;
  return englishHints.test(text) && !/[¿¡ñáéíóú]/i.test(text) ? REFUSAL.en : REFUSAL.es;
}
