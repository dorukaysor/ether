import { g as getDb } from '../../chunks/db_D2IobrOV.mjs';
export { renderers } from '../../renderers.mjs';

const GET = async ({ url }) => {
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "100"), 500);
  const skip = Math.max(parseInt(url.searchParams.get("skip") ?? "0"), 0);
  try {
    const db = await getDb();
    const res = await db.execute({
      sql: "SELECT * FROM readings ORDER BY id DESC LIMIT ? OFFSET ?",
      args: [limit, skip]
    });
    const countRes = await db.execute("SELECT COUNT(*) as total FROM readings");
    const total = Number(countRes.rows[0]?.total ?? 0);
    const data = res.rows.map((row) => {
      const r = row;
      return {
        readings: {
          voltage: r.voltage,
          current: r.current,
          power: r.power,
          energy: r.energy,
          frequency: r.frequency,
          power_factor: r.pf
        },
        state: r.state,
        relay: Boolean(r.relay),
        timestamp: new Date(Number(r.ts) * 1e3).toISOString()
      };
    });
    return new Response(JSON.stringify({ data, total, limit, skip }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("[GET /api/history]", err);
    return new Response(JSON.stringify({ error: "Database error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
