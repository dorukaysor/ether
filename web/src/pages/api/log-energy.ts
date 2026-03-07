import type { APIRoute } from 'astro';
import { getDb } from '../../lib/turso';

export const prerender = false;

const VALID_EMOTIVE_STATES = new Set(['cyan', 'pink', 'yellow', 'purple', 'red']);

export const POST: APIRoute = async ({ request }) => {
  // ── Input validation ──────────────────────────────────────────────────────
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

  const numericFields = ['voltage', 'current', 'watts', 'energy', 'frequency', 'pf'] as const;
  for (const field of numericFields) {
    if (typeof body[field] !== 'number' || !isFinite(body[field] as number)) {
      return json({ error: `Missing or invalid field: ${field} (must be a finite number)` }, 422);
    }
  }

  // Sanitise optional fields — fall back to safe defaults.
  const emotiveState =
    typeof body.emotiveState === 'string' && VALID_EMOTIVE_STATES.has(body.emotiveState)
      ? body.emotiveState
      : 'cyan';

  const relayState = body.relayState === true ? 1 : 0;

  // ── Insert ────────────────────────────────────────────────────────────────
  try {
    const db = await getDb();
    await db.execute({
      sql: `INSERT INTO energy_log
              (voltage, current, watts, energy, frequency, pf, relay_state, emotive_state)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        body.voltage as number,
        body.current as number,
        body.watts   as number,
        body.energy  as number,
        body.frequency as number,
        body.pf      as number,
        relayState,
        emotiveState,
      ],
    });
    return json({ ok: true }, 201);
  } catch (err) {
    console.error('[log-energy] DB error:', err);
    return json({ error: 'Database error' }, 500);
  }
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
