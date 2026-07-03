import type { PlanData } from '@/types/chat-ui';

type PlanWriter = (data: PlanData) => void;

const writers = new Map<string, PlanWriter>();

export function registerPlanWriter(sessionId: string, writer: PlanWriter) {
  writers.set(sessionId, writer);
}

export function unregisterPlanWriter(sessionId: string) {
  writers.delete(sessionId);
}

export function emitPlanUpdate(sessionId: string, data: PlanData) {
  writers.get(sessionId)?.(data);
}

export function parsePlanPayload(raw: unknown): PlanData | null {
  if (!raw || typeof raw !== 'object') return null;
  const steps = (raw as { steps?: unknown }).steps;
  if (!Array.isArray(steps)) return null;

  const parsedSteps = steps
    .map((step) => {
      if (!step || typeof step !== 'object') return null;
      const item = step as Record<string, unknown>;
      const id = typeof item.id === 'string' ? item.id : null;
      const title = typeof item.title === 'string' ? item.title : null;
      const status = item.status;
      const ordinal = typeof item.ordinal === 'number' ? item.ordinal : null;
      if (!id || !title || ordinal === null) return null;
      if (
        status !== 'pending' &&
        status !== 'running' &&
        status !== 'done' &&
        status !== 'failed'
      ) {
        return null;
      }
      return { id, title, status, ordinal };
    })
    .filter((step): step is PlanData['steps'][number] => step !== null);

  return { steps: parsedSteps };
}
