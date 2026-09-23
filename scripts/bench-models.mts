/**
 * Benchmark de modelos con el prompt REAL del asistente (retrieval incluido), en streaming.
 * Mide el tiempo hasta el primer token y el total. Llamadas secuenciales; no imprime las keys.
 *
 *   npx tsx --conditions=react-server --env-file=.env.local scripts/bench-models.mts
 *   BENCH_MODELS="gemini:gemma-4-26b-a4b-it,groq:openai/gpt-oss-120b" npx tsx ...
 */
const { retrieve } = await import("../lib/retrieval");
const { buildUserPrompt, SYSTEM_PROMPT } = await import("../lib/prompts");
const { streamGemini } = await import("../lib/gemini");
const { streamGroq } = await import("../lib/groq");

const MODELS = (process.env.BENCH_MODELS ?? "gemini:gemma-4-26b-a4b-it,gemini:gemini-3.5-flash,groq:openai/gpt-oss-120b").split(",");
const QUESTIONS = ["¿Qué certificaciones tiene?", "¿Qué es Docker?", "What languages does he speak?"];
const TIMEOUT = 30_000;

for (const spec of MODELS) {
  const [provider, model] = spec.split(/:(.+)/) as ["gemini" | "groq", string];
  const key = provider === "groq" ? process.env.GROQ_API_KEY : process.env.GEMINI_API_KEY;
  if (!key) {
    console.log(`${spec.padEnd(34)} (sin API key)`);
    continue;
  }
  const results: string[] = [];
  for (const q of QUESTIONS) {
    const t0 = Date.now();
    let first = 0;
    let text = "";
    try {
      const stream = (provider === "groq" ? streamGroq : streamGemini)(model, key, SYSTEM_PROMPT, buildUserPrompt(q, retrieve(q), ""), AbortSignal.timeout(TIMEOUT));
      for await (const chunk of stream) {
        first ||= Date.now() - t0;
        text += chunk;
      }
      const marker = /\[\[\s*fuentes/i.test(text) ? "" : " (sin marca)";
      results.push(`${first}/${Date.now() - t0}ms${marker}`);
    } catch (err) {
      results.push(err instanceof Error ? err.message.slice(0, 30) : "error");
    }
  }
  console.log(`${spec.padEnd(34)} ${results.join("  ")}`);
}
