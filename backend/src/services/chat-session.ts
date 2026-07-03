import { redis } from 'bun';

export interface ChatSessionMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChatSession extends ChatSessionMeta {
  messages: unknown[];
}

const INDEX_KEY = 'chat:sessions:index';
const SESSION_TTL_SECONDS = 86400 * 7;

function sessionKey(id: string): string {
  return `chat:session:${id}`;
}

export async function listChatSessions(): Promise<ChatSessionMeta[]> {
  const ids = await redis.zrevrange(INDEX_KEY, 0, -1);
  if (!ids.length) return [];

  const sessions: ChatSessionMeta[] = [];
  for (const id of ids) {
    const raw = await redis.get(sessionKey(id));
    if (!raw) {
      await redis.zrem(INDEX_KEY, id);
      continue;
    }
    const session = JSON.parse(raw) as ChatSession;
    sessions.push({
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    });
  }

  return sessions;
}

export async function getChatSession(id: string): Promise<ChatSession | null> {
  const raw = await redis.get(sessionKey(id));
  if (!raw) return null;
  return JSON.parse(raw) as ChatSession;
}

export async function createChatSession(
  title = '新对话',
  id?: string,
  messages: unknown[] = [],
): Promise<ChatSession> {
  const now = Date.now();
  const session: ChatSession = {
    id: id ?? crypto.randomUUID(),
    title,
    createdAt: now,
    updatedAt: now,
    messages,
  };

  await redis.set(sessionKey(session.id), JSON.stringify(session), 'EX', SESSION_TTL_SECONDS);
  await redis.zadd(INDEX_KEY, session.updatedAt, session.id);

  return session;
}

export async function updateChatSession(
  id: string,
  patch: Partial<Pick<ChatSession, 'title' | 'messages'>>,
): Promise<ChatSession | null> {
  const existing = await getChatSession(id);
  if (!existing) return null;

  const updated: ChatSession = {
    ...existing,
    ...patch,
    updatedAt: Date.now(),
  };

  await redis.set(sessionKey(id), JSON.stringify(updated), 'EX', SESSION_TTL_SECONDS);
  await redis.zadd(INDEX_KEY, updated.updatedAt, id);

  return updated;
}

export async function deleteChatSession(id: string): Promise<boolean> {
  const existing = await getChatSession(id);
  if (!existing) return false;

  await redis.del(sessionKey(id));
  await redis.zrem(INDEX_KEY, id);
  await redis.del(`agent:${id}`);

  return true;
}
