import { formUIDescriptionSchema } from '@/types/form-ui-schema';
import type { ChatUIMessage } from '@/types/chat-ui';

export function parsePendingCollect(lastMessage: ChatUIMessage | undefined) {
  if (!lastMessage || lastMessage.role !== 'assistant') return null;
  for (const part of lastMessage.parts) {
    const isCollect =
      part.type === 'dynamic-tool' &&
      part.toolName === 'collect_user_input' &&
      part.state === 'input-available';
    const isStaticCollect =
      part.type === 'tool-collect_user_input' && part.state === 'input-available';
    if (!isCollect && !isStaticCollect) continue;

    const raw = isStaticCollect ? (part as { input?: unknown }).input : part.input;
    const normalized =
      typeof raw === 'string'
        ? (() => {
            try {
              return JSON.parse(raw) as unknown;
            } catch {
              return raw;
            }
          })()
        : raw;
    const parsed = formUIDescriptionSchema.safeParse(normalized);
    if (parsed.success) {
      return { toolCallId: part.toolCallId, description: parsed.data };
    }
  }
  return null;
}
