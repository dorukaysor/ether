// Seed script — inserts 60 realistic power readings spread over the last 10 minutes
// Run with: node scripts/seed.mjs

import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH   = path.resolve(__dirname, '../data/ether.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

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
  )
`);

const insert = db.prepare(`
  INSERT INTO readings (voltage, current, power, energy, frequency, pf, state, relay, ts)
  VALUES (@voltage, @current, @power, @energy, @frequency, @pf, @state, @relay, @ts)
`);

const now    = Math.floor(Date.now() / 1000);
const COUNT  = 60;

// Simulate a realistic household load — base ~150W with occasional spikes
const states = ['normal', 'normal', 'normal', 'warning', 'normal', 'frustrated'];

const insertMany = db.transaction(() => {
  for (let i = 0; i < COUNT; i++) {
    const t        = now - (COUNT - i) * 10; // one reading every 10 seconds
    const spike    = i > 40 && i < 50;       // simulate a power spike mid-session
    const basePow  = spike ? 1800 + Math.random() * 400 : 120 + Math.random() * 80;
    const voltage  = 220 + (Math.random() - 0.5) * 8;          // 216–224 V
    const pf       = spike ? 0.88 + Math.random() * 0.05 : 0.92 + Math.random() * 0.06;
    const current  = basePow / (voltage * pf);
    const power    = voltage * current * pf;
    const freq     = 49.95 + Math.random() * 0.1;
    const energy   = 0.5 + i * (power / 3600 / 100); // cumulative kWh estimate
    const state    = spike ? 'warning' : states[i % states.length];

    insert.run({
      voltage:   +voltage.toFixed(2),
      current:   +current.toFixed(3),
      power:     +power.toFixed(1),
      energy:    +energy.toFixed(4),
      frequency: +freq.toFixed(2),
      pf:        +pf.toFixed(3),
      state,
      relay: 1,
      ts:    t,
    });
  }
});

insertMany();
console.log(`✓ Inserted ${COUNT} sample readings into ${DB_PATH}`);
db.close();
