import { createClient } from '@libsql/client';
import type { Client as LibSQLClient } from '@libsql/client';

function makeClient(): LibSQLClient {
  const url = import.meta.env.TURSO_DATABASE_URL as string | undefined;
  const authToken = import.meta.env.TURSO_AUTH_TOKEN as string | undefined;
  if (!url) throw new Error('TURSO_DATABASE_URL is not set in .env');
  return createClient({ url, authToken });
}

// Module-level promise so CREATE TABLE only runs once per serverless instance.
let _ready: Promise<LibSQLClient> | null = null;

export function getDb(): Promise<LibSQLClient> {
  if (!_ready) {
    _ready = (async () => {
      const client = makeClient();
      // Create tables if they don't exist (runs once per cold start).
      await client.batch(
        [
          {
            sql: `CREATE TABLE IF NOT EXISTS energy_log (
              id          INTEGER PRIMARY KEY AUTOINCREMENT,
              voltage     REAL,
              current     REAL,
              watts       REAL,
              energy      REAL,
              frequency   REAL,
              pf          REAL,
              relay_state INTEGER,
              emotive_state TEXT,
              created_at  INTEGER DEFAULT (unixepoch())
            )`,
            args: [],
          },
          {
            sql: `CREATE TABLE IF NOT EXISTS insights (
              id         INTEGER PRIMARY KEY AUTOINCREMENT,
              content    TEXT,
              created_at INTEGER DEFAULT (unixepoch())
            )`,
            args: [],
          },
          {
            sql: `CREATE TABLE IF NOT EXISTS config (
              key   TEXT PRIMARY KEY,
              value TEXT
            )`,
            args: [],
          },
        ],
        'write',
      );
      return client;
    })();
  }
  return _ready;
}
