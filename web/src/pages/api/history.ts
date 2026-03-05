// GET /api/history?limit=100&skip=0
// Returns paginated readings sorted newest-first

import type { APIRoute } from 'astro';
import { getDb } from '../../lib/db';

export const GET: APIRoute = ({ url }) => {
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100'), 500);
  const skip  = Math.max(parseInt(url.searchParams.get('skip')  ?? '0'),   0);

  try {
    const db   = getDb();
    const rows = db.prepare(
      'SELECT * FROM readings ORDER BY id DESC LIMIT ? OFFSET ?'
    ).all(limit, skip) as Record<string, unknown>[];

    const { total } = db.prepare('SELECT COUNT(*) as total FROM readings').get() as { total: number };

    const data = rows.map(row => ({
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
      timestamp: new Date((row.ts as number) * 1000).toISOString(),
    }));

    return new Response(JSON.stringify({ data, total, limit, skip }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[GET /api/history]', err);
    return new Response(JSON.stringify({ error: 'Database error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
