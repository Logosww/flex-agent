import { registerTool } from '@/tools/registry';
import type { ObjectParameterSchema } from '@/types/schema-object-to-type';

registerTool(
  {
    name: 'get_weather',
    description: '获取指定城市的天气',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string', description: '城市名称' },
      },
      required: ['city'],
    } as const satisfies ObjectParameterSchema,
  },
  async (args) => {
    const city = args.city ?? '未知';
    return {
      success: true,
      output: { city, temperature: 22, weather: '晴' },
    };
  },
);
