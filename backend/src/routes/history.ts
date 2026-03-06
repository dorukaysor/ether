// GET /api/history?limit=100&skip=0
// Returns paginated readings sorted newest-first

import { Router, type Request, type Response } from 'express';
import { getDb } from '../lib/db.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(String(req.query.limit ?? '100')), 500);
  const skip  = Math.max(parseInt(String(req.query.skip  ?? '0')),   0);

  try {
    const db       = await getDb();
    const result   = await db.execute({
      sql:  'SELECT * FROM readings ORDER BY id DESC LIMIT ? OFFSET ?',
      args: [limit, skip],
    });
    const countRes = await db.execute('SELECT COUNT(*) as total FROM readings');
    const total    = Number(countRes.rows[0]?.total ?? 0);

    const data = (result.rows as Record<string, unknown>[]).map(r => ({
      readings: {
        voltage:      r.voltage,
        current:      r.current,
        power:        r.power,
        energy:       r.energy,
        frequency:    r.frequency,
        power_factor: r.pf,
      },
      state:     r.state,
      relay:     Boolean(r.relay),
      timestamp: new Date(Number(r.ts) * 1000).toISOString(),
    }));

    res.json({ data, total, limit, skip });
  } catch (err) {
    console.error('[GET /api/history]', err);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
