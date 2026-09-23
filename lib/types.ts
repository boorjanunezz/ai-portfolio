// Tipos compartidos entre cliente y servidor. Solo tipos y constantes: nada de secretos.

export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_HISTORY_MESSAGES = 6;

export type Role = "user" | "assistant";

export interface ChatTurn {
  role: Role;
  content: string;
}

export interface ChatRequest {
  message: string;
  history?: ChatTurn[];
}

export interface Source {
  file: string;
}

/** answered: respuesta basada en documentos · no_info: sobre Borja pero sin datos · off_topic: no trata sobre Borja */
export type AnswerStatus = "answered" | "no_info" | "off_topic";

/**
 * /api/chat responde en streaming con NDJSON (un objeto JSON por línea):
 *   delta → trozo de texto de la respuesta
 *   reset → el modelo falló a mitad y otro empieza de cero: borrar lo recibido
 *   done  → fin, con fuentes y estado
 *   error → fin con error (mensaje apto para el usuario)
 */
export type ChatEvent =
  | { type: "delta"; text: string }
  | { type: "reset" }
  | { type: "done"; sources: Source[]; status: AnswerStatus }
  | { type: "error"; message: string };

/** Errores de validación (400/413/415/429) que se devuelven antes de empezar el stream. */
export interface ChatError {
  error: string;
}
