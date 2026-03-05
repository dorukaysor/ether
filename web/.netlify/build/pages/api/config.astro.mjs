import { g as getDb } from '../../chunks/db_D2IobrOV.mjs';
export { renderers } from '../../renderers.mjs';

const DEFAULTS = {
  samplingIntervalSec: 2,
  postIntervalSec: 3,
  ledBrightness: 180,
  oledTimeout: 5,
  warnThreshW: 1e3,
  critThreshW: 2500,
  frustMinutes: 15
};
function rowToCfg(row) {
  return {
    samplingIntervalSec: row.sampling_interval ?? DEFAULTS.samplingIntervalSec,
    postIntervalSec: row.post_interval ?? DEFAULTS.postIntervalSec,
    ledBrightness: row.led_brightness ?? DEFAULTS.ledBrightness,
    oledTimeout: row.oled_timeout ?? DEFAULTS.oledTimeout,
    warnThreshW: row.warn_thresh_w ?? DEFAULTS.warnThreshW,
    critThreshW: row.crit_thresh_w ?? DEFAULTS.critThreshW,
    frustMinutes: row.frust_minutes ?? DEFAULTS.frustMinutes,
    updatedAt: new Date(row.updated_at * 1e3).toISOString()
  };
}
const GET = async ({ request }) => {
  const secret = request.headers.get("x-api-secret");
  const isEsp32 = secret === "true";
  try {
    const db = await getDb();
    const res = await db.execute("SELECT * FROM device_config ORDER BY id DESC LIMIT 1");
    const row = res.rows[0];
    const cfg = row ? rowToCfg(row) : { ...DEFAULTS, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    if (isEsp32) {
      return new Response(JSON.stringify(cfg), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ config: cfg, defaults: DEFAULTS }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("[GET /api/config]", err);
    return new Response(JSON.stringify({ error: "Database error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
const POST = async ({ request }) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const b = body;
  const fields = [
    "samplingIntervalSec",
    "postIntervalSec",
    "ledBrightness",
    "oledTimeout",
    "warnThreshW",
    "critThreshW",
    "frustMinutes"
  ];
  for (const f of fields) {
    if (b[f] !== void 0 && typeof b[f] !== "number") {
      return new Response(JSON.stringify({ error: `Field ${f} must be a number` }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
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
        Number(b.postIntervalSec ?? DEFAULTS.postIntervalSec),
        Number(b.ledBrightness ?? DEFAULTS.ledBrightness),
        Number(b.oledTimeout ?? DEFAULTS.oledTimeout),
        Number(b.warnThreshW ?? DEFAULTS.warnThreshW),
        Number(b.critThreshW ?? DEFAULTS.critThreshW),
        Number(b.frustMinutes ?? DEFAULTS.frustMinutes)
      ]
    });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("[POST /api/config]", err);
    return new Response(JSON.stringify({ error: "Database error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
