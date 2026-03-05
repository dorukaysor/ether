import { createClient } from '@libsql/client';

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
async function getDb() {
  if (globalThis.__tursoClient) return globalThis.__tursoClient;
  const url = "libsql://ether-v1-dorukaysor.aws-ap-south-1.turso.io";
  const token = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzI3NDc0MTMsImlkIjoiMDE5Y2JmZjctOWMwMS03M2Y5LThjNWMtOGFkMWNmYTk3NGMwIiwicmlkIjoiMDlmY2NhNDQtYWE2OC00Y2ZkLTk1ODMtNTAzMzlhNzc0NjI0In0.gNb1aajRHutDYuP-qaEvapBaYpc45G4LGm2eTjYw29_oUmJ-m39iVBZETNrpcrse1TZ9-6YZ9X6JzoLTj83ZAg";
  const client = createClient({ url, authToken: token });
  for (const stmt of SCHEMA.split(";").map((s) => s.trim()).filter(Boolean)) {
    await client.execute(stmt);
  }
  globalThis.__tursoClient = client;
  return client;
}

export { getDb as g };
