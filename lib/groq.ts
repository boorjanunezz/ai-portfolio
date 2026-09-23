import "server-only";
import { httpError, networkError, parseModelAnswer, type ModelAnswer } from "./model-output";

/** Llamada a Groq (API compatible con OpenAI). Se usa como respaldo cuando Gemini está saturado. */

const API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Groq en modo strict exige additionalProperties: false y todos los campos en required.
const RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "assistant_answer",
    strict: true,
    schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["answered", "no_info", "off_topic"] },
        answer: { type: "string" },
        sources: { type: "array", items: { type: "string" } },
      },
      required: ["status", "answer", "sources"],
      additionalProperties: false,
    },
  },
};

interface ChatCompletionResponse {
  choices?: { message?: { content?: string | null } }[];
}

export async function callGroq(
  model: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  timeoutMs: number,
): Promise<ModelAnswer> {
  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_completion_tokens: 4096,
        reasoning_effort: "low", // gpt-oss razona antes de responder; "low" basta y es más rápido
        response_format: RESPONSE_FORMAT,
      }),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (err) {
    throw networkError(err);
  }
  if (!res.ok) throw httpError("groq", model, res.status, await res.text());

  const data = (await res.json()) as ChatCompletionResponse;
  return parseModelAnswer(data.choices?.[0]?.message?.content ?? "");
}
