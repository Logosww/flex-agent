import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { getConfig } from './config';
import { chatRoute } from './routes/chat';
import { sessionsRoute } from './routes/sessions';

const config = getConfig();

const app = new Elysia()
  .use(cors({ origin: config.corsOrigins, credentials: true }))
  .get('/health', () => ({ status: 'ok' }))
  .use(chatRoute)
  .use(sessionsRoute)
  .listen({ hostname: config.host, port: config.port });

console.log(`Flex Agent Backend running at http://${app.server!.hostname}:${app.server!.port}`);
