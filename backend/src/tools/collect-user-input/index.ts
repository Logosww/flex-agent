import type { ObjectParameterSchema } from '@/types/schema-object-to-type';
import { registerTool } from '@/tools/registry';
import { formUIDescriptionJsonSchema } from './type';

export const COLLECT_USER_INPUT = 'collect_user_input';

registerTool(
  {
    name: COLLECT_USER_INPUT,
    description:
      '当需要用户以结构化表单补充信息时调用。参数为表单 UI 描述；用户填写后由客户端经 WebSocket 发送 form_submit，服务端再写入 tool 消息并继续对话。',
    parameters: formUIDescriptionJsonSchema as ObjectParameterSchema,
  },
  async () => ({
    success: true,
    output: '__PENDING_CLIENT_UI__',
  }),
);
