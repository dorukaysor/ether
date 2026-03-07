import type { APIRoute } from 'astro';
import { getDb } from '../../lib/turso';

export const prerender = false;

// Keys that are allowed to be saved — explicit allowlist prevents arbitrary writes.
const ALLOWED_KEYS = new Set([
  'polling_interval_ms',
  'auto_analyze',
  'relay',
  'data_mode',
  'threshold_idle_max',
  'threshold_happy_drop',
  'threshold_dizzy_spike',
  'threshold_frustrated_w',
  'threshold_frustrated_min',
  'threshold_angry_w',
  // datum admin keys
  'esp32_ip',
  'esp32_hostname',
  'log_endpoint_override',
  'esp32_ota_url',
  'db_max_records',
  'prune_days',
  'gemini_model',
  'insight_context_size',
  'gemini_extra_context',
]);

export const POST: APIRoute = async ({ request }) => {
  const ct = request.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) {
    return json({ error: 'Content-Type must be application/json' }, 400);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Malformed JSON body' }, 400);
  }

  if (!body.settings || typeof body.settings !== 'object') {
    return json({ error: 'Missing field: settings (object)' }, 422);
  }

  const incoming = body.settings as Record<string, unknown>;

  // Filter to allowed keys only, coerce values to strings.
  const pairs = Object.entries(incoming)
    .filter(([k]) => ALLOWED_KEYS.has(k))
    .map(([k, v]) => [k, String(v)] as [string, string]);

  if (pairs.length === 0) {
    return json({ error: 'No valid settings keys provided' }, 422);
  }

  try {
    const db = await getDb();

    // Upsert each key individually (SQLite doesn't support multi-row INSERT OR REPLACE easily with libsql batch).
    await db.batch(
      pairs.map(([k, v]) => ({
        sql:  'INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)',
        args: [k, v],
      })),
      'write',
    );

    return json({ ok: true, saved: pairs.map(([k]) => k) });
  } catch (err) {
    console.error('[save-settings] DB error:', err);
    return json({ error: 'Database error' }, 500);
  }
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
