import type { UIMessage } from 'ai';
import { INITIAL_SESSIONS_REQUEST_TIMEOUT_MS } from '@/lib/api/constants';
import { backendFetch } from '@/lib/api/backend';

export interface ChatSessionMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChatSession extends ChatSessionMeta {
  messages: UIMessage[];
}

export async function listSessions(options?: {
  timeoutMs?: number;
}): Promise<ChatSessionMeta[]> {
  const data = await backendFetch<{ sessions: ChatSessionMeta[] }>('/api/sessions', {
    timeoutMs: options?.timeoutMs,
  });
  return data.sessions;
}

export async function fetchInitialSessionsList(): Promise<ChatSessionMeta[]> {
  return listSessions({ timeoutMs: INITIAL_SESSIONS_REQUEST_TIMEOUT_MS });
}

export interface CreateSessionInput {
  id: string;
  title?: string;
  messages?: UIMessage[];
}

export async function createSession(input: CreateSessionInput): Promise<ChatSession> {
  const data = await backendFetch<{ session: ChatSession }>('/api/sessions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.session;
}

export async function getSession(id: string): Promise<ChatSession> {
  const data = await backendFetch<{ session: ChatSession }>(`/api/sessions/${id}`);
  return data.session;
}

export async function updateSession(
  id: string,
  patch: Partial<Pick<ChatSession, 'title' | 'messages'>>,
): Promise<ChatSession> {
  const data = await backendFetch<{ session: ChatSession }>(`/api/sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return data.session;
}

export async function deleteSession(id: string): Promise<void> {
  await backendFetch<{ ok: true }>(`/api/sessions/${id}`, {
    method: 'DELETE',
  });
}
