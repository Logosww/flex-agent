import { getViewMap } from './session';
import { toGuiToolError } from './tool-guard';
import { registerTool } from '@/tools/registry';
import type { ObjectParameterSchema } from '@/types/schema-object-to-type';

const clickParams = {
  type: 'object',
  properties: {
    viewId: {
      type: 'string',
      description: 'WebView 实例 ID',
    },
    x: {
      type: 'number',
      description: '视口内 x 像素坐标，与最近一次 gui_screenshot 截图的视口一致',
    },
    y: {
      type: 'number',
      description: '视口内 y 像素坐标，与最近一次 gui_screenshot 截图的视口一致',
    },
  },
  required: ['viewId', 'x', 'y'],
} as const satisfies ObjectParameterSchema;

registerTool(
  {
    name: 'gui_click',
    description:
      '在已由 gui_navigate 打开的 WebView 视口内模拟点击 (x,y)。坐标与当前视口一致，可与 gui_screenshot 同视口对齐后取点。',
    parameters: clickParams,
  },
  async (args) => {
    try {
      const viewId = args.viewId as string;
      const x = args.x as number;
      const y = args.y as number;
      const viewMap = getViewMap();
      if (!viewMap || !viewId || !viewMap.has(viewId)) {
        return { success: false, output: {}, error: 'WebView 实例不存在' };
      }
      const view = viewMap.get(viewId)!;
      await view.click(x, y);
      return { success: true, output: { viewId } };
    } catch (e) {
      return toGuiToolError(e);
    }
  },
);
