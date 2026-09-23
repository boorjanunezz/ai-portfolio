import "server-only";
import type { AnswerStatus } from "./types";

/**
 * Cliente mínimo de la API REST de Gemini (sin SDK).
 * Modelo y clave llegan por variables de entorno: GEMINI_MODEL y GEMINI_API_KEY.
 *
 * La capa gratuita a veces encola las peticiones (latencias de 1 s a 60 s) o
 * devuelve 503 por alta demanda. Por eso, si el modelo principal falla o tarda
 * demasiado, se prueba el siguiente de la lista (GEMINI_FALLBACK_MODELS),
 * siempre dentro del límite de tiempo de la función de Vercel.
 */

const DEFAULT_MODEL = "gemma-4-26b-a4b-it";
const DEFAULT_FALLBACKS = ["gemini-3.5-flash", "gemini-3.5-flash-lite"];
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const ATTEMPT_TIMEOUT_MS = 25_000; // por modelo
const TOTAL_BUDGET_MS = 52_000; // < maxDuration (60 s) de app/api/chat/route.ts
const MIN_ATTEMPT_MS = 4_000; // no merece la pena empezar un intento con menos margen

export interface ModelAnswer {
  status: AnswerStatus;
  answer: string;
  sources: string[]; // ids de chunk
}

/** Error con un mensaje apto para mostrar al usuario y un status HTTP. */
export class GeminiError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number,
    /** true si otro modelo podría funcionar (saturación, cuota, timeout). */
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    status: { type: "STRING", enum: ["answered", "no_info", "off_topic"] },
    answer: { type: "STRING" },
    sources: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["status", "answer", "sources"],
  propertyOrdering: ["status", "answer", "sources"],
};

const MODEL_NAME = /^[\w.-]+$/;

function getConfig() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new GeminiError("El asistente no está configurado (falta GEMINI_API_KEY).", 503);
  const primary = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const fallbacks = process.env.GEMINI_FALLBACK_MODELS?.trim()
    ? process.env.GEMINI_FALLBACK_MODELS.split(",").map((m) => m.trim())
    : DEFAULT_FALLBACKS;
  const models = [...new Set([primary, ...fallbacks])].filter(Boolean);
  if (!models.every((m) => MODEL_NAME.test(m))) {
    throw new GeminiError("GEMINI_MODEL o GEMINI_FALLBACK_MODELS contienen un nombre no válido.", 500);
  }
  return { apiKey, models };
}

export async function generateAnswer(systemPrompt: string, userPrompt: string): Promise<ModelAnswer> {
  const { apiKey, models } = getConfig();
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  let lastError: GeminiError | null = null;

  for (const model of models) {
    const remaining = deadline - Date.now();
    if (remaining < MIN_ATTEMPT_MS) break;
    try {
      return await callModel(model, apiKey, systemPrompt, userPrompt, Math.min(ATTEMPT_TIMEOUT_MS, remaining));
    } catch (err) {
      if (!(err instanceof GeminiError) || !err.retryable) throw err;
      console.warn(`[gemini] ${model} falló (${err.message}); probando el siguiente modelo`);
      lastError = err;
    }
  }
  throw lastError ?? new GeminiError("El modelo tardó demasiado en responder.", 504);
}

async function callModel(
  model: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  timeoutMs: number,
): Promise<ModelAnswer> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192, // margen para los tokens de "thinking" de los modelos 3.x
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    throw new GeminiError(timedOut ? "El modelo tardó demasiado en responder." : "No se pudo contactar con el modelo.", 504, true);
  }

  if (!res.ok) {
    // El cuerpo de error de Google puede ser útil en logs, pero no se envía al cliente.
    console.error(`[gemini] ${model} HTTP ${res.status}:`, (await res.text()).slice(0, 300));
    if (res.status === 429) throw new GeminiError("Se ha alcanzado el límite de uso del modelo. Inténtalo en un momento.", 429, true);
    if (res.status >= 500) throw new GeminiError("El modelo está saturado. Inténtalo en un momento.", 503, true);
    if (res.status === 404) throw new GeminiError(`El modelo ${model} no existe.`, 502, true);
    throw new GeminiError("El modelo devolvió un error.", 502);
  }

  return parseResponse(await res.json());
}

interface GenerateContentResponse {
  promptFeedback?: { blockReason?: string };
  candidates?: { finishReason?: string; content?: { parts?: { text?: string }[] } }[];
}

function parseResponse(data: GenerateContentResponse): ModelAnswer {
  if (data.promptFeedback?.blockReason) {
    throw new GeminiError("La pregunta fue bloqueada por los filtros de seguridad.", 400);
  }
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) {
    throw new GeminiError(
      candidate?.finishReason === "SAFETY" ? "La respuesta fue bloqueada por los filtros de seguridad." : "El modelo devolvió una respuesta vacía.",
      502,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error("[gemini] JSON inválido:", text.slice(0, 300));
    throw new GeminiError("El modelo devolvió una respuesta con formato inesperado.", 502);
  }
  if (!isModelAnswer(parsed)) {
    console.error("[gemini] Esquema inesperado:", text.slice(0, 300));
    throw new GeminiError("El modelo devolvió una respuesta con formato inesperado.", 502);
  }
  return parsed;
}

function isModelAnswer(value: unknown): value is ModelAnswer {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (v.status === "answered" || v.status === "no_info" || v.status === "off_topic") &&
    typeof v.answer === "string" &&
    v.answer.trim().length > 0 &&
    Array.isArray(v.sources) &&
    v.sources.every((s) => typeof s === "string")
  );
}
