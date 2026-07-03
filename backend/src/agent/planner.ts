import { z } from 'zod';
import { chatCompletion } from '@/services/llm';

import type { MessageItem } from '@/types/chat';
import type { AgentPlan } from './state';

const plannerOutputSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.coerce.string(),
      title: z.string(),
      dependsOn: z.array(z.coerce.string()),
    }),
  ),
});

export async function runPlanner(
  userGoal: string,
  memoryHints: string,
  model?: string,
): Promise<AgentPlan> {
  const messages: MessageItem[] = [
    {
      role: 'system',
      content:
        '你是任务规划器。只输出一个 JSON 对象，键为 nodes，值为数组。\n' +
        '每项含 id（字符串）、title、dependsOn（依赖 id 的字符串数组，无依赖则为 []）。必须为有向无环图。\n' +
        '步骤尽量少；若对话历史或工具结果已含所需信息，用单步直接完成，勿拆成查询与复述等重复步骤。',
    },
    {
      role: 'user',
      content: `用户目标：\n${userGoal}\n\n可参考的相似任务摘要（可能没有）：\n${memoryHints}`,
    },
  ];
  const msg = await chatCompletion(messages, model, 0.2);
  const raw = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content ?? '');
  const jsonStart = raw.indexOf('{');
  const jsonEnd = raw.lastIndexOf('}');
  const slice = jsonStart >= 0 && jsonEnd > jsonStart ? raw.slice(jsonStart, jsonEnd + 1) : raw;
  const parsed = plannerOutputSchema.parse(JSON.parse(slice));

  return { nodes: parsed.nodes };
}
