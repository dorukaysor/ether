import { g as getDb } from '../../chunks/db_D2IobrOV.mjs';
export { renderers } from '../../renderers.mjs';

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
  if (typeof b.state !== "boolean") {
    return new Response(JSON.stringify({ error: "state must be a boolean" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const db = await getDb();
    await db.execute({
      sql: "INSERT INTO relay_commands (state) VALUES (?)",
      args: [b.state ? 1 : 0]
    });
    return new Response(JSON.stringify({ ok: true, relay: b.state }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("[POST /api/relay]", err);
    return new Response(JSON.stringify({ error: "Database error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
const GET = async ({ request }) => {
  const secret = request.headers.get("x-api-secret");
  if (secret !== "true") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const db = await getDb();
    const res = await db.execute(
      "SELECT * FROM relay_commands WHERE executed = 0 ORDER BY id DESC LIMIT 1"
    );
    if (!res.rows.length) {
      return new Response(JSON.stringify({ pending: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    const cmd = res.rows[0];
    await db.execute({
      sql: "UPDATE relay_commands SET executed = 1 WHERE id = ?",
      args: [cmd.id]
    });
    return new Response(JSON.stringify({ pending: true, state: Boolean(cmd.state) }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("[GET /api/relay]", err);
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
