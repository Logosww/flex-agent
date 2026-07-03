import { TOOL_REGISTRY } from '@/tools';
import type { MessageItem } from '@/types/chat';

const TOOL_REASONING_ALIASES: Record<string, string> = {
  collect_user_input: '向用户收集结构化信息',
  get_weather: '查询天气',
  get_current_time: '获取当前时间',
  gui_navigate: '打开或跳转网页',
  gui_click: '在页面上点击',
  gui_type: '在页面输入框中输入',
  gui_screenshot: '截取页面截图',
  gui_screenshot_analyze: '分析页面截图',
};

const REASONING_LANGUAGE_HINT =
  '进行深度思考与推理（reasoning_content）时请使用中文，除非用户使用其他语言。';

const AGENT_SYSTEM_PROMPT_BASE =
  '你是一个有用的 AI 助手。请用中文回答用户问题；进行深度思考与推理（reasoning_content）时也请使用中文，除非用户使用其他语言。';

function buildToolNameDesensitizationHint(): string {
  const names = [...TOOL_REGISTRY.keys()].sort();
  const examples = names
    .map((name) => TOOL_REASONING_ALIASES[name] ?? '执行相关操作')
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, 6);

  const nameList = names.length > 0 ? names.join('、') : '（无）';
  const exampleList = examples.length > 0 ? examples.join('、') : '执行相关操作';

  return (
    '在 reasoning_content 中不得暴露内部工具/API 函数名、参数名或实现细节' +
    `（例如：${nameList}）。` +
    `请改用面向用户的自然语言描述你的意图，例如：${exampleList}。`
  );
}

function getReasoningPolicyHints(): string[] {
  return [REASONING_LANGUAGE_HINT, buildToolNameDesensitizationHint()];
}

export function buildAgentSystemPrompt(): string {
  return [AGENT_SYSTEM_PROMPT_BASE, ...getReasoningPolicyHints()].join('\n');
}

export const AGENT_SYSTEM_PROMPT = buildAgentSystemPrompt();

function appendMissingPolicyLines(content: string, lines: string[]): string {
  let result = content.trim();
  for (const line of lines) {
    if (result.includes(line)) continue;
    result = result ? `${result}\n${line}` : line;
  }
  return result;
}

export function augmentMessagesWithAgentSystem(messages: MessageItem[]): MessageItem[] {
  const policyHints = getReasoningPolicyHints();
  const systemIndex = messages.findIndex((message) => message.role === 'system');
  if (systemIndex >= 0) {
    const systemMessage = messages[systemIndex];
    const content = typeof systemMessage.content === 'string' ? systemMessage.content : '';
    const next = [...messages];
    next[systemIndex] = {
      ...systemMessage,
      content: appendMissingPolicyLines(content || buildAgentSystemPrompt(), policyHints),
    };
    return next;
  }

  return [{ role: 'system', content: buildAgentSystemPrompt() }, ...messages];
}
