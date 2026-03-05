// POST /api/analysis
// Fetches recent readings from MongoDB (or accepts them in body),
// builds a prompt, and streams Gemini's response back as JSON.

import type { APIRoute } from 'astro';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDb } from '../../lib/db';

const MOCK_ANALYSIS = {
  summary: "Your home's energy usage looks stable over the past hour. Average power draw is around 145 W, which is within normal range for a residential setup.",
  insights: [
    {
      type: 'info',
      title: 'Stable Consumption',
      body: 'Power readings have remained between 80–180 W with no significant spikes detected. This is consistent with low-load appliances being active.'
    },
    {
      type: 'warning',
      title: 'Minor Voltage Fluctuations',
      body: 'Voltage dipped to 218 V twice in the last 30 minutes. While not dangerous, repeated fluctuations can shorten appliance lifespans. Consider a voltage stabiliser if this persists.'
    },
    {
      type: 'tip',
      title: 'Efficiency Opportunity',
      body: 'Power factor is averaging 0.94. Improving it closer to 1.0 by reducing reactive loads (e.g. old motors, cheap chargers) could reduce your electricity bill by up to 6%.'
    },
    {
      type: 'info',
      title: 'Peak Usage Window',
      body: 'Your highest draw typically occurs between 7 PM – 10 PM. Shifting heavy loads like washing machines or water heaters to off-peak hours can reduce costs significantly.'
    }
  ],
  advice: 'Overall your system is healthy. Keep an eye on the voltage dips — if they become frequent, it may indicate a grid supply issue worth reporting to your utility provider.',
  risk_level: 'low',
  generated_at: new Date().toISOString(),
};

async function sendTelegramAlert(parsed: { summary: string; risk_level: string; advice: string }) {
  const token  = import.meta.env.TELEGRAM_BOT_TOKEN as string | undefined;
  const chatId = import.meta.env.TELEGRAM_CHAT_ID  as string | undefined;
  if (!token || !chatId) return;

  const emoji = parsed.risk_level === 'critical' ? '🚨' : '⚠️';
  const text  =
    `${emoji} <b>Ether Energy Alert — ${parsed.risk_level.toUpperCase()}</b>\n\n` +
    `${parsed.summary}\n\n` +
    `<i>${parsed.advice}</i>`;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
  } catch (err) {
    console.error('[Telegram alert]', err);
  }
}

function buildPrompt(readings: Record<string, number>[]): string {
  const sample = readings.slice(-20);
  const avgPower = (sample.reduce((s, r) => s + r.power, 0) / sample.length).toFixed(1);
  const maxPower = Math.max(...sample.map(r => r.power)).toFixed(1);
  const minVolt  = Math.min(...sample.map(r => r.voltage)).toFixed(1);
  const avgPF    = (sample.reduce((s, r) => s + r.power_factor, 0) / sample.length).toFixed(3);

  return `You are an expert IoT energy analyst. Analyze the following home energy monitor data and respond ONLY with a valid JSON object — no markdown, no code blocks.

Recent readings summary (last ${sample.length} data points):
- Average power: ${avgPower} W
- Peak power: ${maxPower} W
- Minimum voltage: ${minVolt} V
- Average power factor: ${avgPF}
- Raw sample: ${JSON.stringify(sample.map(r => ({
    v: r.voltage?.toFixed(1),
    a: r.current?.toFixed(3),
    w: r.power?.toFixed(1),
    pf: r.power_factor?.toFixed(2),
  })))}

Respond with exactly this JSON structure:
{
  "summary": "2-3 sentence overview",
  "insights": [
    { "type": "info|warning|tip|alert", "title": "short title", "body": "detailed explanation" }
  ],
  "advice": "1-2 sentence actionable closing advice",
  "risk_level": "low|medium|high|critical"
}

Be specific, practical, and reference actual numbers from the data.`;
}

export const POST: APIRoute = async ({ request }) => {
  const secret = request.headers.get('x-api-secret');
  // Allow dashboard-origin requests (same origin, no secret needed for internal calls)
  // But validate if secret is present and wrong
  if (secret && secret !== import.meta.env.API_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = import.meta.env.GEMINI_API_KEY as string;

  // ── Mock mode if no API key ───────────────────────────────────────────────
  if (!apiKey) {
    await new Promise(r => setTimeout(r, 1200)); // simulate latency
    return new Response(JSON.stringify({ ...MOCK_ANALYSIS, mock: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db   = getDb();
    const rows = db.prepare(
      'SELECT voltage, current, power, energy, frequency, pf as power_factor FROM readings ORDER BY id DESC LIMIT 50'
    ).all() as Record<string, number>[];

    const readings = rows.reverse();

    if (readings.length < 3) {
      return new Response(
        JSON.stringify({ error: 'Not enough data yet. Need at least 3 readings.' }),
        { status: 422, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

    const result = await model.generateContent(buildPrompt(readings));
    const text   = result.response.text().trim();

    // Strip markdown fences if model adds them anyway
    const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(clean);

    if (parsed.risk_level === 'high' || parsed.risk_level === 'critical') {
      void sendTelegramAlert(parsed);
    }

    return new Response(
      JSON.stringify({ ...parsed, generated_at: new Date().toISOString(), mock: false }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[POST /api/analysis]', err);
    return new Response(JSON.stringify({ error: 'Analysis failed. Check server logs.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
