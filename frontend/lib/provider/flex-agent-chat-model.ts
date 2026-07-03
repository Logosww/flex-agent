import type {
  JSONValue,
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3GenerateResult,
  LanguageModelV3Prompt,
  LanguageModelV3StreamResult,
  LanguageModelV3StreamPart,
  LanguageModelV3TextPart,
  LanguageModelV3ToolResultOutput,
  LanguageModelV3Usage,
  LanguageModelV3FinishReason,
} from '@ai-sdk/provider';
import {
  clearCollectSession,
  COLLECT_USER_INPUT_TOOL,
  registerCollectSession,
} from '@/lib/ws/collect-user-input-session';
import { emitPlanUpdate, parsePlanPayload } from '@/lib/ws/plan-stream';

export interface FlexAgentModelConfig {
  provider: string;
  baseURL: string;
  wsURL: string;
  enablePlanning?: boolean;
}

export type FlexAgentProviderOptions = {
  sessionId?: string;
  enablePlanning?: boolean;
};

type BackendChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
};

type StreamContext = {
  controller: ReadableStreamDefaultController<LanguageModelV3StreamPart>;
  modelId: string;
  textId: string;
  textStarted: boolean;
  reasoningId: string;
  reasoningStarted: boolean;
  sessionId?: string;
  settled: boolean;
  ws: WebSocket;
  settle: (fn: () => void) => void;
  closeWs: () => void;
};

function emptyUsage(): LanguageModelV3Usage {
  return {
    inputTokens: {
      total: undefined,
      noCache: undefined,
      cacheRead: undefined,
      cacheWrite: undefined,
    },
    outputTokens: { total: undefined, text: undefined, reasoning: undefined },
  };
}

function stopReason(): LanguageModelV3FinishReason {
  return { unified: 'stop', raw: 'stop' };
}

function toolResultV3ToString(output: LanguageModelV3ToolResultOutput): string {
  switch (output.type) {
    case 'text':
      return output.value;
    case 'json':
      return JSON.stringify(output.value);
    case 'error-text':
      return output.value;
    case 'error-json':
      return JSON.stringify(output.value);
    case 'execution-denied':
      return output.reason ?? 'execution-denied';
    case 'content':
      return output.value.map((c) => (c.type === 'text' ? c.text : '')).join('');
    default:
      return JSON.stringify(output);
  }
}

function appendAssistantText(result: BackendChatMessage[], chunks: string[]): void {
  if (!chunks.length) return;
  result.push({ role: 'assistant', content: chunks.join('\n') });
}

function appendAssistantToolCalls(
  result: BackendChatMessage[],
  toolCalls: NonNullable<BackendChatMessage['tool_calls']>,
): void {
  if (!toolCalls.length) return;
  result.push({ role: 'assistant', content: null, tool_calls: toolCalls });
}

function assistantContentToBackendMessages(
  content: Extract<LanguageModelV3Prompt[number], { role: 'assistant' }>['content'],
): BackendChatMessage[] {
  if (typeof content === 'string') {
    return [{ role: 'assistant', content }];
  }

  const result: BackendChatMessage[] = [];
  let textChunks: string[] = [];
  let toolCalls: NonNullable<BackendChatMessage['tool_calls']> = [];

  const flushText = () => {
    appendAssistantText(result, textChunks);
    textChunks = [];
  };

  const flushToolCalls = () => {
    appendAssistantToolCalls(result, toolCalls);
    toolCalls = [];
  };

  for (const p of content) {
    if (p.type === 'text') {
      textChunks.push(p.text);
    } else if (p.type === 'tool-call') {
      flushText();
      toolCalls.push({
        id: p.toolCallId,
        type: 'function',
        function: {
          name: p.toolName,
          arguments: typeof p.input === 'string' ? p.input : JSON.stringify(p.input ?? {}),
        },
      });
    } else if (p.type === 'tool-result') {
      flushToolCalls();
      result.push({
        role: 'tool',
        tool_call_id: p.toolCallId,
        content: toolResultV3ToString(p.output),
      });
    }
  }

  flushToolCalls();
  flushText();
  return result;
}

function v3PromptToBackendMessages(prompt: LanguageModelV3Prompt): BackendChatMessage[] {
  const out: BackendChatMessage[] = [];
  for (const msg of prompt) {
    if (msg.role === 'system') {
      out.push({ role: 'system', content: msg.content });
    } else if (msg.role === 'user') {
      const text = msg.content
        .filter((p): p is LanguageModelV3TextPart => p.type === 'text')
        .map((p) => p.text)
        .join('\n');
      out.push({ role: 'user', content: text });
    } else if (msg.role === 'assistant') {
      out.push(...assistantContentToBackendMessages(msg.content));
    } else if (msg.role === 'tool') {
      for (const p of msg.content) {
        if (p.type === 'tool-result') {
          out.push({
            role: 'tool',
            tool_call_id: p.toolCallId,
            content: toolResultV3ToString(p.output),
          });
        }
      }
    }
  }
  return out;
}

function wsResultToJsonValue(result: unknown): NonNullable<JSONValue> {
  if (result === null || result === undefined) {
    return '';
  }
  if (typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean') {
    return result;
  }
  if (typeof result === 'object' && !Array.isArray(result)) {
    return result as NonNullable<JSONValue>;
  }
  if (Array.isArray(result)) {
    return result as NonNullable<JSONValue>;
  }
  return String(result);
}

function handleWsMessage(ctx: StreamContext, msg: Record<string, unknown>) {
  switch (msg.type) {
    case 'token': {
      const content =
        typeof (msg.data as Record<string, unknown> | undefined)?.content === 'string'
          ? ((msg.data as Record<string, unknown>).content as string)
          : '';
      if (!content) break;
      if (ctx.reasoningStarted) {
        ctx.controller.enqueue({ type: 'reasoning-end', id: ctx.reasoningId });
        ctx.reasoningStarted = false;
      }
      if (!ctx.textStarted) {
        ctx.controller.enqueue({ type: 'text-start', id: ctx.textId });
        ctx.textStarted = true;
      }
      ctx.controller.enqueue({
        type: 'text-delta',
        id: ctx.textId,
        delta: content,
      });
      break;
    }
    case 'reasoning_token': {
      const content =
        typeof (msg.data as Record<string, unknown> | undefined)?.content === 'string'
          ? ((msg.data as Record<string, unknown>).content as string)
          : '';
      if (!content) break;
      if (!ctx.reasoningStarted) {
        ctx.controller.enqueue({ type: 'reasoning-start', id: ctx.reasoningId });
        ctx.reasoningStarted = true;
      }
      ctx.controller.enqueue({
        type: 'reasoning-delta',
        id: ctx.reasoningId,
        delta: content,
      });
      break;
    }
    case 'plan': {
      if (!ctx.sessionId) break;
      const plan = parsePlanPayload(msg.data);
      if (plan) emitPlanUpdate(ctx.sessionId, plan);
      break;
    }
    case 'tool_call': {
      if (ctx.reasoningStarted) {
        ctx.controller.enqueue({ type: 'reasoning-end', id: ctx.reasoningId });
        ctx.reasoningStarted = false;
      }
      const calls = (msg.data as Record<string, unknown> | undefined)?.calls as
        | Array<{ id: string; name: string; arguments: string }>
        | undefined;
      if (!Array.isArray(calls)) break;

      const collectOnly = calls.length === 1 && calls[0].name === COLLECT_USER_INPUT_TOOL;

      for (const call of calls) {
        ctx.controller.enqueue({
          type: 'tool-call',
          toolCallId: call.id,
          toolName: call.name,
          input: call.arguments,
          dynamic: true,
          providerExecuted: call.name !== COLLECT_USER_INPUT_TOOL,
        });
      }

      if (collectOnly) {
        registerCollectSession({
          ws: ctx.ws,
          toolCallId: calls[0].id,
          stream: {
            controller: ctx.controller,
            modelId: ctx.modelId,
            textId: ctx.textId,
            textStarted: ctx.textStarted,
            settle: ctx.settle,
            closeWs: ctx.closeWs,
          },
        });
      }
      break;
    }
    case 'tool_result': {
      const data = (msg.data as Record<string, unknown> | undefined) ?? {};
      const toolCallId = String(data.tool_call_id ?? '');
      const toolName = String(data.name ?? '');
      const result = wsResultToJsonValue(data.result);
      ctx.controller.enqueue({
        type: 'tool-result',
        toolCallId,
        toolName,
        result,
        dynamic: true,
      });
      break;
    }
    case 'done':
      ctx.settle(() => {
        clearCollectSession(ctx.ws);
        if (ctx.reasoningStarted) {
          ctx.controller.enqueue({ type: 'reasoning-end', id: ctx.reasoningId });
        }
        if (ctx.textStarted) {
          ctx.controller.enqueue({ type: 'text-end', id: ctx.textId });
        }
        ctx.controller.enqueue({
          type: 'response-metadata',
          modelId:
            typeof (msg.data as Record<string, unknown> | undefined)?.model === 'string'
              ? ((msg.data as Record<string, unknown>).model as string)
              : ctx.modelId,
        });
        ctx.controller.enqueue({
          type: 'finish',
          finishReason: stopReason(),
          usage: emptyUsage(),
        });
        try {
          ctx.controller.close();
        } catch {
          /* closed */
        }
        ctx.closeWs();
      });
      break;
    case 'error':
      ctx.settle(() => {
        clearCollectSession(ctx.ws);
        ctx.controller.enqueue({
          type: 'error',
          error: new Error(
            typeof (msg.data as Record<string, unknown> | undefined)?.message === 'string'
              ? ((msg.data as Record<string, unknown>).message as string)
              : '错误',
          ),
        });
        try {
          ctx.controller.close();
        } catch {
          /* closed */
        }
        ctx.closeWs();
      });
      break;
  }
}

export class FlexAgentChatLanguageModel implements LanguageModelV3 {
  readonly specificationVersion = 'v3' as const;
  readonly provider: string;
  readonly modelId: string;
  readonly supportedUrls: Record<string, RegExp[]> = {};

  private config: FlexAgentModelConfig;

  constructor(modelId: string, config: FlexAgentModelConfig) {
    this.provider = config.provider;
    this.modelId = modelId;
    this.config = config;
  }

  async doGenerate(_options: LanguageModelV3CallOptions): Promise<LanguageModelV3GenerateResult> {
    const warn =
      'Flex Agent 仅支持 streamText（doStream）经 WebSocket 调用后端，不支持 generateText（doGenerate）。请改用 streamText。';
    return {
      content: [
        {
          type: 'text',
          text: warn,
          providerMetadata: {},
        },
      ],
      finishReason: stopReason(),
      usage: emptyUsage(),
      warnings: [
        {
          type: 'unsupported',
          feature: 'doGenerate / generateText',
          details:
            'Use streamText and WebSocket (/api/chat/ws) only; POST /api/chat has been removed.',
        },
      ],
      request: { body: undefined },
      response: { body: undefined },
    };
  }

  async doStream(options: LanguageModelV3CallOptions): Promise<LanguageModelV3StreamResult> {
    const messages = v3PromptToBackendMessages(options.prompt);
    const modelId = this.modelId;
    const wsURL = this.config.wsURL;
    const callOptions = options.providerOptions?.['flex-agent'] as
      | FlexAgentProviderOptions
      | undefined;
    const enablePlanning = callOptions?.enablePlanning ?? this.config.enablePlanning ?? false;
    const sessionId = enablePlanning ? callOptions?.sessionId : undefined;

    const wsPayload = JSON.stringify({
      type: 'chat',
      data: {
        messages,
        model: modelId,
        temperature: options.temperature,
        max_tokens: options.maxOutputTokens,
        ...(sessionId ? { session_id: sessionId } : {}),
        ...(enablePlanning ? { enable_planning: true } : {}),
      },
    });

    const stream = new ReadableStream<LanguageModelV3StreamPart>({
      start: (controller) => {
        const ws = new WebSocket(`${wsURL.replace(/\/+$/, '')}/api/chat/ws`);
        const textId = 'text-0';
        const reasoningId = 'reasoning-0';
        let settled = false;

        const settle = (fn: () => void) => {
          if (settled) return;
          settled = true;
          fn();
        };

        const closeWs = () => {
          try {
            ws.close();
          } catch {
            /* noop */
          }
        };

        const ctx: StreamContext = {
          controller,
          modelId,
          textId,
          textStarted: false,
          reasoningId,
          reasoningStarted: false,
          sessionId,
          settled: false,
          ws,
          settle,
          closeWs,
        };

        ws.onopen = () => {
          controller.enqueue({ type: 'stream-start', warnings: [] });
          ws.send(wsPayload);
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(typeof event.data === 'string' ? event.data : '') as Record<
              string,
              unknown
            >;
            handleWsMessage(ctx, msg);
          } catch (e) {
            settle(() => {
              clearCollectSession(ws);
              controller.enqueue({ type: 'error', error: e });
              try {
                controller.close();
              } catch {
                /* closed */
              }
              closeWs();
            });
          }
        };

        ws.onerror = () => {
          settle(() => {
            clearCollectSession(ws);
            controller.enqueue({
              type: 'error',
              error: new Error('WebSocket connection failed'),
            });
            try {
              controller.close();
            } catch {
              /* closed */
            }
          });
        };

        ws.onclose = () => {
          clearCollectSession(ws);
          if (settled) return;
          settled = true;
          controller.enqueue({
            type: 'error',
            error: new Error('连接已关闭'),
          });
          try {
            controller.close();
          } catch {
            /* closed */
          }
        };

        options.abortSignal?.addEventListener(
          'abort',
          () => {
            clearCollectSession(ws);
            closeWs();
          },
          { once: true },
        );
      },
    });

    return { stream, request: { body: wsPayload } };
  }
}
