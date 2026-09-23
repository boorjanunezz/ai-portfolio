import "server-only";
import type { AnswerStatus } from "./types";

/**
 * Cliente mínimo de la API REST de Gemini (sin SDK).
 * Modelo y clave llegan por variables de entorno: GEMINI_MODEL y GEMINI_API_KEY.
 */

const DEFAULT_MODEL = "gemini-2.5-flash";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const TIMEOUT_MS = 25_000;

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

function getConfig() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new GeminiError("El asistente no está configurado (falta GEMINI_API_KEY).", 503);
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  if (!/^[\w.\-]+$/.test(model)) throw new GeminiError("GEMINI_MODEL no es un nombre de modelo válido.", 500);
  return { apiKey, model };
}

export async function generateAnswer(systemPrompt: string, userPrompt: string): Promise<ModelAnswer> {
  const { apiKey, model } = getConfig();

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
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    throw new GeminiError(timedOut ? "El modelo tardó demasiado en responder." : "No se pudo contactar con el modelo.", 504);
  }

  if (!res.ok) {
    // El cuerpo de error de Google puede ser útil en logs, pero no se envía al cliente.
    console.error(`[gemini] HTTP ${res.status}:`, (await res.text()).slice(0, 500));
    if (res.status === 429) throw new GeminiError("Se ha alcanzado el límite de uso del modelo. Inténtalo en un momento.", 429);
    if (res.status === 404) throw new GeminiError("El modelo configurado en GEMINI_MODEL no existe.", 502);
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
