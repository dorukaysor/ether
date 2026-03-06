// POST /api/readings  — Avatar ESP32 sends data here
// GET  /api/readings  — Dashboard polls for latest reading

import { Router, type Request, type Response } from 'express';
import { getDb } from '../lib/db.js';
import { broadcast } from '../lib/wss.js';

const router = Router();

function rowToDoc(row: Record<string, unknown>) {
  return {
    readings: {
      voltage:      row.voltage,
      current:      row.current,
      power:        row.power,
      energy:       row.energy,
      frequency:    row.frequency,
      power_factor: row.pf,
    },
    state:     row.state,
    relay:     Boolean(row.relay),
    timestamp: new Date(Number(row.ts) * 1000).toISOString(),
  };
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const db  = await getDb();
    const result = await db.execute('SELECT * FROM readings ORDER BY id DESC LIMIT 1');

    if (!result.rows.length) {
      res.status(404).json({ error: 'No data yet' });
      return;
    }

    res.json(rowToDoc(result.rows[0] as Record<string, unknown>));
  } catch (err) {
    console.error('[GET /api/readings]', err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const secret = req.headers['x-api-secret'];
  if (secret !== process.env.API_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const b = req.body as Record<string, unknown>;
  const required = ['voltage', 'current', 'power', 'energy', 'frequency', 'power_factor'];
  for (const field of required) {
    if (typeof b[field] !== 'number') {
      res.status(400).json({ error: `Missing or invalid field: ${field}` });
      return;
    }
  }

  try {
    const db = await getDb();
    await db.execute({
      sql: `INSERT INTO readings (voltage, current, power, energy, frequency, pf, state, relay)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        b.voltage        as number,
        b.current        as number,
        b.power          as number,
        b.energy         as number,
        b.frequency      as number,
        b.power_factor   as number,
        typeof b.state === 'string' ? b.state : 'idle',
        b.relay !== false ? 1 : 0,
      ],
    });

    // Broadcast the new reading to all connected WebSocket clients
    const newReading = rowToDoc({
      voltage: b.voltage, current: b.current, power: b.power,
      energy: b.energy, frequency: b.frequency, pf: b.power_factor,
      state: typeof b.state === 'string' ? b.state : 'idle',
      relay: b.relay !== false ? 1 : 0,
      ts: Math.floor(Date.now() / 1000),
    } as Record<string, unknown>);
    broadcast({ type: 'reading', data: newReading });

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[POST /api/readings]', err);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
