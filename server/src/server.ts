import { createApp } from './app';
import { env } from './config/env';
import { pool } from './db/pool';

const server = createApp().listen(env.PORT, () => {
  console.log(`✔ API ready on http://localhost:${env.PORT}/api`);
});

// Close the HTTP server and the DB pool cleanly on Ctrl+C / container stop.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => void pool.end().then(() => process.exit(0)));
  });
}
