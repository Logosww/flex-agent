import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export type MessageItem = ChatCompletionMessageParam;

export interface ChatRequest {
  messages: MessageItem[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatResponse {
  role: string;
  content: string;
  model: string;
}

/**
 * WebSocket 双向协议（仅 `/api/chat/ws`，无 HTTP POST /api/chat）
 *
 * Client → Server (upstream)
 *   { "type": "chat",        "data": { "messages": [...], ... } }
 *   { "type": "form_submit", "data": { "form_id": "xxx", "values": {...} } }
 *
 * Server → Client (downstream)
 *   { "type": "token",           "data": { "content": "..." } }
 *   { "type": "reasoning_token", "data": { "content": "..." } }
 *   { "type": "plan",            "data": { "steps": [...] } }
 *   { "type": "done",            "data": { "model": "..." } }
 *   { "type": "error",           "data": { "message": "..." } }
 *   { "type": "ui",              "data": { "component": {...} } }
 */

export type PlanStepStatus = 'pending' | 'running' | 'done' | 'failed';

export interface PlanStepPayload {
  id: string;
  title: string;
  status: PlanStepStatus;
  ordinal: number;
}

export interface PlanPayload {
  steps: PlanStepPayload[];
}

export type WSDownstreamMessage =
  | { type: 'token'; data: { content: string } }
  | { type: 'reasoning_token'; data: { content: string } }
  | { type: 'plan'; data: PlanPayload }
  | { type: 'done'; data: { model: string } }
  | { type: 'error'; data: { message: string } }
  | {
      type: 'tool_call';
      data: {
        calls: Array<{ id: string; name: string; arguments: string }>;
      };
    }
  | {
      type: 'tool_result';
      data: {
        tool_call_id: string;
        name: string;
        result: unknown;
      };
    };

export type WSEnvelope = WSDownstreamMessage;

export interface WSUpstreamChat {
  messages: MessageItem[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  session_id?: string;
  enable_planning?: boolean;
}

export interface WSUpstreamFormSubmit {
  form_id: string;
  values: Record<string, unknown>;
}
