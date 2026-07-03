import { getAllToolNames } from '@/agent/executor';
import { runWsStreamAgentLoopWithChecker } from '@/agent/stream-core';
import type { StepContext } from '@/agent/types';
import {
  type AgentPlan,
  type AgentSessionState,
  loadAgentState,
  saveAgentState,
  topologicalOrder,
} from '@/agent/state';
import { runPlanner } from '@/agent/planner';
import { querySimilarTraces, upsertSuccessfulTrace } from '@/services/embedding';
import { sendWsMessage } from '@/ws/send';
import type { MessageItem, PlanPayload, PlanStepStatus, WSUpstreamChat } from '@/types/chat';
import type { ElysiaWS } from 'elysia/ws';

const MAX_NODE_RETRIES = 1;

function extractUserGoal(messages: MessageItem[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === 'user' && typeof m.content === 'string') {
      return m.content;
    }
  }

  return '';
}

function buildTraceDocument(state: AgentSessionState, order: string[]): string {
  const titles = order
    .map((id) => state.plan?.nodes.find((n) => n.id === id)?.title)
    .filter(Boolean);

  return [`goal: ${state.userGoal}`, `plan: ${titles.join(' -> ')}`].join('\n');
}

function buildPlanPayload(state: AgentSessionState, allDone = false): PlanPayload {
  if (!state.plan) return { steps: [] };

  const order = topologicalOrder(state.plan);
  const currentIdx = state.currentNodeId ? order.indexOf(state.currentNodeId) : -1;

  return {
    steps: order.map((id, idx) => {
      const node = state.plan!.nodes.find((n) => n.id === id);
      let status: PlanStepStatus = 'pending';
      if (allDone || currentIdx === -1) {
        status = 'done';
      } else if (idx < currentIdx) {
        status = 'done';
      } else if (idx === currentIdx) {
        status = 'running';
      }

      return {
        id,
        title: node?.title ?? id,
        status,
        ordinal: idx + 1,
      };
    }),
  };
}

function sendPlanSnapshot(ws: ElysiaWS, state: AgentSessionState, allDone = false): void {
  sendWsMessage(ws, { type: 'plan', data: buildPlanPayload(state, allDone) });
}

function resetPlanState(state: AgentSessionState): void {
  state.plan = null;
  state.currentNodeId = null;
  state.nodeRetries = {};
}

function prepareStateForTurn(state: AgentSessionState, userGoal: string): void {
  if (userGoal && state.userGoal !== userGoal) {
    state.userGoal = userGoal;
    if (state.plan) {
      resetPlanState(state);
    }
    return;
  }

  if (userGoal) {
    state.userGoal = userGoal;
  }

  if (state.plan && state.currentNodeId === null) {
    resetPlanState(state);
  }
}

async function ensurePlan(state: AgentSessionState, model?: string): Promise<AgentPlan> {
  if (state.plan) return state.plan;

  const hints = await querySimilarTraces(state.userGoal, 3);
  state.plan = await runPlanner(state.userGoal, hints, model);
  topologicalOrder(state.plan);
  state.currentNodeId = topologicalOrder(state.plan)[0] ?? null;
  await saveAgentState(state);

  return state.plan;
}

async function advanceAfterStep(
  state: AgentSessionState,
  order: string[],
  nodeId: string,
): Promise<void> {
  const idx = order.indexOf(nodeId);
  state.currentNodeId = order[idx + 1] ?? null;
  await saveAgentState(state);
}

async function runCurrentNode(
  ws: ElysiaWS,
  state: AgentSessionState,
  messages: MessageItem[],
  req: WSUpstreamChat,
  advancePlan: () => Promise<void>,
): Promise<'done' | 'suspended' | 'fail'> {
  const { plan, currentNodeId: nodeId } = state;
  if (!plan || !nodeId) return 'fail';

  const node = plan.nodes.find((n) => n.id === nodeId);
  if (!node) return 'fail';

  const order = topologicalOrder(plan);
  const ordinal = order.indexOf(nodeId) + 1;
  const stepContext: StepContext = {
    title: node.title,
    ordinal,
    total: order.length,
    allowedTools: getAllToolNames(),
  };

  const onCollectSubmitted = async () => {
    const idx = order.indexOf(nodeId);
    const nextId = order[idx + 1] ?? null;
    if (nextId) {
      state.currentNodeId = nextId;
      await saveAgentState(state);
      await advancePlan();
      return;
    }

    const outcome = await runWsStreamAgentLoopWithChecker(
      ws,
      messages,
      req,
      state,
      stepContext,
      onCollectSubmitted,
    );
    if (outcome === 'suspended') return;
    if (outcome === 'fail') return;
    await advanceAfterStep(state, order, nodeId);
    await advancePlan();
  };

  const outcome = await runWsStreamAgentLoopWithChecker(
    ws,
    messages,
    req,
    state,
    stepContext,
    onCollectSubmitted,
  );

  if (outcome === 'suspended') return 'suspended';
  if (outcome === 'fail') return 'fail';

  await advanceAfterStep(state, order, nodeId);
  sendPlanSnapshot(ws, state);
  return 'done';
}

async function advancePlanLoop(
  ws: ElysiaWS,
  state: AgentSessionState,
  messages: MessageItem[],
  req: WSUpstreamChat,
  order: string[],
): Promise<void> {
  while (state.currentNodeId) {
    const result = await runCurrentNode(ws, state, messages, req, () =>
      advancePlanLoop(ws, state, messages, req, order),
    );
    if (result === 'suspended') return;
    if (result === 'fail') {
      const retries = (state.nodeRetries[state.currentNodeId!] ?? 0) + 1;
      state.nodeRetries[state.currentNodeId!] = retries;
      if (retries > MAX_NODE_RETRIES) {
        state.plan = null;
        state.currentNodeId = null;
        await saveAgentState(state);
        sendWsMessage(ws, { type: 'error', data: { message: '步骤失效，已清空计划' } });
        return;
      }
      continue;
    }
    break;
  }

  if (!state.currentNodeId) {
    sendPlanSnapshot(ws, state, true);
    await upsertSuccessfulTrace(crypto.randomUUID(), buildTraceDocument(state, order));
  }
  sendWsMessage(ws, { type: 'done', data: { model: req.model ?? '' } });
}

export async function runAgentPlanLoop(
  ws: ElysiaWS,
  messages: MessageItem[],
  req: WSUpstreamChat,
): Promise<void> {
  const sessionId = req.session_id!;
  const userGoal = extractUserGoal(messages);

  let state =
    (await loadAgentState(sessionId)) ??
    ({
      sessionId,
      userGoal,
      plan: null,
      currentNodeId: null,
      nodeRetries: {},
    } satisfies AgentSessionState);

  prepareStateForTurn(state, userGoal);
  await saveAgentState(state);
  await ensurePlan(state, req.model);
  sendPlanSnapshot(ws, state);

  const order = topologicalOrder(state.plan!);
  if (order.length === 0) {
    sendWsMessage(ws, { type: 'error', data: { message: '规划结果为空' } });
    return;
  }

  await advancePlanLoop(ws, state, messages, req, order);
}
