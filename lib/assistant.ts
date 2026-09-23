import "server-only";
import { retrieve } from "./retrieval";
import { buildUserPrompt, PROMPT_CANARY, REFUSAL, sanitizeUserText, SYSTEM_PROMPT } from "./prompts";
import { generateAnswer } from "./gemini";
import type { AnswerStatus, ChatResponse, ChatTurn } from "./types";

/**
 * Orquesta el RAG: pregunta → retrieval → prompt → Gemini → respuesta con fuentes.
 * Recibe datos ya validados (ver validation.ts).
 */
export async function answerQuestion(message: string, history: ChatTurn[]): Promise<ChatResponse> {
  const question = sanitizeUserText(message);
  const previousQuestion = [...history].reverse().find((t) => t.role === "user")?.content;

  const chunks = retrieve(question, previousQuestion);
  const historyText = history
    .map((t) => `${t.role === "user" ? "Usuario" : "Asistente"}: ${sanitizeUserText(t.content)}`)
    .join("\n");

  const result = await generateAnswer(SYSTEM_PROMPT, buildUserPrompt(question, chunks, historyText));

  // Salvaguarda: si el modelo filtra el prompt, se sustituye la respuesta.
  if (result.answer.includes(PROMPT_CANARY)) {
    return { answer: pickLanguage(question).offTopic, sources: [], status: "off_topic" };
  }
  const status = normalizeStatus(result.status, result.answer);
  if (status !== "answered") {
    return { answer: result.answer.trim(), sources: [], status };
  }

  // Las fuentes se limitan a chunks realmente enviados; el modelo no puede inventarlas.
  const sentIds = new Map(chunks.map((c) => [c.id, c.file]));
  let files = result.sources.map((id) => sentIds.get(id)).filter((f): f is string => Boolean(f));
  if (files.length === 0 && chunks[0]) files = [chunks[0].file];

  return {
    answer: result.answer.trim(),
    sources: [...new Set(files)].map((file) => ({ file })),
    status: "answered",
  };
}

/**
 * A veces el modelo marca "answered" pero responde con la frase de rechazo:
 * se corrige el estado para no mostrar fuentes en una respuesta vacía.
 */
function normalizeStatus(status: AnswerStatus, answer: string): AnswerStatus {
  if (status !== "answered") return status;
  const text = answer.trim();
  if (text === REFUSAL.es.noInfo || text === REFUSAL.en.noInfo) return "no_info";
  if (text === REFUSAL.es.offTopic || text === REFUSAL.en.offTopic) return "off_topic";
  return status;
}

/** Heurística simple para elegir idioma de los mensajes fijos. */
function pickLanguage(text: string) {
  const englishHints = /\b(what|who|where|which|how|does|is|are|has|have|tell|can|the)\b/i;
  return englishHints.test(text) && !/[¿¡ñáéíóú]/i.test(text) ? REFUSAL.en : REFUSAL.es;
}
