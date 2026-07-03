import type { LanguageModelV3StreamPart } from '@ai-sdk/provider';

export const COLLECT_USER_INPUT_TOOL = 'collect_user_input';

type CollectStreamContext = {
  controller: ReadableStreamDefaultController<LanguageModelV3StreamPart>;
  modelId: string;
  textId: string;
  textStarted: boolean;
  settle: (fn: () => void) => void;
  closeWs: () => void;
};

type CollectSession = {
  ws: WebSocket;
  toolCallId: string;
  stream: CollectStreamContext;
};

let activeSession: CollectSession | null = null;

export function registerCollectSession(session: CollectSession) {
  activeSession = session;
}

export function clearCollectSession(ws?: WebSocket) {
  if (!activeSession) return;
  if (ws && activeSession.ws !== ws) return;
  activeSession = null;
}

export function getActiveCollectToolCallId(): string | null {
  return activeSession?.toolCallId ?? null;
}

export function submitCollectUserInput(
  toolCallId: string,
  values: Record<string, string | number | boolean>,
): void {
  const session = activeSession;
  if (!session || session.toolCallId !== toolCallId) {
    throw new Error('无匹配的挂起表单');
  }
  if (session.ws.readyState !== WebSocket.OPEN) {
    throw new Error('WebSocket 已断开');
  }

  session.ws.send(
    JSON.stringify({
      type: 'form_submit',
      data: { tool_call_id: toolCallId, values },
    }),
  );
}
