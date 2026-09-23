import { NextResponse } from "next/server";
import { answerStream } from "@/lib/assistant";
import { LlmError } from "@/lib/llm-shared";
import { isRateLimited } from "@/lib/rate-limit";
import { validateChatRequest } from "@/lib/validation";
import type { ChatError, ChatEvent } from "@/lib/types";

export const runtime = "nodejs"; // necesario para leer /content con fs
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BODY_BYTES = 20_000;

function error(message: string, status: number) {
  return NextResponse.json<ChatError>({ error: message }, { status });
}

export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return error("Content-Type debe ser application/json.", 415);
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (isRateLimited(ip)) return error("Demasiadas preguntas seguidas. Espera un minuto.", 429);

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return error("Petición demasiado grande.", 413);

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return error("JSON inválido.", 400);
  }

  const input = validateChatRequest(body);
  if (!input.ok) return error(input.error, 400);

  // Respuesta en streaming: una línea JSON (ChatEvent) por evento. Ver lib/types.ts.
  const events = answerStream(input.message, input.history);
  const encoder = new TextEncoder();
  const line = (event: ChatEvent) => encoder.encode(JSON.stringify(event) + "\n");

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await events.next();
        if (done) controller.close();
        else controller.enqueue(line(value));
      } catch (err) {
        if (!(err instanceof LlmError)) console.error("[api/chat] Error inesperado:", err);
        const message = err instanceof LlmError ? err.message : "Ha ocurrido un error inesperado.";
        controller.enqueue(line({ type: "error", message }));
        controller.close();
      }
    },
    async cancel() {
      await events.return(undefined); // el visitante cerró la conexión: se corta también la llamada al modelo
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
