import OpenAI from 'openai';
import { getConfig } from '@/config';
import type { MessageItem } from '@/types/chat';
import { ChatCompletionFunctionTool, ChatCompletionMessage } from 'openai/resources';

const CONTENT_MAX_LEN_DASHSCOPE = 49152;

function clipDashscopeText(raw: string): string {
  if (raw.length > CONTENT_MAX_LEN_DASHSCOPE) {
    return raw.slice(0, CONTENT_MAX_LEN_DASHSCOPE);
  }
  return raw;
}

function normalizeMessageContentArrays(
  parts: Array<{ type?: string; text?: string } & Record<string, unknown>>,
): Array<{ type?: string; text?: string } & Record<string, unknown>> | null {
  if (parts.length === 0) {
    return null;
  }
  return parts.map((part) =>
    typeof part?.text === 'string' ? { ...part, text: clipDashscopeText(part.text) } : part,
  );
}

function sanitizeMessagesForCompatibleProviders(messages: MessageItem[]): MessageItem[] {
  return messages.map((m): MessageItem => {
    if (m.role === 'assistant') {
      const a = { ...m };
      const c = a.content;
      if (c === null || c === undefined) {
        return a;
      }
      if (typeof c === 'string') {
        a.content = clipDashscopeText(c);
      } else if (Array.isArray(c)) {
        const next = normalizeMessageContentArrays(
          c as Array<{ type?: string; text?: string } & Record<string, unknown>>,
        );
        if (next === null) {
          a.content = null;
        } else {
          a.content = next as typeof c;
        }
      }
      return a;
    }
    if (m.role === 'tool') {
      const t = { ...m };
      if (typeof t.content === 'string') {
        t.content = clipDashscopeText(t.content);
      } else if (Array.isArray(t.content)) {
        t.content = t.content.map((part) =>
          part && typeof part.text === 'string'
            ? { ...part, text: clipDashscopeText(part.text) }
            : part,
        );
      }
      return t;
    }
    if (
      m.role === 'system' ||
      m.role === 'user' ||
      m.role === 'developer' ||
      (m.role as string) === 'function'
    ) {
      const u = { ...m } as {
        role: typeof m.role;
        content?: string | unknown[];
        name?: string;
      };
      const c = u.content;
      if (typeof c === 'string') {
        u.content = clipDashscopeText(c);
      } else if (Array.isArray(c)) {
        const next = normalizeMessageContentArrays(
          c as Array<{ type?: string; text?: string } & Record<string, unknown>>,
        );
        if (next === null) {
          u.content = '';
        } else {
          u.content = next as typeof c;
        }
      }
      return u as MessageItem;
    }
    return m;
  });
}

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (_client) return _client;
  const config = getConfig();
  _client = new OpenAI({
    apiKey: config.openaiApiKey,
    baseURL: config.openaiBaseUrl,
  });
  return _client;
}

export async function chatCompletion(
  messages: MessageItem[],
  model?: string,
  temperature = 0.7,
  maxTokens?: number,
  tools?: Array<ChatCompletionFunctionTool>,
): Promise<ChatCompletionMessage> {
  const config = getConfig();
  const sanitized = sanitizeMessagesForCompatibleProviders(messages);

  const resp = await getClient().chat.completions.create({
    model: model ?? config.openaiModel,
    messages: sanitized,
    temperature,
    max_tokens: maxTokens,
    ...(tools?.length ? { tools } : {}),
  });
  return resp.choices[0].message;
}

export async function* chatCompletionStream(
  messages: MessageItem[],
  model?: string,
  temperature = 0.7,
  maxTokens?: number,
  tools?: Array<ChatCompletionFunctionTool>,
) {
  const config = getConfig();
  const sanitized = sanitizeMessagesForCompatibleProviders(messages);
  const stream = await getClient().chat.completions.create({
    model: model ?? config.openaiModel,
    messages: sanitized,
    temperature,
    max_tokens: maxTokens,
    ...(tools?.length ? { tools } : {}),
    stream: true,
  });

  const accumulated: Map<
    number,
    {
      id: string;
      name: string;
      arguments: string;
    }
  > = new Map();

  for await (const chunk of stream) {
    const choice = chunk.choices?.[0];
    const delta = choice?.delta;
    if (!delta) continue;

    if (delta.content) {
      yield { type: 'token', content: delta.content };
    }

    const reasoningContent = (delta as { reasoning_content?: string | null }).reasoning_content;
    if (reasoningContent) {
      yield { type: 'reasoning', content: reasoningContent };
    }

    if (delta.tool_calls) {
      for (const call of delta.tool_calls) {
        const existing = accumulated.get(call.index) ?? { id: '', name: '', arguments: '' };
        if (call.id) existing.id = call.id;
        if (call.function?.name) existing.name = call.function.name;
        if (call.function?.arguments) existing.arguments += call.function.arguments;
        accumulated.set(call.index, existing);
      }
    }

    if (choice.finish_reason === 'tool_calls') {
      yield { type: 'tool_calls', tool_calls: [...accumulated.values()] };
    }
  }
}

export async function embedText(text: string): Promise<number[]> {
  const config = getConfig();
  const res = await getClient().embeddings.create({
    model: config.embeddingModel,
    input: text,
  });

  return res.data[0].embedding;
}
