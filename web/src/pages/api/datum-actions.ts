/**
 * datum-actions — Admin-only API endpoint.
 * Called exclusively by DatumPage.tsx.
 *
 * Supported actions:
 *   get_stats      — read-only: record counts
 *   export_all     — read-only: return all energy_log rows as JSON (≤10 000)
 *   purge_history  — delete rows older than `olderThanDays` (0 = all)
 *   reset_config   — delete all config table entries
 */
import type { APIRoute } from 'astro';
import { getDb } from '../../lib/turso';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const ct = request.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) {
    return json({ error: 'Content-Type must be application/json' }, 400);
  }

  let body: { action?: string; params?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Malformed JSON body' }, 400);
  }

  const { action, params = {} } = body;
  if (!action || typeof action !== 'string') {
    return json({ error: 'Missing field: action' }, 422);
  }

  try {
    const db = await getDb();

    switch (action) {

      // ── Read-only stats ────────────────────────────────────────────────────
      case 'get_stats': {
        const [logCount, cfgCount] = await Promise.all([
          db.execute('SELECT COUNT(*) AS n FROM energy_log'),
          db.execute('SELECT COUNT(*) AS n FROM config'),
        ]);
        return json({
          ok:              true,
          energyLogCount:  Number(logCount.rows[0]?.n  ?? 0),
          configCount:     Number(cfgCount.rows[0]?.n  ?? 0),
        });
      }

      // ── Full export ────────────────────────────────────────────────────────
      case 'export_all': {
        const result = await db.execute(
          'SELECT id, voltage, current, watts, energy, frequency, pf, relay_state, emotive_state, created_at FROM energy_log ORDER BY id ASC LIMIT 10000',
        );
        const rows = result.rows.map((r) => ({
          id:            Number(r.id),
          voltage:       Number(r.voltage),
          current:       Number(r.current),
          watts:         Number(r.watts),
          energy:        Number(r.energy),
          frequency:     Number(r.frequency),
          pf:            Number(r.pf),
          relay_state:   Number(r.relay_state),
          emotive_state: String(r.emotive_state ?? ''),
          created_at:    Number(r.created_at),
        }));
        return json({ ok: true, rows });
      }

      // ── Purge history ──────────────────────────────────────────────────────
      case 'purge_history': {
        const olderThanDays = Number(params?.olderThanDays ?? 0);
        let result;
        if (olderThanDays > 0) {
          const cutoff = Math.floor(Date.now() / 1000) - olderThanDays * 86400;
          result = await db.execute({
            sql:  'DELETE FROM energy_log WHERE created_at < ?',
            args: [cutoff],
          });
        } else {
          result = await db.execute('DELETE FROM energy_log');
        }
        return json({
          ok:      true,
          deleted: result.rowsAffected,
          message: `Deleted ${result.rowsAffected} record${result.rowsAffected === 1 ? '' : 's'}`,
        });
      }

      // ── Reset config ───────────────────────────────────────────────────────
      case 'reset_config': {
        const result = await db.execute('DELETE FROM config');
        return json({
          ok:      true,
          deleted: result.rowsAffected,
          message: `Config reset (${result.rowsAffected} entries removed)`,
        });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 422);
    }
  } catch (err) {
    console.error('[datum-actions] error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
