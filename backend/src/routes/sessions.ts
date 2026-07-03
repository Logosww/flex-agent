import { Elysia, t } from 'elysia';
import {
  createChatSession,
  deleteChatSession,
  getChatSession,
  listChatSessions,
  updateChatSession,
} from '../services/chat-session';

export const sessionsRoute = new Elysia({ prefix: '/api/sessions' })
  .get('/', async () => {
    const sessions = await listChatSessions();
    return { sessions };
  })
  .post(
    '/',
    async ({ body }) => {
      const session = await createChatSession(body?.title, body?.id, body?.messages ?? []);
      return { session };
    },
    {
      body: t.Optional(
        t.Object({
          id: t.Optional(t.String()),
          title: t.Optional(t.String()),
          messages: t.Optional(t.Array(t.Unknown())),
        }),
      ),
    },
  )
  .get(
    '/:id',
    async ({ params: { id }, set }) => {
      const session = await getChatSession(id);
      if (!session) {
        set.status = 404;
        return { error: '会话不存在' };
      }
      return { session };
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )
  .patch(
    '/:id',
    async ({ params: { id }, body, set }) => {
      const session = await updateChatSession(id, body);
      if (!session) {
        set.status = 404;
        return { error: '会话不存在' };
      }
      return { session };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        title: t.Optional(t.String()),
        messages: t.Optional(t.Array(t.Unknown())),
      }),
    },
  )
  .delete(
    '/:id',
    async ({ params: { id }, set }) => {
      const deleted = await deleteChatSession(id);
      if (!deleted) {
        set.status = 404;
        return { error: '会话不存在' };
      }
      return { ok: true };
    },
    {
      params: t.Object({ id: t.String() }),
    },
  );
