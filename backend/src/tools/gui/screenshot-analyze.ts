import { chatCompletion } from '@/services/llm';
import { registerTool } from '@/tools/registry';
import type { MessageItem } from '@/types/chat';
import type { ObjectParameterSchema } from '@/types/schema-object-to-type';
import { userMessageWithImageDataUrl } from '@/utils/message';
import { getViewMap } from './session';
import {
  DEFAULT_GUI_OPERATION_TIMEOUT_MS,
  raceWithTimeout,
  resolveGuiTimeoutMs,
  toGuiToolError,
} from './tool-guard';

const VISION_SUB_MAX_TOKENS_DEFAULT = 768;
const VISION_SUB_TEMPERATURE = 0.2;

const screenshotAnalyzeParams = {
  type: 'object',
  properties: {
    viewId: {
      type: 'string',
      description: 'WebView 实例 ID，与 gui_navigate 返回的 viewId 一致',
    },
    question: {
      type: 'string',
      description: '发给视觉模型的具体问题，例如控件是否可见、建议点击区域、页面结构等',
    },
    model: {
      type: 'string',
      description: '可选，须支持图像；默认与服务器 OPENAI_MODEL 相同',
    },
    max_tokens: {
      type: 'number',
      description: `子调用最大输出 token，默认 ${VISION_SUB_MAX_TOKENS_DEFAULT}，宜保持较短以控成本`,
    },
    timeout_ms: {
      type: 'number',
      description: '截屏步骤超时毫秒数，默认 30000，最大 120000',
    },
  },
  required: ['viewId', 'question'],
} as const satisfies ObjectParameterSchema;

registerTool(
  {
    name: 'gui_screenshot_analyze',
    description:
      '在已由 gui_navigate 取得 viewId 的 WebView 上截屏，并由支持图像的模型只回答 question；子请求不附带 GUI 工具。需要文字化「页面上有什么」时用本工具；若只要 base64 截图给主对话解析则用 gui_screenshot。',
    parameters: screenshotAnalyzeParams,
  },
  async (args) => {
    try {
      const viewId = args.viewId as string;
      const question = args.question as string;
      const model =
        typeof args.model === 'string' && args.model.length > 0 ? args.model : undefined;
      const maxTokensRaw = args.max_tokens;
      const maxTokens =
        typeof maxTokensRaw === 'number' && Number.isFinite(maxTokensRaw) && maxTokensRaw > 0
          ? Math.min(Math.trunc(maxTokensRaw), 4096)
          : VISION_SUB_MAX_TOKENS_DEFAULT;
      const shotTimeout = resolveGuiTimeoutMs(args.timeout_ms, DEFAULT_GUI_OPERATION_TIMEOUT_MS);

      const viewMap = getViewMap();
      if (!viewMap || !viewId || !viewMap.has(viewId)) {
        return { success: false, output: {}, error: 'WebView 实例不存在' };
      }
      const view = viewMap.get(viewId)!;
      const b64 = await raceWithTimeout(
        view.screenshot({ encoding: 'base64', format: 'png' }),
        shotTimeout,
      );
      const dataUrl = `data:image/png;base64,${b64}`;

      const messages: MessageItem[] = [
        {
          role: 'system',
          content: '你是网页截图分析助手。只根据截图与用户问题作答，简洁、不编造未见内容。',
        },
        userMessageWithImageDataUrl(question, dataUrl),
      ];

      const assistant = await chatCompletion(
        messages,
        model,
        VISION_SUB_TEMPERATURE,
        maxTokens,
        undefined,
      );

      let analysis = assistant.content ?? '';
      if (assistant.refusal) {
        analysis = analysis ? `${analysis}\n${assistant.refusal}` : assistant.refusal;
      }

      return { success: true, output: { viewId, analysis } };
    } catch (e) {
      return toGuiToolError(e);
    }
  },
);
