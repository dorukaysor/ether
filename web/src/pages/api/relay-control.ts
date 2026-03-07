import type { APIRoute } from 'astro';
import { getDb } from '../../lib/turso';

export const prerender = false;

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

  if (typeof body.relay !== 'boolean') {
    return json({ error: 'Missing field: relay (boolean)' }, 422);
  }

  try {
    const db = await getDb();
    // Upsert: SQLite INSERT OR REPLACE is safe here since config has only key + value.
    await db.execute({
      sql: `INSERT OR REPLACE INTO config (key, value) VALUES ('relay', ?)`,
      args: [body.relay ? '1' : '0'],
    });
    return json({ ok: true, relay: body.relay });
  } catch (err) {
    console.error('[relay-control] DB error:', err);
    return json({ error: 'Database error' }, 500);
  }
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
