import "server-only";
import type { AnswerStatus } from "./types";

/** Formato de salida común a todos los proveedores y su validación. */

export interface ModelAnswer {
  status: AnswerStatus;
  answer: string;
  sources: string[]; // ids de chunk
}

/** Error con un mensaje apto para mostrar al usuario y un status HTTP. */
export class LlmError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number,
    /** true si otro modelo podría funcionar (saturación, cuota, timeout, formato). */
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "LlmError";
  }
}

/** Traduce errores HTTP/red de cualquier proveedor a LlmError. */
export function httpError(provider: string, model: string, status: number, body: string): LlmError {
  // El cuerpo de error puede ser útil en logs, pero no se envía al cliente.
  console.error(`[llm] ${provider}/${model} HTTP ${status}:`, body.slice(0, 300));
  if (status === 429) return new LlmError("Se ha alcanzado el límite de uso del modelo. Inténtalo en un momento.", 429, true);
  if (status >= 500) return new LlmError("El modelo está saturado. Inténtalo en un momento.", 503, true);
  if (status === 404) return new LlmError(`El modelo ${model} no existe.`, 502, true);
  return new LlmError("El modelo devolvió un error.", 502);
}

export function networkError(err: unknown): LlmError {
  const timedOut = err instanceof Error && err.name === "TimeoutError";
  return new LlmError(timedOut ? "El modelo tardó demasiado en responder." : "No se pudo contactar con el modelo.", 504, true);
}

/** Parsea y valida el JSON del modelo. Un formato inesperado es retryable: otro modelo puede responder bien. */
export function parseModelAnswer(text: string): ModelAnswer {
  if (!text) throw new LlmError("El modelo devolvió una respuesta vacía.", 502, true);
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(text));
  } catch {
    console.error("[llm] JSON inválido:", text.slice(0, 300));
    throw new LlmError("El modelo devolvió una respuesta con formato inesperado.", 502, true);
  }
  if (!isModelAnswer(parsed)) {
    console.error("[llm] Esquema inesperado:", text.slice(0, 300));
    throw new LlmError("El modelo devolvió una respuesta con formato inesperado.", 502, true);
  }
  return parsed;
}

/** Algunos modelos (Gemma) envuelven el JSON en ```json ... ``` pese a pedir JSON puro. */
function extractJson(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start >= 0 && end > start ? text.slice(start, end + 1) : text;
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
