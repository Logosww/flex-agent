import { registerTool } from '@/tools/registry';
import type { ObjectParameterSchema } from '@/types/schema-object-to-type';
import { getViewMap } from './session';
import { toGuiToolError } from './tool-guard';

const typeParams = {
  type: 'object',
  properties: {
    text: {
      type: 'string',
      description: '输入的文本',
    },
    viewId: {
      type: 'string',
      description: 'WebView 实例 ID',
    },
  },
  required: ['text', 'viewId'],
} as const satisfies ObjectParameterSchema;

registerTool(
  {
    name: 'gui_type',
    description:
      '在已由 gui_navigate 打开的 WebView 中，向当前聚焦元素输入文本。通常需先用 gui_click 聚焦输入框。',
    parameters: typeParams,
  },
  async (args) => {
    try {
      const viewId = args.viewId;
      const text = args.text as string;
      const viewMap = getViewMap();
      if (!viewMap || !viewId || !viewMap.has(viewId)) {
        return { success: false, output: {}, error: 'WebView 实例不存在' };
      }
      const view = viewMap.get(viewId)!;
      await view.type(text);
      return { success: true, output: { viewId } };
    } catch (e) {
      return toGuiToolError(e);
    }
  },
);
