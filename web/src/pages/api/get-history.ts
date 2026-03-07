import type { APIRoute } from 'astro';
import { getDb } from '../../lib/turso';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  // ── Query params ───────────────────────────────────────────────────────────
  const page    = Math.max(1, parseInt(url.searchParams.get('page')  ?? '1',  10));
  const limit   = 20;
  const offset  = (page - 1) * limit;

  // ISO date strings (YYYY-MM-DD) or unix timestamps, both accepted.
  const fromRaw = url.searchParams.get('from');
  const toRaw   = url.searchParams.get('to');

  // Convert to unix epoch seconds for Turso comparison.
  const fromTs = fromRaw ? toUnix(fromRaw) : null;
  // "to" date is inclusive — push to end of that day.
  const toTs   = toRaw   ? toUnix(toRaw) + 86399 : null;

  try {
    const db = await getDb();

    // Build WHERE clause dynamically — no raw interpolation, only bound params.
    const conditions: string[] = [];
    const args: (string | number)[] = [];

    if (fromTs !== null)  { conditions.push('created_at >= ?'); args.push(fromTs); }
    if (toTs   !== null)  { conditions.push('created_at <= ?'); args.push(toTs);   }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Run count + page rows + chart data in parallel.
    const [countResult, rowsResult, chartResult] = await Promise.all([
      db.execute({ sql: `SELECT COUNT(*) AS n FROM energy_log ${where}`, args }),
      db.execute({
        sql: `SELECT * FROM energy_log ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
        args: [...args, limit, offset],
      }),
      // Full time-series for the AreaChart (capped at 500 points for performance).
      db.execute({
        sql: `SELECT watts, emotive_state, created_at FROM energy_log ${where}
              ORDER BY id ASC LIMIT 500`,
        args,
      }),
    ]);

    const total = Number(countResult.rows[0]?.n ?? 0);

    const rows = rowsResult.rows.map((r) => ({
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

    const chartSeries = chartResult.rows.map((r) => ({
      watts:         Number(r.watts),
      emotive_state: String(r.emotive_state ?? 'cyan'),
      created_at:    Number(r.created_at),
    }));

    // Hourly averages for the BarChart.
    const hourlyMap = new Map<number, { sum: number; count: number }>();
    for (const r of chartSeries) {
      const hour = Math.floor(r.created_at / 3600); // unix hour bucket
      const prev = hourlyMap.get(hour) ?? { sum: 0, count: 0 };
      hourlyMap.set(hour, { sum: prev.sum + r.watts, count: prev.count + 1 });
    }
    const hourly = Array.from(hourlyMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([h, { sum, count }]) => ({
        hour:    new Date(h * 3600 * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        avgWatts: parseFloat((sum / count).toFixed(1)),
      }));

    // Emotive state counts for the PieChart.
    const emotiveCount: Record<string, number> = {};
    for (const r of chartSeries) {
      emotiveCount[r.emotive_state] = (emotiveCount[r.emotive_state] ?? 0) + 1;
    }
    const emotiePie = Object.entries(emotiveCount).map(([state, value]) => ({ state, value }));

    return new Response(
      JSON.stringify({ rows, total, page, limit, chartSeries, hourly, emotiePie }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[get-history] DB error:', err);
    return new Response(JSON.stringify({ error: 'Database error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

function toUnix(s: string): number {
  // If already a number string, use directly.
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  const d = new Date(s);
  return isNaN(d.getTime()) ? 0 : Math.floor(d.getTime() / 1000);
}
