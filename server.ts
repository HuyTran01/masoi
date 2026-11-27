import dotenv from 'dotenv';
import { createRealtimeAppServer } from './src/server/realtimeServer.ts';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const handle = await createRealtimeAppServer({
    port: PORT,
    host: '0.0.0.0',
    attachVite: true,
    enableSnapshots: true,
  });

  const shutdown = () => {
    void handle.close().finally(() => process.exit(0));
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
