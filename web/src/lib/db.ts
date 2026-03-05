import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

// Store the DB file next to the project root (outside src/ so it isn't wiped by builds)
const DB_DIR  = path.resolve('data');
const DB_PATH = path.join(DB_DIR, 'ether.db');

declare global {
  // eslint-disable-next-line no-var
  var __sqliteDb: Database.Database | undefined;
}

function openDb(): Database.Database {
  if (globalThis.__sqliteDb) return globalThis.__sqliteDb;

  fs.mkdirSync(DB_DIR, { recursive: true });
  const db = new Database(DB_PATH);

  // WAL mode for better concurrent read/write performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // ── Schema ────────────────────────────────────────────────────────────────
  db.exec(`
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
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      sampling_interval    INTEGER NOT NULL DEFAULT 2,
      post_interval        INTEGER NOT NULL DEFAULT 3,
      led_brightness       INTEGER NOT NULL DEFAULT 180,
      oled_timeout         INTEGER NOT NULL DEFAULT 5,
      warn_thresh_w        REAL    NOT NULL DEFAULT 1000,
      crit_thresh_w        REAL    NOT NULL DEFAULT 2500,
      frust_minutes        INTEGER NOT NULL DEFAULT 15,
      updated_at           INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);

  globalThis.__sqliteDb = db;
  return db;
}

export function getDb(): Database.Database {
  return openDb();
}
