export interface ChatRequest {
  message: string;
}

export interface ChatResponse {
  response: string;
}

export type ChatMessageRole =
  | 'usuario'
  | 'asistente';

export interface ChatMessage {
  id: number;
  role: ChatMessageRole;
  text: string;
  createdAt: Date;
}
