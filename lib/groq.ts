import "server-only";
import { httpError, networkError, parseEvent, readSse } from "./llm-shared";

/** Streaming de Groq (API compatible con OpenAI). Se usa como respaldo cuando Gemini está saturado. */

const API_URL = "https://api.groq.com/openai/v1/chat/completions";

interface StreamChunk {
  // gpt-oss envía su razonamiento en delta.reasoning: se ignora, solo se muestra content.
  choices?: { delta?: { content?: string | null } }[];
}

export async function* streamGroq(
  model: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  signal: AbortSignal,
): AsyncGenerator<string> {
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
        stream: true,
      }),
      signal,
      cache: "no-store",
    });
  } catch {
    throw networkError(signal);
  }
  if (!res.ok || !res.body) throw httpError("groq", model, res.status, await res.text());

  for await (const data of readSse(res.body, signal)) {
    if (data === "[DONE]") return;
    const text = parseEvent<StreamChunk>(data)?.choices?.[0]?.delta?.content;
    if (text) yield text;
  }
}
