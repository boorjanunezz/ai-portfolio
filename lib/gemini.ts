import "server-only";
import { httpError, LlmError, networkError, parseModelAnswer, type ModelAnswer } from "./model-output";

/** Llamada a la API REST de Gemini (sin SDK). Sirve también para Gemma, que usa la misma API. */

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

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

interface GenerateContentResponse {
  promptFeedback?: { blockReason?: string };
  candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[];
}

export async function callGemini(
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
    throw networkError(err);
  }
  if (!res.ok) throw httpError("gemini", model, res.status, await res.text());

  const data = (await res.json()) as GenerateContentResponse;
  if (data.promptFeedback?.blockReason) {
    throw new LlmError("La pregunta fue bloqueada por los filtros de seguridad.", 400);
  }
  const candidate = data.candidates?.[0];
  if (candidate?.finishReason === "SAFETY") {
    throw new LlmError("La respuesta fue bloqueada por los filtros de seguridad.", 502);
  }
  const text = candidate?.content?.parts?.filter((p) => !p.thought).map((p) => p.text ?? "").join("") ?? "";
  return parseModelAnswer(text);
}
