import type { Config, Context } from '@netlify/functions';
import { createApiRouter } from '../../src/server/apiRouter.ts';
import {
  createNetlifyBlobsStateStore,
  hasNetlifyBlobsEnv,
  MemoryStateStore,
  type StateStore,
} from '../../src/server/stateStore.ts';

// Process-scoped memory fallback ONLY when invoked directly in unit tests outside Netlify Blobs runtime.
const testFallbackStore = new MemoryStateStore();

export function resetNetlifyApiTestStore(): void {
  testFallbackStore.clear();
}

function getStoreForInvocation(context?: Partial<Context>): StateStore {
  if (hasNetlifyBlobsEnv()) {
    return createNetlifyBlobsStateStore(context);
  }
  return testFallbackStore;
}

export default async (req: Request, context?: Partial<Context>): Promise<Response> => {
  const store = getStoreForInvocation(context);
  const router = createApiRouter({
    store,
    isNetlify: true,
    persistRooms: true,
  });
  return router.handleRequest(req, {
    clientIp: context?.ip,
  });
};

export const config: Config = {
  path: '/api/*',
};
