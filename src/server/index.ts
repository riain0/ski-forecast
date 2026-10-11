import { serve } from '@hono/node-server';
import { createApp } from './app';
import { loadConfig } from './config';

const config = loadConfig();
const { app, warm } = createApp(config);

const server = serve({ fetch: app.fetch, port: config.PORT }, info => {
  console.info(`Upslope listening on http://localhost:${info.port} (${config.NODE_ENV})`);
  void warm();
});

const shutdown = (signal: string) => {
  console.info(`${signal} received, closing server`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
