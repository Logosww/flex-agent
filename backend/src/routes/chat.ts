import { Elysia } from 'elysia';
import { runAgentPlanLoop } from '@/agent/orchestrator';
import {
  cleanupPendingCollectForWs,
  clearPendingCollect,
  getPendingCollect,
} from '@/agent/pending-collect';
import { runWsStreamAgentLoop } from '@/agent/stream-core';
import { COLLECT_USER_INPUT } from '@/tools/collect-user-input';
import { formSubmitOutputSchema } from '@/tools/collect-user-input/type';
import { releaseConnectionGui } from '@/tools/gui/session';
import { sendWsMessage } from '@/ws/send';
import type { WSUpstreamChat } from '@/types/chat';
import type { ElysiaWS } from 'elysia/ws';

function parseChatPayload(data: Record<string, unknown>): WSUpstreamChat | null {
  if (!Array.isArray(data.messages)) return null;
  return {
    messages: data.messages as WSUpstreamChat['messages'],
    model: data.model as string | undefined,
    temperature: (data.temperature as number) ?? 0.7,
    max_tokens: data.max_tokens as number | undefined,
    session_id: data.session_id as string | undefined,
    enable_planning: data.enable_planning as boolean | undefined,
  };
}

async function handleStreamChat(ws: ElysiaWS, data: Record<string, unknown>) {
  const req = parseChatPayload(data);
  if (!req) throw new Error('参数解析失败');

  const messages = [...req.messages];
  if (req.enable_planning && req.session_id) {
    await runAgentPlanLoop(ws, messages, req);
    return;
  }
  await runWsStreamAgentLoop(ws, messages, req);
}

export const chatRoute = new Elysia({ prefix: '/api/chat' }).ws('/ws', {
  open(ws) {
    console.log(`WS connected: ${ws.id}`);
  },
  async message(ws, raw) {
    try {
      const msg = typeof raw === 'string' ? JSON.parse(raw) : (raw as Record<string, unknown>);
      const type: string = (msg.type as string) ?? '';
      const data: Record<string, unknown> = (msg.data as Record<string, unknown>) ?? {};

      switch (type) {
        case 'chat': {
          await handleStreamChat(ws, data);
          break;
        }
        case 'form_submit': {
          const toolCallId = (data.tool_call_id as string) ?? '';
          const pending = getPendingCollect(toolCallId);
          if (!pending) {
            sendWsMessage(ws, {
              type: 'error',
              data: { message: '当前没有等待中的表单提交' },
            });
            break;
          }
          const valuesRaw = (data.values as Record<string, unknown>) ?? Object.create(null);
          const { success, data: parsedData } = formSubmitOutputSchema.safeParse({
            values: valuesRaw,
          });
          if (!success || toolCallId !== pending.toolCallId) {
            sendWsMessage(ws, {
              type: 'error',
              data: { message: '表单值校验不合法或 tool_call_id 不匹配' },
            });
            break;
          }
          clearPendingCollect(toolCallId);
          pending.messages.push({
            role: 'tool',
            tool_call_id: toolCallId,
            content: JSON.stringify(parsedData),
          });
          sendWsMessage(ws, {
            type: 'tool_result',
            data: {
              tool_call_id: toolCallId,
              name: COLLECT_USER_INPUT,
              result: parsedData,
            },
          });
          await pending.resume();
          break;
        }
        default:
          ws.send(
            JSON.stringify({
              type: 'error',
              data: { message: `未知消息类型: ${type}` },
            }),
          );
      }
    } catch (e) {
      console.error(e);
      ws.send(
        JSON.stringify({
          type: 'error',
          data: { message: `消息处理失败: ${e}` },
        }),
      );
    }
  },
  close(ws) {
    cleanupPendingCollectForWs(ws.id);
    releaseConnectionGui(ws.id);
    console.log(`WS disconnected: ${ws.id}`);
  },
});
