import type { InferObjectParameters, ObjectParameterSchema } from '@/types/schema-object-to-type';

type ToolDef = {
  schema: {
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  };
  handler: (args: Record<string, unknown>) => Promise<string>;
};

export type ToolResult<
  T extends unknown | string | number | boolean | Record<string, unknown> | Array<unknown> =
    unknown,
> = {
  success: boolean;
  output: T;
  error?: string;
  [key: string]: unknown;
};

export const TOOL_REGISTRY = new Map<string, ToolDef>();

export function registerTool<T extends ObjectParameterSchema, R extends ToolResult>(
  funcDef: { name: string; description: string; parameters: T },
  handler: (args: InferObjectParameters<T>) => Promise<R>,
) {
  const { name, description, parameters } = funcDef;
  TOOL_REGISTRY.set(name, {
    schema: {
      type: 'function',
      function: { name, description, parameters },
    },
    handler: async (args) => {
      const result = await handler(args as InferObjectParameters<T>);
      return JSON.stringify(result);
    },
  });
}
