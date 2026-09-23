import "server-only";
import { httpError, LlmError, networkError, parseEvent, readSse } from "./llm-shared";

/** Streaming de la API REST de Gemini (sin SDK). Sirve también para Gemma, que usa la misma API. */

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

interface StreamChunk {
  promptFeedback?: { blockReason?: string };
  candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[];
}

export async function* streamGemini(
  model: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  signal: AbortSignal,
): AsyncGenerator<string> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/models/${model}:streamGenerateContent?alt=sse`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192, // margen para los tokens de "thinking" de los modelos 3.x
        },
      }),
      signal,
      cache: "no-store",
    });
  } catch {
    throw networkError(signal);
  }
  if (!res.ok || !res.body) throw httpError("gemini", model, res.status, await res.text());

  for await (const data of readSse(res.body, signal)) {
    const chunk = parseEvent<StreamChunk>(data);
    if (!chunk) continue;
    if (chunk.promptFeedback?.blockReason) {
      throw new LlmError("La pregunta fue bloqueada por los filtros de seguridad.", 400);
    }
    const candidate = chunk.candidates?.[0];
    if (candidate?.finishReason === "SAFETY") {
      throw new LlmError("La respuesta fue bloqueada por los filtros de seguridad.", 502);
    }
    // Las partes "thought" son el razonamiento interno de los modelos 3.x: no se muestran.
    const text = candidate?.content?.parts?.filter((p) => !p.thought).map((p) => p.text ?? "").join("") ?? "";
    if (text) yield text;
  }
}
