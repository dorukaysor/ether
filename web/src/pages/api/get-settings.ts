import type { APIRoute } from 'astro';
import { getDb } from '../../lib/turso';

export const prerender = false;

// Default values returned when a key has never been saved.
const DEFAULTS: Record<string, string> = {
  polling_interval_ms:    '3000',
  auto_analyze:           'false',
  relay:                  '1',
  threshold_idle_max:     '300',
  threshold_happy_drop:   '50',
  threshold_dizzy_spike:  '100',
  threshold_frustrated_w: '1000',
  threshold_frustrated_min:'15',
  threshold_angry_w:      '2500',
  // datum admin defaults
  db_max_records:         '5000',
  prune_days:             '90',
  gemini_model:           'gemini-2.0-flash-exp',
  insight_context_size:   '50',
};

export const GET: APIRoute = async (ctx) => {
  // Env-var presence flags — we only expose a boolean, never the values.
  const env = {
    TURSO_DATABASE_URL: Boolean(ctx.locals.runtime?.env?.TURSO_DATABASE_URL ?? import.meta.env.TURSO_DATABASE_URL),
    TURSO_AUTH_TOKEN:   Boolean(ctx.locals.runtime?.env?.TURSO_AUTH_TOKEN   ?? import.meta.env.TURSO_AUTH_TOKEN),
    GEMINI_API_KEY:     Boolean(ctx.locals.runtime?.env?.GEMINI_API_KEY     ?? import.meta.env.GEMINI_API_KEY),
  };

  try {
    const db = await getDb();
    const result = await db.execute('SELECT key, value FROM config');

    // Start from defaults, then overlay whatever is in DB.
    const settings = { ...DEFAULTS };
    for (const row of result.rows) {
      settings[String(row.key)] = String(row.value ?? '');
    }

    return new Response(JSON.stringify({ settings, env }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[get-settings] DB error:', err);
    return new Response(JSON.stringify({ settings: DEFAULTS, env }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
