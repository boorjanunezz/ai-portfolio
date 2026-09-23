// Diagnóstico: mide la latencia de Gemini con distintas configuraciones.
// Uso: node --env-file=.env.local scripts/diagnose-gemini.mjs [modelo...]
// No imprime la API key.

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error("Falta GEMINI_API_KEY en .env.local");
  process.exit(1);
}

const models = process.argv.slice(2).length ? process.argv.slice(2) : ["gemini-3.5-flash-lite", "gemini-3.8-flash"];
const schema = {
  type: "OBJECT",
  properties: { status: { type: "STRING", enum: ["answered", "no_info", "off_topic"] }, answer: { type: "STRING" }, sources: { type: "ARRAY", items: { type: "STRING" } } },
  required: ["status", "answer", "sources"],
};

const variants = {
  "texto simple": {},
  "json + schema": { responseMimeType: "application/json", responseSchema: schema },
  "json + schema + thinking low": { responseMimeType: "application/json", responseSchema: schema, thinkingConfig: { thinkingLevel: "low" } },
  "json + schema + thinking minimal": { responseMimeType: "application/json", responseSchema: schema, thinkingConfig: { thinkingLevel: "minimal" } },
};

for (const model of models) {
  console.log(`\n== ${model}`);
  for (const [name, extra] of Object.entries(variants)) {
    const t0 = Date.now();
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: "Responde en una frase. Solo hablas del perfil de Borja." }] },
          contents: [{ role: "user", parts: [{ text: "Hola!" }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 8192, ...extra },
        }),
        signal: AbortSignal.timeout(60_000),
      });
      const body = await res.json();
      const ms = Date.now() - t0;
      if (!res.ok) {
        console.log(`  ${name.padEnd(34)} HTTP ${res.status} ${ms}ms  ${JSON.stringify(body.error?.message ?? body).slice(0, 160)}`);
        continue;
      }
      const u = body.usageMetadata ?? {};
      const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      console.log(`  ${name.padEnd(34)} ${ms}ms  thinking=${u.thoughtsTokenCount ?? 0} out=${u.candidatesTokenCount ?? 0}  ${text.slice(0, 80).replace(/\n/g, " ")}`);
    } catch (err) {
      console.log(`  ${name.padEnd(34)} ERROR ${Date.now() - t0}ms  ${err.name}: ${err.message}`);
    }
  }
}
