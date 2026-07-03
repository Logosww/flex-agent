import type { ElysiaWS } from 'elysia/ws';
import type { WSEnvelope } from '@/types/chat';

export function sendWsMessage(ws: ElysiaWS, message: WSEnvelope) {
  ws.send(JSON.stringify(message));
}
