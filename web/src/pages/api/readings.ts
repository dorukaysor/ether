// POST /api/readings  — Avatar ESP32 sends data here
// GET  /api/readings  — Dashboard polls for latest reading

import type { APIRoute } from 'astro';
import { getDb } from '../../lib/db';

function rowToDoc(row: Record<string, unknown>) {
  return {
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
  };
}

export const GET: APIRoute = () => {
  try {
    const db  = getDb();
    const row = db.prepare('SELECT * FROM readings ORDER BY id DESC LIMIT 1').get() as Record<string, unknown> | undefined;

    if (!row) {
      return new Response(JSON.stringify({ error: 'No data yet' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(rowToDoc(row)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[GET /api/readings]', err);
    return new Response(JSON.stringify({ error: 'Database error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  const secret = request.headers.get('x-api-secret');
  if (secret !== import.meta.env.API_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const b = body as Record<string, unknown>;
  const required = ['voltage', 'current', 'power', 'energy', 'frequency', 'power_factor'];
  for (const field of required) {
    if (typeof b[field] !== 'number') {
      return new Response(
        JSON.stringify({ error: `Missing or invalid field: ${field}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }
  }

  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO readings (voltage, current, power, energy, frequency, pf, state, relay)
      VALUES (@voltage, @current, @power, @energy, @frequency, @pf, @state, @relay)
    `).run({
      voltage:   b.voltage,
      current:   b.current,
      power:     b.power,
      energy:    b.energy,
      frequency: b.frequency,
      pf:        b.power_factor,
      state:     typeof b.state === 'string' ? b.state : 'idle',
      relay:     b.relay !== false ? 1 : 0,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[POST /api/readings]', err);
    return new Response(JSON.stringify({ error: 'Database error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
