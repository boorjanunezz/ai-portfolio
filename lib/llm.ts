import "server-only";
import { streamGemini } from "./gemini";
import { streamGroq } from "./groq";
import { LlmError } from "./llm-shared";

/**
 * Elige proveedor y modelo con respaldo automático, en streaming.
 *
 * Las capas gratuitas se saturan (503), agotan cuota (429) o tardan de 1 a 60 s.
 * Si un modelo falla o no empieza a responder a tiempo se prueba el siguiente,
 * siempre dentro del límite de la función de Vercel:
 *
 *   GEMINI_MODEL → GROQ_MODEL (si hay GROQ_API_KEY) → GEMINI_FALLBACK_MODELS
 *
 * Si un modelo falla después de empezar a escribir, se emite "reset" y el
 * siguiente empieza de cero.
 */

const DEFAULTS = {
  geminiModel: "gemma-4-26b-a4b-it",
  geminiFallbacks: ["gemini-3.5-flash", "gemini-3.5-flash-lite"],
  groqModel: "openai/gpt-oss-120b",
};
const FIRST_TOKEN_TIMEOUT_MS = 20_000; // por modelo: tiempo máximo hasta el primer trozo de texto
const TOTAL_BUDGET_MS = 55_000; // < maxDuration (60 s) de app/api/chat/route.ts
const MIN_ATTEMPT_MS = 4_000; // no merece la pena empezar un intento con menos margen
const RETRY_DELAY_MS = 1_000;
const MODEL_NAME = /^[\w.\-/]+$/;

export type LlmEvent = { type: "delta"; text: string } | { type: "reset" };

type Provider = "gemini" | "groq";
interface Candidate {
  provider: Provider;
  model: string;
  apiKey: string;
}

const STREAMERS = { gemini: streamGemini, groq: streamGroq };
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function env(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

function buildChain(): Candidate[] {
  const geminiKey = env("GEMINI_API_KEY");
  const groqKey = env("GROQ_API_KEY");
  if (!geminiKey && !groqKey) {
    throw new LlmError("El asistente no está configurado (falta GEMINI_API_KEY).", 503);
  }

  const chain: Candidate[] = [];
  const addGemini = (model: string) => geminiKey && chain.push({ provider: "gemini", model, apiKey: geminiKey });
  addGemini(env("GEMINI_MODEL") ?? DEFAULTS.geminiModel);
  if (groqKey) chain.push({ provider: "groq", model: env("GROQ_MODEL") ?? DEFAULTS.groqModel, apiKey: groqKey });
  const fallbacks = env("GEMINI_FALLBACK_MODELS")?.split(",").map((m) => m.trim()) ?? DEFAULTS.geminiFallbacks;
  fallbacks.filter(Boolean).forEach(addGemini);

  const unique = chain.filter((c, i) => chain.findIndex((o) => o.provider === c.provider && o.model === c.model) === i);
  if (!unique.every((c) => MODEL_NAME.test(c.model))) {
    throw new LlmError("Alguna variable de modelo contiene un nombre no válido.", 500);
  }
  return unique;
}

export async function* streamAnswer(systemPrompt: string, userPrompt: string): AsyncGenerator<LlmEvent> {
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  let lastError: LlmError | null = null;
  // Un 503 ("high demand") suele ser momentáneo: cada modelo saturado se reintenta una vez al final.
  const queue = buildChain().map((candidate) => ({ candidate, retry: false }));

  while (queue.length) {
    const { candidate, retry } = queue.shift()!;
    if (retry) await sleep(RETRY_DELAY_MS);
    const remaining = deadline - Date.now();
    if (remaining < MIN_ATTEMPT_MS) break;

    const { provider, model, apiKey } = candidate;
    const controller = new AbortController();
    const firstTokenTimer = setTimeout(() => controller.abort(), Math.min(FIRST_TOKEN_TIMEOUT_MS, remaining));
    const deadlineTimer = setTimeout(() => controller.abort(), remaining);
    let started = false;
    try {
      for await (const text of STREAMERS[provider](model, apiKey, systemPrompt, userPrompt, controller.signal)) {
        if (!started) {
          clearTimeout(firstTokenTimer);
          started = true;
        }
        yield { type: "delta", text };
      }
      if (!started) throw new LlmError("El modelo devolvió una respuesta vacía.", 502, true);
      return;
    } catch (err) {
      const error = err instanceof LlmError ? err : controller.signal.aborted ? new LlmError("El modelo tardó demasiado en responder.", 504, true) : null;
      if (!error) throw err;
      if (!error.retryable) throw error;
      console.warn(`[llm] ${provider}/${model} falló (${error.message}); probando el siguiente modelo`);
      lastError = error;
      if (started) yield { type: "reset" };
      if (error.httpStatus === 503 && !retry) queue.push({ candidate, retry: true });
    } finally {
      clearTimeout(firstTokenTimer);
      clearTimeout(deadlineTimer);
      controller.abort(); // si el consumidor corta (cliente desconectado), se cierra la conexión con el modelo
    }
  }
  throw lastError ?? new LlmError("El modelo tardó demasiado en responder.", 504);
}
