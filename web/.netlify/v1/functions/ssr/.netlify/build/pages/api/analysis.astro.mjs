import { GoogleGenerativeAI } from '@google/generative-ai';
import { g as getDb } from '../../chunks/db_D2IobrOV.mjs';
export { renderers } from '../../renderers.mjs';

({
  generated_at: (/* @__PURE__ */ new Date()).toISOString()
});
async function sendTelegramAlert(parsed) {
  const token = "8726831489:AAGtk_JTEN_bI9eWJMsAz55AlokfLC7jhbs";
  const chatId = "1958269193";
  const emoji = parsed.risk_level === "critical" ? "🚨" : "⚠️";
  const text = `${emoji} <b>Ether Energy Alert — ${parsed.risk_level.toUpperCase()}</b>

${parsed.summary}

<i>${parsed.advice}</i>`;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" })
    });
  } catch (err) {
    console.error("[Telegram alert]", err);
  }
}
function buildPrompt(readings) {
  const sample = readings.slice(-20);
  const avgPower = (sample.reduce((s, r) => s + r.power, 0) / sample.length).toFixed(1);
  const maxPower = Math.max(...sample.map((r) => r.power)).toFixed(1);
  const minVolt = Math.min(...sample.map((r) => r.voltage)).toFixed(1);
  const avgPF = (sample.reduce((s, r) => s + r.power_factor, 0) / sample.length).toFixed(3);
  return `You are an expert IoT energy analyst. Analyze the following home energy monitor data and respond ONLY with a valid JSON object — no markdown, no code blocks.

Recent readings summary (last ${sample.length} data points):
- Average power: ${avgPower} W
- Peak power: ${maxPower} W
- Minimum voltage: ${minVolt} V
- Average power factor: ${avgPF}
- Raw sample: ${JSON.stringify(sample.map((r) => ({
    v: r.voltage?.toFixed(1),
    a: r.current?.toFixed(3),
    w: r.power?.toFixed(1),
    pf: r.power_factor?.toFixed(2)
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
const POST = async ({ request }) => {
  const secret = request.headers.get("x-api-secret");
  if (secret && secret !== "true") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const apiKey = "AIzaSyDbtdqnSVhJ9UOXbhheSiUieq_p8zpOdnc";
  try {
    const db = await getDb();
    const res = await db.execute(
      "SELECT voltage, current, power, energy, frequency, pf as power_factor FROM readings ORDER BY id DESC LIMIT 50"
    );
    const readings = res.rows.reverse();
    if (readings.length < 3) {
      return new Response(
        JSON.stringify({ error: "Not enough data yet. Need at least 3 readings." }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
    const result = await model.generateContent(buildPrompt(readings));
    const text = result.response.text().trim();
    const clean = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(clean);
    if (parsed.risk_level === "high" || parsed.risk_level === "critical") {
      void sendTelegramAlert(parsed);
    }
    return new Response(
      JSON.stringify({ ...parsed, generated_at: (/* @__PURE__ */ new Date()).toISOString(), mock: false }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[POST /api/analysis]", err);
    return new Response(JSON.stringify({ error: "Analysis failed. Check server logs." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
