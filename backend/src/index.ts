import 'dotenv/config';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { initWss } from './lib/wss.js';

import readingsRouter from './routes/readings.js';
import historyRouter  from './routes/history.js';
import analysisRouter from './routes/analysis.js';
import relayRouter    from './routes/relay.js';
import configRouter   from './routes/config.js';

const app  = express();
const PORT = parseInt(process.env.PORT ?? '3001');

// ── CORS ────────────────────────────────────────────────────────────────────
// Allow requests from the Netlify frontend (set CORS_ORIGIN in production)
const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:4321')
  .split(',')
  .map(s => s.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, ESP32, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-secret'],
}));

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/readings', readingsRouter);
app.use('/api/history',  historyRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/relay',    relayRouter);
app.use('/api/config',   configRouter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'ether-backend', ts: new Date().toISOString() });
});

// ── Start ──────────────────────────────────────────────────────────────────────
const server = createServer(app);
initWss(server);

server.listen(PORT, () => {
  console.log(`[ether-backend] listening on port ${PORT}`);
});
