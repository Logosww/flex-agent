import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  tool,
  type UIMessage,
} from 'ai';
import { z } from 'zod';
import { flexAgent } from '@/lib/provider';
import { registerPlanWriter, unregisterPlanWriter } from '@/lib/ws/plan-stream';
import { formUIDescriptionSchema } from '@/types/form-ui-schema';
import type { ChatUIMessage } from '@/types/chat-ui';

export const maxDuration = 60;

const requestBodySchema = z.object({
  messages: z.array(z.unknown()),
  session_id: z.string().optional(),
  enable_planning: z.boolean().optional(),
});

const chatTools = {
  collect_user_input: tool({
    description: '当需要用户以结构化表单补充信息时调用。参数为表单 UI 描述。',
    inputSchema: formUIDescriptionSchema,
  }),
  get_weather: tool({
    description: '获取指定城市的天气',
    inputSchema: z.object({ city: z.string() }),
  }),
  get_current_time: tool({
    description: '获取当前时间',
    inputSchema: z.object({}),
  }),
};

export async function POST(req: Request) {
  const json: unknown = await req.json();
  const parsed = requestBodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: '参数无效' }, { status: 400 });
  }

  const { messages, session_id, enable_planning } = parsed.data;
  const enablePlanning = enable_planning ?? process.env.NEXT_PUBLIC_ENABLE_PLANNING === 'true';

  const stream = createUIMessageStream<ChatUIMessage>({
    execute: async ({ writer }) => {
      if (enablePlanning && session_id) {
        registerPlanWriter(session_id, (data) => {
          writer.write({
            type: 'data-plan',
            id: 'plan',
            data,
          });
        });
      }

      const result = streamText({
        model: flexAgent(process.env.MODEL_ID ?? 'gemini-2.5-flash'),
        system:
          '你是一个有用的 AI 助手。请用中文回答用户问题；进行深度思考与推理（reasoning_content）时也请使用中文，除非用户使用其他语言。在 reasoning_content 中不得暴露内部工具/API 函数名、参数名或实现细节，请改用面向用户的自然语言描述你的意图。',
        messages: await convertToModelMessages(messages as UIMessage[]),
        tools: chatTools,
        providerOptions: {
          'flex-agent': {
            ...(enablePlanning && session_id ? { sessionId: session_id } : {}),
            enablePlanning,
          },
        },
      });

      writer.merge(result.toUIMessageStream({ sendReasoning: true }));
    },
    onFinish: () => {
      if (session_id) unregisterPlanWriter(session_id);
    },
  });

  return createUIMessageStreamResponse({ stream });
}
