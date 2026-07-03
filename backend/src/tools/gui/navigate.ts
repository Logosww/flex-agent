import { getViewMap } from './session';
import {
  DEFAULT_GUI_OPERATION_TIMEOUT_MS,
  raceWithTimeout,
  resolveGuiTimeoutMs,
  toGuiToolError,
} from './tool-guard';
import { registerTool } from '../registry';
import type { ObjectParameterSchema } from '@/types/schema-object-to-type';

const navigateParams = {
  type: 'object',
  properties: {
    url: {
      type: 'string',
      description: '完整 https URL',
    },
    viewId: {
      type: 'string',
      description: 'WebView 实例 ID，可选，若不传则创建新实例',
    },
    timeout_ms: {
      type: 'number',
      description: '导航超时毫秒数，默认 30000，最大 120000',
    },
  },
  required: ['url'],
} as const satisfies ObjectParameterSchema;

registerTool(
  {
    name: 'gui_navigate',
    description:
      '当用户需要打开、访问、读取或验证某 HTTP(S) 网页时，应调用本工具：由服务端无头 WebView 导航到 url 并返回 viewId，供同一会话内 gui_click、gui_type、gui_screenshot、gui_screenshot_analyze 使用。不要仅凭对话声称“无法访问链接”或“不能打开网页”。整站或整页跳转用本工具；在已加载页面上点按控件请用 gui_click，勿用本工具代替点击。',
    parameters: navigateParams,
  },
  async (args) => {
    try {
      const url = args.url;
      let viewId = args.viewId;
      const timeoutMs = resolveGuiTimeoutMs(args.timeout_ms, DEFAULT_GUI_OPERATION_TIMEOUT_MS);
      const viewMap = getViewMap();
      if (!viewMap) {
        return { success: false, output: {}, error: 'WebView 会话不可用' };
      }
      if (viewId) {
        if (!viewMap.has(viewId)) {
          return { success: false, output: {}, error: 'WebView 实例不存在' };
        }
        const view = viewMap.get(viewId)!;
        await raceWithTimeout(view.navigate(url), timeoutMs);
      } else {
        const view = new Bun.WebView();
        viewId = crypto.randomUUID();
        viewMap.set(viewId, view);
        await raceWithTimeout(view.navigate(url), timeoutMs);
      }
      return { success: true, output: { viewId, currentUrl: url } };
    } catch (e) {
      return toGuiToolError(e);
    }
  },
);
