import { TOOL_REGISTRY } from '@/tools';
import type { MessageItem } from '@/types/chat';

const toolsSchema = [...TOOL_REGISTRY.values()].map((t) => t.schema);

export function getAllToolsSchema() {
  return toolsSchema;
}

export function getToolsForStep(allowedNames: Set<string>) {
  return toolsSchema.filter((tool) => {
    if (tool.type !== 'function') return false;
    return allowedNames.has(tool.function.name);
  });
}

export function augmentMessagesForExecutor(
  base: MessageItem[],
  stepTitle: string,
  ordinal: number,
  total: number,
): MessageItem[] {
  const steer: MessageItem = {
    role: 'system',
    content:
      `当前为第 ${ordinal}/${total} 步，仅围绕以下子目标行动，不要跳到未完成的后续步骤：` +
      stepTitle +
      '。若对话历史或工具结果中已有完成本子目标所需的信息，直接基于已有信息回答，勿重复收集。',
  };

  return [steer, ...base];
}

export function getAllToolNames(): Set<string> {
  return new Set(
    toolsSchema.filter((tool) => tool.type === 'function').map((tool) => tool.function.name),
  );
}
