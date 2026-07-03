import { registerTool } from '@/tools/registry';
import type { ObjectParameterSchema } from '@/types/schema-object-to-type';

registerTool(
  {
    name: 'get_current_time',
    description: '获取当前时间',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    } as const satisfies ObjectParameterSchema,
  },
  async () => ({
    success: true,
    output: new Date().toISOString(),
  }),
);
