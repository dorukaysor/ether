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
    timestamp: new Date(Number(row.ts) * 1000).toISOString(),
  };
}

export const GET: APIRoute = async () => {
  try {
    const db  = await getDb();
    const res = await db.execute('SELECT * FROM readings ORDER BY id DESC LIMIT 1');

    if (!res.rows.length) {
      return new Response(JSON.stringify({ error: 'No data yet' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(rowToDoc(res.rows[0] as Record<string, unknown>)), {
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
    const db = await getDb();
    await db.execute({
      sql: `INSERT INTO readings (voltage, current, power, energy, frequency, pf, state, relay)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        b.voltage   as number,
        b.current   as number,
        b.power     as number,
        b.energy    as number,
        b.frequency as number,
        b.power_factor as number,
        typeof b.state === 'string' ? b.state : 'idle',
        b.relay !== false ? 1 : 0,
      ],
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
