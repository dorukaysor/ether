// GET  /api/config — Avatar ESP32 polls for its current configuration
// POST /api/config — Dashboard pushes new device config

import { Router, type Request, type Response } from 'express';
import { getDb } from '../lib/db.js';

const router = Router();

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

router.get('/', async (req: Request, res: Response) => {
  const secret  = req.headers['x-api-secret'];
  const isEsp32 = secret === process.env.API_SECRET;

  try {
    const db     = await getDb();
    const result = await db.execute('SELECT * FROM device_config ORDER BY id DESC LIMIT 1');
    const row    = result.rows[0] as Record<string, unknown> | undefined;

    const cfg: DeviceConfig = row
      ? rowToCfg(row)
      : { ...DEFAULTS, updatedAt: new Date().toISOString() };

    if (isEsp32) {
      res.json(cfg);
      return;
    }

    res.json({ config: cfg, defaults: DEFAULTS });
  } catch (err) {
    console.error('[GET /api/config]', err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const b = req.body as Record<string, unknown>;

  const fields = [
    'samplingIntervalSec', 'postIntervalSec', 'ledBrightness',
    'oledTimeout', 'warnThreshW', 'critThreshW', 'frustMinutes',
  ] as const;

  for (const f of fields) {
    if (b[f] !== undefined && typeof b[f] !== 'number') {
      res.status(400).json({ error: `Field ${f} must be a number` });
      return;
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
        Number(b.oledTimeout         ?? DEFAULTS.oledTimeout),
        Number(b.warnThreshW         ?? DEFAULTS.warnThreshW),
        Number(b.critThreshW         ?? DEFAULTS.critThreshW),
        Number(b.frustMinutes        ?? DEFAULTS.frustMinutes),
      ],
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/config]', err);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
