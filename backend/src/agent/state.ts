import { redis } from 'bun';

export interface PlanNode {
  id: string;
  title: string;
  dependsOn: PlanNode['id'][];
}

export interface AgentPlan {
  nodes: PlanNode[];
}

export interface AgentSessionState {
  sessionId: string;
  userGoal: string;
  plan: AgentPlan | null;
  currentNodeId: PlanNode['id'] | null;
  nodeRetries: Record<PlanNode['id'], number>;
}

export function topologicalOrder(plan: AgentPlan): PlanNode['id'][] {
  const byId = new Map(plan.nodes.map((n) => [n.id, n] as const));
  const dependents = new Map<PlanNode['id'], PlanNode['id'][]>();
  for (const n of plan.nodes) {
    for (const d of n.dependsOn) {
      if (!byId.has(d)) {
        throw new Error(`unknown dependency: ${d}`);
      }
      const list = dependents.get(d);
      if (list) {
        list.push(n.id);
      } else {
        dependents.set(d, [n.id]);
      }
    }
  }
  const indegree = new Map<PlanNode['id'], number>();
  for (const n of plan.nodes) indegree.set(n.id, n.dependsOn.length);
  const q: PlanNode['id'][] = [];
  for (const n of plan.nodes) {
    if ((indegree.get(n.id) ?? 0) === 0) {
      q.push(n.id);
    }
  }
  const out: PlanNode['id'][] = [];
  while (q.length) {
    const id = q.shift()!;
    out.push(id);
    for (const mid of dependents.get(id) ?? []) {
      const next = (indegree.get(mid) ?? 1) - 1;
      indegree.set(mid, next);
      if (next === 0) {
        q.push(mid);
      }
    }
  }
  if (out.length !== plan.nodes.length) {
    throw new Error('循环或无效的 DAG');
  }
  return out;
}

export async function saveAgentState(state: AgentSessionState): Promise<void> {
  const key = `agent:${state.sessionId}`;
  await redis.set(key, JSON.stringify(state), 'EX', 3600);
}

export async function loadAgentState(
  sessionId: AgentSessionState['sessionId'],
): Promise<AgentSessionState | null> {
  const key = `agent:${sessionId}`;
  const raw = await redis.get(key);
  if (!raw) return null;

  return JSON.parse(raw) as AgentSessionState;
}
