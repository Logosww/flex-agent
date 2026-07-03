import type { UIMessage } from 'ai';

export type PlanStepStatus = 'pending' | 'running' | 'done' | 'failed';

export interface PlanStep {
  id: string;
  title: string;
  status: PlanStepStatus;
  ordinal: number;
}

export interface PlanData {
  steps: PlanStep[];
}

export type ChatUIMessage = UIMessage<
  unknown,
  {
    plan: PlanData;
  }
>;
