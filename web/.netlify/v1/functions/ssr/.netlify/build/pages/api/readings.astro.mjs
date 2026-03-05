import { g as getDb } from '../../chunks/db_D2IobrOV.mjs';
export { renderers } from '../../renderers.mjs';

function rowToDoc(row) {
  return {
    readings: {
      voltage: row.voltage,
      current: row.current,
      power: row.power,
      energy: row.energy,
      frequency: row.frequency,
      power_factor: row.pf
    },
    state: row.state,
    relay: Boolean(row.relay),
    timestamp: new Date(Number(row.ts) * 1e3).toISOString()
  };
}
const GET = async () => {
  try {
    const db = await getDb();
    const res = await db.execute("SELECT * FROM readings ORDER BY id DESC LIMIT 1");
    if (!res.rows.length) {
      return new Response(JSON.stringify({ error: "No data yet" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify(rowToDoc(res.rows[0])), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("[GET /api/readings]", err);
    return new Response(JSON.stringify({ error: "Database error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
const POST = async ({ request }) => {
  const secret = request.headers.get("x-api-secret");
  if (secret !== "true") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
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
  const required = ["voltage", "current", "power", "energy", "frequency", "power_factor"];
  for (const field of required) {
    if (typeof b[field] !== "number") {
      return new Response(
        JSON.stringify({ error: `Missing or invalid field: ${field}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  }
  try {
    const db = await getDb();
    await db.execute({
      sql: `INSERT INTO readings (voltage, current, power, energy, frequency, pf, state, relay)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        b.voltage,
        b.current,
        b.power,
        b.energy,
        b.frequency,
        b.power_factor,
        typeof b.state === "string" ? b.state : "idle",
        b.relay !== false ? 1 : 0
      ]
    });
    return new Response(JSON.stringify({ ok: true }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("[POST /api/readings]", err);
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
