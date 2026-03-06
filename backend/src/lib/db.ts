import { createClient, type Client } from '@libsql/client';

declare global {
  // eslint-disable-next-line no-var
  var __tursoClient: Client | undefined;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS readings (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    voltage   REAL    NOT NULL,
    current   REAL    NOT NULL,
    power     REAL    NOT NULL,
    energy    REAL    NOT NULL,
    frequency REAL    NOT NULL,
    pf        REAL    NOT NULL,
    state     TEXT    NOT NULL DEFAULT 'idle',
    relay     INTEGER NOT NULL DEFAULT 1,
    ts        INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS relay_commands (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    state    INTEGER NOT NULL,
    executed INTEGER NOT NULL DEFAULT 0,
    ts       INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS device_config (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    sampling_interval INTEGER NOT NULL DEFAULT 2,
    post_interval     INTEGER NOT NULL DEFAULT 3,
    led_brightness    INTEGER NOT NULL DEFAULT 180,
    oled_timeout      INTEGER NOT NULL DEFAULT 5,
    warn_thresh_w     REAL    NOT NULL DEFAULT 1000,
    crit_thresh_w     REAL    NOT NULL DEFAULT 2500,
    frust_minutes     INTEGER NOT NULL DEFAULT 15,
    updated_at        INTEGER NOT NULL DEFAULT (unixepoch())
  );
`;

export async function getDb(): Promise<Client> {
  if (globalThis.__tursoClient) return globalThis.__tursoClient;

  const url   = process.env.TURSO_DB_URL   as string;
  const token = process.env.TURSO_DB_TOKEN  as string;

  if (!url) throw new Error('TURSO_DB_URL is not set');

  const client = createClient({ url, authToken: token });

  for (const stmt of SCHEMA.split(';').map(s => s.trim()).filter(Boolean)) {
    await client.execute(stmt);
  }

  globalThis.__tursoClient = client;
  return client;
}
