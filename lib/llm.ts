import "server-only";
import { callGemini } from "./gemini";
import { callGroq } from "./groq";
import { LlmError, type ModelAnswer } from "./model-output";

/**
 * Elige proveedor y modelo con respaldo automático.
 *
 * Las capas gratuitas se saturan (503), agotan cuota (429) o tardan de 1 a 60 s.
 * Si un modelo falla o tarda demasiado se prueba el siguiente de la cadena,
 * siempre dentro del límite de tiempo de la función de Vercel:
 *
 *   GEMINI_MODEL → GROQ_MODEL (si hay GROQ_API_KEY) → GEMINI_FALLBACK_MODELS
 */

const DEFAULTS = {
  geminiModel: "gemma-4-26b-a4b-it",
  geminiFallbacks: ["gemini-3.5-flash", "gemini-3.5-flash-lite"],
  groqModel: "openai/gpt-oss-120b",
};
const ATTEMPT_TIMEOUT_MS = 25_000; // por modelo
const TOTAL_BUDGET_MS = 52_000; // < maxDuration (60 s) de app/api/chat/route.ts
const MIN_ATTEMPT_MS = 4_000; // no merece la pena empezar un intento con menos margen
const RETRY_DELAY_MS = 1_000;
const MODEL_NAME = /^[\w.\-/]+$/;

type Provider = "gemini" | "groq";
interface Candidate {
  provider: Provider;
  model: string;
  apiKey: string;
}

const CALLERS = { gemini: callGemini, groq: callGroq };
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

export async function generateAnswer(systemPrompt: string, userPrompt: string): Promise<ModelAnswer> {
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
    try {
      return await CALLERS[provider](model, apiKey, systemPrompt, userPrompt, Math.min(ATTEMPT_TIMEOUT_MS, remaining));
    } catch (err) {
      if (!(err instanceof LlmError) || !err.retryable) throw err;
      console.warn(`[llm] ${provider}/${model} falló (${err.message}); probando el siguiente modelo`);
      lastError = err;
      if (err.httpStatus === 503 && !retry) queue.push({ candidate, retry: true });
    }
  }
  throw lastError ?? new LlmError("El modelo tardó demasiado en responder.", 504);
}
