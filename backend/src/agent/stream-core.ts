import { chatCompletionStream } from '@/services/llm';
import { checkerRuleFromToolResult } from '@/agent/checker';
import { augmentMessagesForExecutor, getAllToolsSchema, getToolsForStep } from '@/agent/executor';
import { augmentMessagesWithAgentSystem } from '@/agent/system-prompt';
import { registerPendingCollect, type PendingCollectState } from '@/agent/pending-collect';
import { saveAgentState } from '@/agent/state';
import type { AgentSessionState } from '@/agent/state';
import type { LoopOutcome, PlanningSuspendContext, StepContext } from '@/agent/types';
import { sendWsMessage } from '@/ws/send';
import { COLLECT_USER_INPUT } from '@/tools/collect-user-input';
import { TOOL_REGISTRY } from '@/tools';
import { runWithGuiConnection } from '@/tools/gui/session';
import type { MessageItem, WSUpstreamChat } from '@/types/chat';
import type { ChatCompletionFunctionTool } from 'openai/resources';
import { ChatCompletionMessageFunctionToolCall } from 'openai/resources';
import type { ElysiaWS } from 'elysia/ws';

const MAX_ITERATIONS = 10;

type StreamLoopMode = { type: 'plain' } | ({ type: 'planning' } & PlanningSuspendContext);

type RunStreamCoreParams = {
  ws: ElysiaWS;
  messages: MessageItem[];
  req: WSUpstreamChat;
  executorMessages: MessageItem[];
  tools: ChatCompletionFunctionTool[];
  mode: StreamLoopMode;
};

async function runStreamCore(params: RunStreamCoreParams): Promise<void | LoopOutcome> {
  const { ws, messages, req, executorMessages, tools, mode } = params;
  const { model, temperature, max_tokens } = req;
  const isPlanning = mode.type === 'planning';
  const llmMessages = augmentMessagesWithAgentSystem(executorMessages);

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let assistantText = '';
    let toolCallParts: Array<
      ChatCompletionMessageFunctionToolCall.Function & { id: string }
    > | null = null;

    for await (const part of chatCompletionStream(
      llmMessages,
      model,
      temperature,
      max_tokens,
      tools,
    )) {
      const { type, content } = part;
      if (type === 'token' && typeof content === 'string') {
        assistantText += content;
        sendWsMessage(ws, { type: 'token', data: { content } });
      } else if (type === 'reasoning' && typeof content === 'string') {
        sendWsMessage(ws, { type: 'reasoning_token', data: { content } });
      } else if (type === 'tool_calls' && part.tool_calls) {
        toolCallParts = part.tool_calls;
      }
    }

    if (!toolCallParts?.length) {
      messages.push({ role: 'assistant', content: assistantText });
      if (isPlanning) return 'ok';
      sendWsMessage(ws, { type: 'done', data: { model: model ?? '' } });
      return;
    }

    const toolCallsOpenAI: Array<ChatCompletionMessageFunctionToolCall> = toolCallParts.map(
      (call) => ({
        id: call.id,
        type: 'function',
        function: { name: call.name, arguments: call.arguments },
      }),
    );

    sendWsMessage(ws, {
      type: 'tool_call',
      data: {
        calls: toolCallsOpenAI.map((call) => ({
          id: call.id,
          name: call.function.name,
          arguments: call.function.arguments,
        })),
      },
    });

    messages.push({
      role: 'assistant',
      content: assistantText ?? null,
      tool_calls: toolCallsOpenAI,
    });

    const collectCalls = toolCallsOpenAI.filter(
      (call) => call.function.name === COLLECT_USER_INPUT,
    );
    const otherCalls = toolCallsOpenAI.filter((call) => call.function.name !== COLLECT_USER_INPUT);

    if (collectCalls.length && otherCalls.length) {
      sendWsMessage(ws, {
        type: 'error',
        data: { message: 'collect_user_input 不可与同轮其它工具一并返回' },
      });
      return isPlanning ? 'fail' : undefined;
    }

    if (collectCalls.length) {
      if (collectCalls.length !== 1) {
        sendWsMessage(ws, {
          type: 'error',
          data: { message: 'collect_user_input 每轮仅支持一次调用' },
        });
        return isPlanning ? 'fail' : undefined;
      }

      const collectId = collectCalls[0].id;
      const pending: PendingCollectState = {
        messages,
        req,
        toolCallId: collectId,
        resume: isPlanning
          ? mode.onCollectSubmitted
          : () => runWsStreamAgentLoop(ws, messages, req),
      };

      if (isPlanning) {
        pending.agentState = mode.agentState;
        pending.stepContext = mode.stepContext;
        await saveAgentState(mode.agentState);
      }

      registerPendingCollect(collectId, ws.id, pending);
      return isPlanning ? 'suspended' : undefined;
    }

    for (const call of otherCalls) {
      const toolArgs = JSON.parse(call.function.arguments) as Record<string, unknown>;
      const toolDef = TOOL_REGISTRY.get(call.function.name);
      const result = toolDef
        ? await runWithGuiConnection(ws.id, () => toolDef.handler(toolArgs))
        : `错误：未知工具 ${call.function.name}`;

      sendWsMessage(ws, {
        type: 'tool_result',
        data: {
          tool_call_id: call.id,
          name: call.function.name,
          result,
        },
      });

      if (isPlanning && checkerRuleFromToolResult(result) === 'fail') {
        return 'fail';
      }

      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: result,
      });
    }
  }

  if (isPlanning) return 'fail';

  sendWsMessage(ws, {
    type: 'error',
    data: { message: 'Agent 循环超过最大轮次' },
  });
}

export async function runWsStreamAgentLoop(
  ws: ElysiaWS,
  messages: MessageItem[],
  req: WSUpstreamChat,
): Promise<void> {
  await runStreamCore({
    ws,
    messages,
    req,
    executorMessages: messages,
    tools: getAllToolsSchema(),
    mode: { type: 'plain' },
  });
}

export async function runWsStreamAgentLoopWithChecker(
  ws: ElysiaWS,
  messages: MessageItem[],
  req: WSUpstreamChat,
  agentState: AgentSessionState,
  stepContext: StepContext,
  onCollectSubmitted: () => Promise<void>,
): Promise<LoopOutcome> {
  const outcome = await runStreamCore({
    ws,
    messages,
    req,
    executorMessages: augmentMessagesForExecutor(
      messages,
      stepContext.title,
      stepContext.ordinal,
      stepContext.total,
    ),
    tools: getToolsForStep(stepContext.allowedTools),
    mode: {
      type: 'planning',
      agentState,
      stepContext,
      onCollectSubmitted,
    },
  });

  return outcome ?? 'fail';
}
