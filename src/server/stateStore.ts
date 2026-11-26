import { getDeployStore, getStore } from '@netlify/blobs';
import type { DatabaseAccountRecord } from './auth.ts';
import { readAccountsDb, writeAccountsDb } from './auth.ts';

export interface StateStore {
  readonly kind: 'memory' | 'local-node' | 'netlify-blobs';
  getJSON<T>(key: string): Promise<T | null>;
  setJSON<T>(key: string, value: T): Promise<void>;
  setJSONIfNew<T>(key: string, value: T): Promise<boolean>;
  delete(key: string): Promise<void>;
  listKeys(prefix: string): Promise<string[]>;
}

export interface NetlifyContextLike {
  deploy?: {
    context?: string;
  };
}

export function readEnv(key: string): string | undefined {
  const netlifyEnv = (
    globalThis as { Netlify?: { env?: { get?: (k: string) => string | undefined } } }
  ).Netlify?.env;
  if (typeof netlifyEnv?.get === 'function') {
    const val = netlifyEnv.get(key);
    if (val !== undefined) return val;
  }
  return process.env[key];
}

export function hasNetlifyBlobsEnv(): boolean {
  const g = globalThis as Record<string, unknown>;
  return Boolean(g.netlifyBlobsContext || readEnv('NETLIFY_BLOBS_CONTEXT'));
}

/**
 * Netlify Blobs house rule: site-wide store ONLY on production deploys;
 * deploy-scoped store on deploy previews / branch deploys / dev so previews
 * never overwrite production data.
 */
export function resolveNetlifyStoreMode(context?: NetlifyContextLike): 'site' | 'deploy' {
  const deployContext = context?.deploy?.context ?? readEnv('CONTEXT');
  return deployContext === 'production' ? 'site' : 'deploy';
}

export class MemoryStateStore implements StateStore {
  readonly kind = 'memory' as const;
  private data = new Map<string, string>();

  async getJSON<T>(key: string): Promise<T | null> {
    const raw = this.data.get(key);
    if (raw === undefined) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setJSON<T>(key: string, value: T): Promise<void> {
    this.data.set(key, JSON.stringify(value));
  }

  async setJSONIfNew<T>(key: string, value: T): Promise<boolean> {
    if (this.data.has(key)) return false;
    this.data.set(key, JSON.stringify(value));
    return true;
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }

  async listKeys(prefix: string): Promise<string[]> {
    const out: string[] = [];
    for (const k of this.data.keys()) {
      if (k.startsWith(prefix)) out.push(k);
    }
    return out;
  }

  clear(): void {
    this.data.clear();
  }
}

/**
 * Local Node server store: keeps accounts persisted in `.accounts_db.json`
 * (preserving local dev / AI Studio compatibility) while keeping room/meta keys in memory.
 */
export function createLocalNodeStateStore(accountsDbPath: string): StateStore {
  const mem = new MemoryStateStore();
  return {
    kind: 'local-node',
    async getJSON<T>(key: string): Promise<T | null> {
      if (key === 'accounts/list') {
        return readAccountsDb(accountsDbPath) as unknown as T;
      }
      return mem.getJSON<T>(key);
    },
    async setJSON<T>(key: string, value: T): Promise<void> {
      if (key === 'accounts/list' && Array.isArray(value)) {
        writeAccountsDb(accountsDbPath, value as unknown as DatabaseAccountRecord[]);
        return;
      }
      await mem.setJSON(key, value);
    },
    async setJSONIfNew<T>(key: string, value: T): Promise<boolean> {
      if (key === 'accounts/list') {
        const current = readAccountsDb(accountsDbPath);
        if (current.length > 0) return false;
        if (Array.isArray(value)) {
          writeAccountsDb(accountsDbPath, value as unknown as DatabaseAccountRecord[]);
        }
        return true;
      }
      return mem.setJSONIfNew(key, value);
    },
    async delete(key: string): Promise<void> {
      if (key === 'accounts/list') return;
      await mem.delete(key);
    },
    async listKeys(prefix: string): Promise<string[]> {
      return mem.listKeys(prefix);
    },
  };
}

const STORE_NAME = 'masoi-state';

export function createNetlifyBlobsStateStore(context?: NetlifyContextLike): StateStore {
  const mode = resolveNetlifyStoreMode(context);
  const store =
    mode === 'site'
      ? getStore({ name: STORE_NAME, consistency: 'strong' })
      : getDeployStore({ name: STORE_NAME, consistency: 'strong' });

  return {
    kind: 'netlify-blobs',
    async getJSON<T>(key: string): Promise<T | null> {
      const value = await store.get(key, { type: 'json' });
      return (value ?? null) as T | null;
    },
    async setJSON<T>(key: string, value: T): Promise<void> {
      await store.setJSON(key, value);
    },
    async setJSONIfNew<T>(key: string, value: T): Promise<boolean> {
      const res = await store.setJSON(key, value, { onlyIfNew: true });
      return Boolean(res.modified);
    },
    async delete(key: string): Promise<void> {
      await store.delete(key);
    },
    async listKeys(prefix: string): Promise<string[]> {
      const { blobs } = await store.list({ prefix });
      return blobs.map((b) => b.key);
    },
  };
}
