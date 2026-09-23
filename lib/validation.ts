import "server-only";
import { MAX_HISTORY_MESSAGES, MAX_MESSAGE_LENGTH, type ChatTurn } from "./types";

/** Validación del cuerpo de /api/chat. Devuelve datos limpios o un mensaje de error. */

const MAX_HISTORY_ITEM_LENGTH = 2000;

export type ValidationResult =
  | { ok: true; message: string; history: ChatTurn[] }
  | { ok: false; error: string };

export function validateChatRequest(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null) return { ok: false, error: "Petición inválida." };
  const { message, history } = body as Record<string, unknown>;

  if (typeof message !== "string") return { ok: false, error: "Falta el mensaje." };
  const trimmed = message.trim();
  if (!trimmed) return { ok: false, error: "El mensaje está vacío." };
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: `El mensaje supera el máximo de ${MAX_MESSAGE_LENGTH} caracteres.` };
  }

  if (history !== undefined && !Array.isArray(history)) return { ok: false, error: "Historial inválido." };
  const turns: ChatTurn[] = [];
  for (const item of (history ?? []).slice(-MAX_HISTORY_MESSAGES)) {
    const { role, content } = (item ?? {}) as Record<string, unknown>;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") {
      return { ok: false, error: "Historial inválido." };
    }
    turns.push({ role, content: content.slice(0, MAX_HISTORY_ITEM_LENGTH) });
  }

  return { ok: true, message: trimmed, history: turns };
}
