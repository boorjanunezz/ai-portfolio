import "server-only";

/** Piezas comunes a los proveedores de LLM: errores y lectura de streams SSE. */

/** Error con un mensaje apto para mostrar al usuario y un status HTTP. */
export class LlmError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number,
    /** true si otro modelo podría funcionar (saturación, cuota, timeout, respuesta vacía). */
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "LlmError";
  }
}

/** Traduce errores HTTP de cualquier proveedor a LlmError. */
export function httpError(provider: string, model: string, status: number, body: string): LlmError {
  // El cuerpo de error puede ser útil en logs, pero no se envía al cliente.
  console.error(`[llm] ${provider}/${model} HTTP ${status}:`, body.slice(0, 300));
  if (status === 429) return new LlmError("Se ha alcanzado el límite de uso del modelo. Inténtalo en un momento.", 429, true);
  if (status >= 500) return new LlmError("El modelo está saturado. Inténtalo en un momento.", 503, true);
  if (status === 404) return new LlmError(`El modelo ${model} no existe.`, 502, true);
  return new LlmError("El modelo devolvió un error.", 502);
}

export function networkError(signal?: AbortSignal): LlmError {
  return signal?.aborted
    ? new LlmError("El modelo tardó demasiado en responder.", 504, true)
    : new LlmError("No se pudo contactar con el modelo.", 504, true);
}

/** Recorre un stream Server-Sent Events y devuelve el contenido de cada línea "data:". */
export async function* readSse(body: ReadableStream<Uint8Array>, signal?: AbortSignal): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await reader.read();
      } catch {
        throw networkError(signal);
      }
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.startsWith("data:")) yield line.slice(5).trim();
      }
    }
    if (buffer.startsWith("data:")) yield buffer.slice(5).trim();
  } finally {
    reader.releaseLock();
  }
}

/** Parsea el JSON de un evento SSE; un evento corrupto se ignora en vez de romper la respuesta. */
export function parseEvent<T>(data: string): T | null {
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}
