import type { APIRoute } from 'astro';
import { getDb } from '../../lib/turso';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const db = await getDb();

    // Fetch last 10 energy readings (newest first) + latest AI insight in parallel.
    const [readingsResult, insightResult] = await Promise.all([
      db.execute('SELECT * FROM energy_log ORDER BY id DESC LIMIT 10'),
      db.execute('SELECT content, created_at FROM insights ORDER BY id DESC LIMIT 1'),
    ]);

    const readings = readingsResult.rows.map((r) => ({
      id:            Number(r.id),
      voltage:       Number(r.voltage),
      current:       Number(r.current),
      watts:         Number(r.watts),
      energy:        Number(r.energy),
      frequency:     Number(r.frequency),
      pf:            Number(r.pf),
      relay_state:   Number(r.relay_state),
      emotive_state: String(r.emotive_state ?? 'cyan'),
      created_at:    Number(r.created_at),
    }));

    const latestInsight =
      insightResult.rows.length > 0
        ? {
            content:    String(insightResult.rows[0].content ?? ''),
            created_at: Number(insightResult.rows[0].created_at),
          }
        : null;

    return new Response(JSON.stringify({ readings, latestInsight }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[get-latest] DB error:', err);
    return new Response(JSON.stringify({ readings: [], latestInsight: null }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
