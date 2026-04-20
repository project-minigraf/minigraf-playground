/**
 * Minigraf WASM API (from public/wasm/pkg/minigraf.d.ts):
 *
 * export class BrowserDb {
 *   free(): void;
 *   [Symbol.dispose](): void;
 *   checkpoint(): Promise<void>;
 *   execute(datalog: string): Promise<string>;
 *   exportGraph(): Uint8Array;
 *   importGraph(data: Uint8Array): Promise<void>;
 *   static open(db_name: string): Promise<BrowserDb>;
 *   static openInMemory(): BrowserDb;
 * }
 *
 * export default function __wbg_init(...): Promise<InitOutput>;
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { BrowserDb, MinigrafResult, UseMinigrafReturn } from '@/lib/types';

export function useMinigraf(dbName: string = 'minigraf'): UseMinigrafReturn {
  const [db, setDb] = useState<BrowserDb | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let browserDb: BrowserDb | null = null;

    async function initDb() {
      try {
        // @ts-expect-error - WASM module loaded dynamically at runtime
        const wasm = await import('/wasm/pkg/minigraf.js');
        await wasm.default();
        // @ts-expect-error - BrowserDb is exported from WASM module
        browserDb = await BrowserDb.open(dbName);
        setDb(browserDb);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    }

    initDb();

    return () => {
      if (browserDb) {
        browserDb.free();
      }
    };
  }, [dbName]);

  const execute = useCallback(async (datalog: string): Promise<MinigrafResult> => {
    if (!db) {
      throw new Error('Database not initialized');
    }
    const result = await db.execute(datalog);
    return JSON.parse(result);
  }, [db]);

  return { db, isLoading, error, execute };
}
