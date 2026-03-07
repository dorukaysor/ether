import type { APIRoute } from 'astro';
import { getDb } from '../../lib/turso';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const page   = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const limit  = 10;
  const offset = (page - 1) * limit;

  try {
    const db = await getDb();

    const [countResult, rowsResult] = await Promise.all([
      db.execute('SELECT COUNT(*) AS n FROM insights'),
      db.execute({
        sql:  'SELECT id, content, created_at FROM insights ORDER BY id DESC LIMIT ? OFFSET ?',
        args: [limit, offset],
      }),
    ]);

    const total = Number(countResult.rows[0]?.n ?? 0);
    const insights = rowsResult.rows.map((r) => ({
      id:         Number(r.id),
      content:    String(r.content ?? ''),
      created_at: Number(r.created_at),
    }));

    return new Response(JSON.stringify({ insights, total, page, limit }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[get-insights] DB error:', err);
    return new Response(JSON.stringify({ insights: [], total: 0, page: 1, limit: 10 }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
