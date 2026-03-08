import type { APIRoute } from 'astro';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDb } from '../../lib/turso';

export const prerender = false;

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(rows: {
  watts: number; voltage: number; current: number;
  pf: number; emotive_state: string; created_at: number;
}[]): string {
  if (rows.length === 0) {
    return 'There is no energy data available for the last 24 hours. Provide a brief friendly message about what Ether will be able to tell the user once data starts flowing in.';
  }

  const totalWh      = rows.reduce((s, r) => s + r.watts / 12, 0); // approx (5-min intervals)
  const avgWatts     = rows.reduce((s, r) => s + r.watts, 0) / rows.length;
  const peakWatts    = Math.max(...rows.map((r) => r.watts));
  const avgPF        = rows.reduce((s, r) => s + r.pf, 0) / rows.length;
  const stateCounts  = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.emotive_state] = (acc[r.emotive_state] ?? 0) + 1;
    return acc;
  }, {});
  const dominantState = Object.entries(stateCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'cyan';
  const stateList     = Object.entries(stateCounts)
    .map(([s, c]) => `${s} (${c} readings)`)
    .join(', ');
  const from = new Date(rows[0].created_at * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const to   = new Date(rows[rows.length - 1].created_at * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return `You are Ether — an intelligent, slightly emotive IoT energy monitor. Analyze the following 24-hour energy snapshot and write a human-friendly insight paragraph (2–4 sentences, no bullet points, no markdown). Be analytical but slightly personable. Mention anomalies, efficiency tips, or emotive patterns if interesting.

Data summary (last 24 h, ${rows.length} readings from ${from} to ${to}):
- Estimated energy consumed: ${totalWh.toFixed(0)} Wh (~${(totalWh / 1000).toFixed(3)} kWh)
- Average active power: ${avgWatts.toFixed(1)} W
- Peak power: ${peakWatts.toFixed(1)} W
- Average power factor: ${avgPF.toFixed(2)}
- Dominant emotive state: ${dominantState}
- State distribution: ${stateList}

Write the insight now:`;
}

// ── Route ─────────────────────────────────────────────────────────────────────

export const POST: APIRoute = async () => {
  const geminiKey = (import.meta.env.GEMINI_KEY || process.env.GEMINI_KEY) as string | undefined;
  if (!geminiKey) {
    return json({ error: 'GEMINI_KEY is not configured' }, 503);
  }

  try {
    const db = await getDb();

    // Pull last 24 h of readings (max 500 rows for prompt safety).
    const since = Math.floor(Date.now() / 1000) - 86400;
    const result = await db.execute({
      sql: `SELECT watts, voltage, current, pf, emotive_state, created_at
            FROM energy_log
            WHERE created_at >= ?
            ORDER BY created_at ASC
            LIMIT 500`,
      args: [since],
    });

    const rows = result.rows.map((r) => ({
      watts:         Number(r.watts),
      voltage:       Number(r.voltage),
      current:       Number(r.current),
      pf:            Number(r.pf),
      emotive_state: String(r.emotive_state ?? 'cyan'),
      created_at:    Number(r.created_at),
    }));

    const prompt = buildPrompt(rows);

    // Use the model saved in config, fall back to gemini-2.0-flash.
    const modelRow = await db.execute({
      sql:  `SELECT value FROM config WHERE key = 'gemini_model' LIMIT 1`,
      args: [],
    });
    const modelName = (modelRow.rows[0]?.value as string | undefined) ?? 'gemini-2.0-flash';

    // Call Gemini.
    const genAI  = new GoogleGenerativeAI(geminiKey);
    const model  = genAI.getGenerativeModel({ model: modelName });
    const result2 = await model.generateContent(prompt);
    const content = result2.response.text().trim();

    // Persist the insight.
    await db.execute({
      sql:  `INSERT INTO insights (content) VALUES (?)`,
      args: [content],
    });

    return json({ ok: true, content });
  } catch (err) {
    console.error('[generate-insight] error:', err);
    return json({ error: String(err) }, 500);
  }
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
