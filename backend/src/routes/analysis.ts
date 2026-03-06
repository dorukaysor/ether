// POST /api/analysis — Gemini AI energy analysis with Telegram alerts

import { Router, type Request, type Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDb } from '../lib/db.js';

const router = Router();

const MOCK_ANALYSIS = {
  summary: "Your home's energy usage looks stable over the past hour. Average power draw is around 145 W, which is within normal range for a residential setup.",
  insights: [
    {
      type: 'info',
      title: 'Stable Consumption',
      body: 'Power readings have remained between 80–180 W with no significant spikes detected.',
    },
    {
      type: 'warning',
      title: 'Minor Voltage Fluctuations',
      body: 'Voltage dipped to 218 V twice in the last 30 minutes. Consider a voltage stabiliser if this persists.',
    },
    {
      type: 'tip',
      title: 'Efficiency Opportunity',
      body: 'Power factor is averaging 0.94. Improving it closer to 1.0 could reduce your bill by up to 6%.',
    },
    {
      type: 'info',
      title: 'Peak Usage Window',
      body: 'Highest draw typically occurs 7 PM–10 PM. Shift heavy loads to off-peak hours.',
    },
  ],
  advice: 'Overall your system is healthy. Monitor voltage dips — report repeated issues to your utility provider.',
  risk_level: 'low',
  generated_at: new Date().toISOString(),
};

async function sendTelegramAlert(parsed: { summary: string; risk_level: string; advice: string }) {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
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
  const sample   = readings.slice(-20);
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

router.post('/', async (req: Request, res: Response) => {
  const secret = req.headers['x-api-secret'];
  if (secret && secret !== process.env.API_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    await new Promise(r => setTimeout(r, 1200));
    res.json({ ...MOCK_ANALYSIS, mock: true });
    return;
  }

  try {
    const db       = await getDb();
    const result   = await db.execute(
      'SELECT voltage, current, power, energy, frequency, pf as power_factor FROM readings ORDER BY id DESC LIMIT 50'
    );
    const readings = (result.rows as Record<string, number>[]).reverse();

    if (readings.length < 3) {
      res.status(422).json({ error: 'Not enough data yet. Need at least 3 readings.' });
      return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

    const geminiResult = await model.generateContent(buildPrompt(readings));
    const text         = geminiResult.response.text().trim();
    const clean        = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed       = JSON.parse(clean) as { summary: string; risk_level: string; advice: string };

    if (parsed.risk_level === 'high' || parsed.risk_level === 'critical') {
      void sendTelegramAlert(parsed);
    }

    res.json({ ...parsed, generated_at: new Date().toISOString(), mock: false });
  } catch (err) {
    console.error('[POST /api/analysis]', err);
    res.status(500).json({ error: 'Analysis failed. Check server logs.' });
  }
});

export default router;
