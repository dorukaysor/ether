// GET  /api/config — Avatar ESP32 polls this for its current configuration
// POST /api/config — Dashboard pushes new device config (no secret required — same-origin)

import type { APIRoute } from 'astro';
import { getDb } from '../../lib/db';

export interface DeviceConfig {
  samplingIntervalSec: number;
  postIntervalSec:     number;
  ledBrightness:       number;
  oledTimeout:         number;
  warnThreshW:         number;
  critThreshW:         number;
  frustMinutes:        number;
  updatedAt:           string;
}

const DEFAULTS: Omit<DeviceConfig, 'updatedAt'> = {
  samplingIntervalSec: 2,
  postIntervalSec:     3,
  ledBrightness:       180,
  oledTimeout:         5,
  warnThreshW:         1000,
  critThreshW:         2500,
  frustMinutes:        15,
};

function rowToCfg(row: Record<string, unknown>): DeviceConfig {
  return {
    samplingIntervalSec: (row.sampling_interval as number) ?? DEFAULTS.samplingIntervalSec,
    postIntervalSec:     (row.post_interval     as number) ?? DEFAULTS.postIntervalSec,
    ledBrightness:       (row.led_brightness    as number) ?? DEFAULTS.ledBrightness,
    oledTimeout:         (row.oled_timeout      as number) ?? DEFAULTS.oledTimeout,
    warnThreshW:         (row.warn_thresh_w     as number) ?? DEFAULTS.warnThreshW,
    critThreshW:         (row.crit_thresh_w     as number) ?? DEFAULTS.critThreshW,
    frustMinutes:        (row.frust_minutes     as number) ?? DEFAULTS.frustMinutes,
    updatedAt:           new Date((row.updated_at as number) * 1000).toISOString(),
  };
}

export const GET: APIRoute = async ({ request }) => {
  const secret  = request.headers.get('x-api-secret');
  const isEsp32 = secret === import.meta.env.API_SECRET;

  try {
    const db  = await getDb();
    const res = await db.execute('SELECT * FROM device_config ORDER BY id DESC LIMIT 1');
    const row = res.rows[0] as Record<string, unknown> | undefined;

    const cfg: DeviceConfig = row
      ? rowToCfg(row)
      : { ...DEFAULTS, updatedAt: new Date().toISOString() };

    if (isEsp32) {
      return new Response(JSON.stringify(cfg), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ config: cfg, defaults: DEFAULTS }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[GET /api/config]', err);
    return new Response(JSON.stringify({ error: 'Database error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try { body = await request.json(); }
  catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const b = body as Record<string, unknown>;

  const fields: (keyof Omit<DeviceConfig, 'updatedAt'>)[] = [
    'samplingIntervalSec', 'postIntervalSec', 'ledBrightness',
    'oledTimeout', 'warnThreshW', 'critThreshW', 'frustMinutes',
  ];
  for (const f of fields) {
    if (b[f] !== undefined && typeof b[f] !== 'number') {
      return new Response(JSON.stringify({ error: `Field ${f} must be a number` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  try {
    const db = await getDb();
    await db.execute({
      sql: `INSERT INTO device_config
              (sampling_interval, post_interval, led_brightness, oled_timeout, warn_thresh_w, crit_thresh_w, frust_minutes)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        Number(b.samplingIntervalSec ?? DEFAULTS.samplingIntervalSec),
        Number(b.postIntervalSec     ?? DEFAULTS.postIntervalSec),
        Number(b.ledBrightness       ?? DEFAULTS.ledBrightness),
        Number(b.oledTimeout          ?? DEFAULTS.oledTimeout),
        Number(b.warnThreshW          ?? DEFAULTS.warnThreshW),
        Number(b.critThreshW          ?? DEFAULTS.critThreshW),
        Number(b.frustMinutes          ?? DEFAULTS.frustMinutes),
      ],
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[POST /api/config]', err);
    return new Response(JSON.stringify({ error: 'Database error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
