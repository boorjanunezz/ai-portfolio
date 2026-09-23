/**
 * Benchmark de modelos con el prompt REAL del asistente (retrieval incluido).
 * Uso: npx tsx --conditions=react-server --env-file=.env.local scripts/bench-models.mts
 * Llamadas secuenciales; no imprime la API key.
 */
const { retrieve } = await import("../lib/retrieval");
const { buildUserPrompt, SYSTEM_PROMPT } = await import("../lib/prompts");

const key = process.env.GEMINI_API_KEY!;
const MODELS = (process.env.BENCH_MODELS ?? "gemini-3.5-flash-lite,gemini-3.5-flash,gemini-3.1-flash-lite").split(",");
const ALL_THINKING: Record<string, object | undefined> = { default: undefined, low: { thinkingLevel: "low" }, minimal: { thinkingLevel: "minimal" } };
const THINKING = Object.fromEntries(Object.entries(ALL_THINKING).filter(([k]) => (process.env.BENCH_THINKING ?? "default,low,minimal").split(",").includes(k)));
const QUESTIONS = ["¿Qué proyectos de IA ha desarrollado?", "¿Qué es Docker?", "What technologies does he use?"];
const TIMEOUT = 25_000;

const schema = {
  type: "OBJECT",
  properties: { status: { type: "STRING", enum: ["answered", "no_info", "off_topic"] }, answer: { type: "STRING" }, sources: { type: "ARRAY", items: { type: "STRING" } } },
  required: ["status", "answer", "sources"],
};

for (const model of MODELS) {
  for (const [label, thinkingConfig] of Object.entries(THINKING)) {
    const results: string[] = [];
    for (const q of QUESTIONS) {
      const t0 = Date.now();
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: "user", parts: [{ text: buildUserPrompt(q, retrieve(q), "") }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 8192, responseMimeType: "application/json", responseSchema: schema, ...(thinkingConfig ? { thinkingConfig } : {}) },
          }),
          signal: AbortSignal.timeout(TIMEOUT),
        });
        const ms = Date.now() - t0;
        if (!res.ok) {
          results.push(`HTTP${res.status}(${ms})`);
          continue;
        }
        const body = await res.json();
        const text = body.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
        const status = (() => { try { return JSON.parse(text).status; } catch { return "badjson"; } })();
        results.push(`${ms}ms:${status}`);
      } catch {
        results.push(`TIMEOUT`);
      }
    }
    console.log(`${model.padEnd(24)} ${label.padEnd(8)} ${results.join("  ")}`);
  }
}
