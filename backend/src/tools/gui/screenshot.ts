import { registerTool } from '@/tools/registry';
import { getViewMap } from './session';
import { toGuiToolError } from './tool-guard';
import type { ObjectParameterSchema } from '@/types/schema-object-to-type';

const screenshotParams = {
  type: 'object',
  properties: {
    viewId: {
      type: 'string',
      description: 'WebView 实例 ID',
    },
  },
  required: ['viewId'],
} as const satisfies ObjectParameterSchema;

registerTool(
  {
    name: 'gui_screenshot',
    description:
      '在已由 gui_navigate 打开的 WebView 上截取当前视口 PNG（base64），用于规划 gui_click 坐标或自行读图。若要把截图交给服务端视觉子模型生成简短文字结论，用 gui_screenshot_analyze。',
    parameters: screenshotParams,
  },
  async (args) => {
    try {
      const viewId = args.viewId;
      const viewMap = getViewMap();
      if (!viewMap || !viewId || !viewMap.has(viewId)) {
        return { success: false, output: {}, error: 'WebView 实例不存在' };
      }
      const view = viewMap.get(viewId)!;
      const screenshot = await view.screenshot({ encoding: 'base64', format: 'png' });
      return { success: true, output: { viewId, screenshot } };
    } catch (e) {
      return toGuiToolError(e);
    }
  },
);
