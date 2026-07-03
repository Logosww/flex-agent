import type { ToolResult } from '@/tools/registry';

export function checkerRuleFromToolResult(result: string): 'ok' | 'fail' {
  try {
    const output = JSON.parse(result) as ToolResult;
    if (output && typeof output.success === 'boolean' && output.success === false) return 'fail';
  } catch {
    return 'ok';
  }
  return 'ok';
}
