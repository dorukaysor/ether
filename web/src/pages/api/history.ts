// GET /api/history?limit=100&skip=0
// Returns paginated readings sorted newest-first

import type { APIRoute } from 'astro';
import { getDb } from '../../lib/db';

export const GET: APIRoute = async ({ url }) => {
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100'), 500);
  const skip  = Math.max(parseInt(url.searchParams.get('skip')  ?? '0'),   0);

  try {
    const db  = await getDb();
    const res = await db.execute({
      sql:  'SELECT * FROM readings ORDER BY id DESC LIMIT ? OFFSET ?',
      args: [limit, skip],
    });
    const countRes = await db.execute('SELECT COUNT(*) as total FROM readings');
    const total    = Number(countRes.rows[0]?.total ?? 0);

    const data = res.rows.map((row) => {
      const r = row as Record<string, unknown>;
      return {
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
      };
    });

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
