// POST /api/relay  — Dashboard sends relay command
// GET  /api/relay  — Avatar polls for pending relay commands

import { Router, type Request, type Response } from 'express';
import { getDb } from '../lib/db.js';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const b = req.body as Record<string, unknown>;
  if (typeof b.state !== 'boolean') {
    res.status(400).json({ error: 'state must be a boolean' });
    return;
  }

  try {
    const db = await getDb();
    await db.execute({
      sql:  'INSERT INTO relay_commands (state) VALUES (?)',
      args: [b.state ? 1 : 0],
    });

    res.json({ ok: true, relay: b.state });
  } catch (err) {
    console.error('[POST /api/relay]', err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  const secret = req.headers['x-api-secret'];
  if (secret !== process.env.API_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const db     = await getDb();
    const result = await db.execute(
      'SELECT * FROM relay_commands WHERE executed = 0 ORDER BY id DESC LIMIT 1'
    );

    if (!result.rows.length) {
      res.json({ pending: false });
      return;
    }

    const cmd = result.rows[0] as Record<string, unknown>;
    await db.execute({
      sql:  'UPDATE relay_commands SET executed = 1 WHERE id = ?',
      args: [cmd.id as number],
    });

    res.json({ pending: true, state: Boolean(cmd.state) });
  } catch (err) {
    console.error('[GET /api/relay]', err);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
