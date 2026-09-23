import { NextResponse } from "next/server";
import { answerQuestion } from "@/lib/assistant";
import { GeminiError } from "@/lib/gemini";
import { isRateLimited } from "@/lib/rate-limit";
import { validateChatRequest } from "@/lib/validation";
import type { ChatError, ChatResponse } from "@/lib/types";

export const runtime = "nodejs"; // necesario para leer /content con fs
export const dynamic = "force-dynamic";
export const maxDuration = 30;

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

  try {
    const response = await answerQuestion(input.message, input.history);
    return NextResponse.json<ChatResponse>(response);
  } catch (err) {
    if (err instanceof GeminiError) return error(err.message, err.httpStatus);
    console.error("[api/chat] Error inesperado:", err);
    return error("Ha ocurrido un error inesperado.", 500);
  }
}
