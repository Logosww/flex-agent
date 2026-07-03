import type { AgentSessionState } from '@/agent/state';
import type { StepContext } from '@/agent/types';
import type { MessageItem, WSUpstreamChat } from '@/types/chat';

export type PendingCollectState = {
  messages: MessageItem[];
  req: WSUpstreamChat;
  toolCallId: string;
  resume: () => Promise<void>;
  agentState?: AgentSessionState;
  stepContext?: StepContext;
};

const pendingByToolCallId = new Map<string, PendingCollectState>();
const toolCallOriginWs = new Map<string, string>();

export function getPendingCollect(toolCallId: string) {
  return pendingByToolCallId.get(toolCallId);
}

export function registerPendingCollect(
  toolCallId: string,
  wsId: string,
  state: PendingCollectState,
) {
  pendingByToolCallId.set(toolCallId, state);
  toolCallOriginWs.set(toolCallId, wsId);
}

export function clearPendingCollect(toolCallId: string) {
  pendingByToolCallId.delete(toolCallId);
  toolCallOriginWs.delete(toolCallId);
}

export function cleanupPendingCollectForWs(wsId: string) {
  for (const [toolCallId, originId] of toolCallOriginWs.entries()) {
    if (originId === wsId) {
      pendingByToolCallId.delete(toolCallId);
      toolCallOriginWs.delete(toolCallId);
    }
  }
}
