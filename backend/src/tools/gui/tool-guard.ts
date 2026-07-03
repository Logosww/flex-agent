export class GuiToolTimeoutError extends Error {
  override readonly name = 'GuiToolTimeoutError';
  readonly timeout = true as const;

  constructor() {
    super('操作超时');
  }
}

export function raceWithTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  if (!Number.isFinite(ms) || ms <= 0) {
    return promise;
  }
  let id: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    id = setTimeout(() => reject(new GuiToolTimeoutError()), ms);
  });
  return Promise.race([
    promise.finally(() => {
      if (id !== undefined) clearTimeout(id);
    }),
    timeoutPromise,
  ]);
}

import type { ToolResult } from '@/tools/registry';

export function toGuiToolError(e: unknown): ToolResult {
  if (e instanceof GuiToolTimeoutError) {
    return { success: false, output: {}, timeout: true, error: e.message };
  }
  const msg = e instanceof Error ? e.message : String(e);
  return { success: false, output: {}, error: msg };
}

export const DEFAULT_GUI_OPERATION_TIMEOUT_MS = 30_000;
export const MAX_GUI_OPERATION_TIMEOUT_MS = 120_000;

export function resolveGuiTimeoutMs(raw: unknown, fallback: number): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return fallback;
  const n = Math.trunc(raw);
  if (n <= 0) return fallback;
  return Math.min(n, MAX_GUI_OPERATION_TIMEOUT_MS);
}
