import type { AgentSessionState } from '@/agent/state';

export type StepContext = {
  title: string;
  ordinal: number;
  total: number;
  allowedTools: Set<string>;
};

export type LoopOutcome = 'ok' | 'fail' | 'suspended';

export type PlanningSuspendContext = {
  agentState: AgentSessionState;
  stepContext: StepContext;
  onCollectSubmitted: () => Promise<void>;
};
