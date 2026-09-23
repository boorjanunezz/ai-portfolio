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

export interface ChatResponse {
  answer: string;
  sources: Source[];
  status: AnswerStatus;
}

export interface ChatError {
  error: string;
}
