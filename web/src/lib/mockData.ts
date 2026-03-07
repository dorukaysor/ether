/**
 * Mock data generator for Ether dashboard.
 *
 * When data_mode is not 'live', these functions supply synthetic readings
 * so the dashboard can be tested without a physical ESP32 prototype.
 *
 * Mode is stored in localStorage so it persists across page reloads
 * and is also saved to TursoDB via save-settings for cross-device sync.
 */

export type MockSubMode = 'auto' | 'idle' | 'happy' | 'dizzy' | 'frustrated' | 'angry';
export type DataMode    = 'live' | `mock:${MockSubMode}`;

export const DATA_MODE_KEY = 'ether_data_mode';

// ── Mode persistence ──────────────────────────────────────────────────────────

export function getDataMode(): DataMode {
  if (typeof window === 'undefined') return 'live';
  return (localStorage.getItem(DATA_MODE_KEY) as DataMode) ?? 'live';
}

export function setDataMode(mode: DataMode): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DATA_MODE_KEY, mode);
  window.dispatchEvent(new Event('ether-mode-change'));
}

export function isMockMode(mode: DataMode): boolean {
  return mode !== 'live';
}

// ── Shared reading type ───────────────────────────────────────────────────────

export interface MockReading {
  id:            number;
  voltage:       number;
  current:       number;
  watts:         number;
  energy:        number;
  frequency:     number;
  pf:            number;
  relay_state:   number;
  emotive_state: string;
  created_at:    number;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function emotiveForWatts(w: number): string {
  if (w > 2500) return 'red';
  if (w > 1000) return 'purple';
  if (w > 300)  return 'yellow';
  return Math.random() > 0.85 ? 'pink' : 'cyan';
}

function buildReading(
  watts: number,
  emotive: string,
  energy: number,
  id: number,
  ts?: number,
): MockReading {
  const voltage   = rand(218, 232);
  const pf        = rand(0.88, 0.99);
  const frequency = rand(49.9, 50.1);
  return {
    id,
    voltage:       parseFloat(voltage.toFixed(1)),
    current:       parseFloat((watts / voltage).toFixed(3)),
    watts:         parseFloat(watts.toFixed(1)),
    energy:        parseFloat(energy.toFixed(4)),
    frequency:     parseFloat(frequency.toFixed(1)),
    pf:            parseFloat(pf.toFixed(2)),
    relay_state:   emotive === 'red' ? 0 : 1,
    emotive_state: emotive,
    created_at:    ts ?? Math.floor(Date.now() / 1000),
  };
}

// ── Running state for continuity between poll ticks ───────────────────────────

let _autoWatts  = 300;
let _autoEnergy = 0;

// ── Single-reading generator (used by the live poll loop) ────────────────────

export function generateMockReading(mode: DataMode): MockReading {
  const ENERGY_PER_TICK = 3 / 3600; // assumes 3-second poll interval (seconds → hours)

  switch (mode) {
    case 'mock:idle': {
      const w = rand(20, 150);
      _autoEnergy += w * ENERGY_PER_TICK;
      return buildReading(w, 'cyan', _autoEnergy, Date.now());
    }
    case 'mock:happy': {
      const w = Math.random() < 0.35 ? rand(10, 60) : rand(150, 350);
      _autoEnergy += w * ENERGY_PER_TICK;
      return buildReading(w, 'pink', _autoEnergy, Date.now());
    }
    case 'mock:dizzy': {
      const w = Math.random() < 0.4 ? rand(400, 700) : rand(100, 250);
      _autoEnergy += w * ENERGY_PER_TICK;
      return buildReading(w, 'yellow', _autoEnergy, Date.now());
    }
    case 'mock:frustrated': {
      const w = rand(1100, 1900);
      _autoEnergy += w * ENERGY_PER_TICK;
      return buildReading(w, 'purple', _autoEnergy, Date.now());
    }
    case 'mock:angry': {
      const w = rand(2600, 3600);
      _autoEnergy += w * ENERGY_PER_TICK;
      return buildReading(w, 'red', _autoEnergy, Date.now());
    }
    default: { // mock:auto — smooth random walk
      _autoWatts += rand(-80, 80);
      _autoWatts  = clamp(_autoWatts, 50, 3200);
      _autoEnergy += _autoWatts * ENERGY_PER_TICK;
      return buildReading(_autoWatts, emotiveForWatts(_autoWatts), _autoEnergy, Date.now());
    }
  }
}

// ── History data generation ───────────────────────────────────────────────────

export interface MockHistoryData {
  rows:        MockReading[];
  total:       number;
  page:        number;
  limit:       number;
  chartSeries: { watts: number; emotive_state: string; created_at: number }[];
  hourly:      { hour: string; avgWatts: number }[];
  emotiePie:   { state: string; value: number }[];
}

export function generateMockHistory(mode: DataMode, page = 1, limit = 20): MockHistoryData {
  const TOTAL    = 200;
  const INTERVAL = 10; // seconds between synthetic readings
  const now      = Math.floor(Date.now() / 1000);
  const readings: MockReading[] = [];

  let watts  = 300;
  let energy = 0;

  for (let i = TOTAL - 1; i >= 0; i--) {
    const ts = now - i * INTERVAL;
    let w: number;
    let emotive: string;

    switch (mode) {
      case 'mock:idle':
        w = rand(20, 150); emotive = 'cyan'; break;
      case 'mock:happy':
        w = Math.random() < 0.35 ? rand(10, 60) : rand(150, 350); emotive = 'pink'; break;
      case 'mock:dizzy':
        w = i % 5 === 0 ? rand(400, 700) : rand(100, 250); emotive = 'yellow'; break;
      case 'mock:frustrated':
        w = rand(1100, 1900); emotive = 'purple'; break;
      case 'mock:angry':
        w = rand(2600, 3600); emotive = 'red'; break;
      default: {
        watts  += rand(-60, 60);
        watts   = clamp(watts, 50, 3200);
        w       = watts;
        emotive = emotiveForWatts(w);
        break;
      }
    }

    energy += w * (INTERVAL / 3600);
    readings.push(buildReading(w, emotive, energy, TOTAL - i, ts));
  }

  // chartSeries — all points for the AreaChart
  const chartSeries = readings.map(r => ({
    watts:         r.watts,
    emotive_state: r.emotive_state,
    created_at:    r.created_at,
  }));

  // hourly — group readings by "HH:MM" bucket
  const hourlyMap: Record<string, { sum: number; count: number }> = {};
  readings.forEach(r => {
    const h = new Date(r.created_at * 1000).toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit',
    });
    if (!hourlyMap[h]) hourlyMap[h] = { sum: 0, count: 0 };
    hourlyMap[h].sum   += r.watts;
    hourlyMap[h].count += 1;
  });
  const hourly = Object.entries(hourlyMap).map(([hour, { sum, count }]) => ({
    hour,
    avgWatts: parseFloat((sum / count).toFixed(1)),
  }));

  // emotiePie
  const pieMap: Record<string, number> = {};
  readings.forEach(r => { pieMap[r.emotive_state] = (pieMap[r.emotive_state] ?? 0) + 1; });
  const emotiePie = Object.entries(pieMap).map(([state, value]) => ({ state, value }));

  // paginate (newest first)
  const sorted = [...readings].reverse();
  const start  = (page - 1) * limit;
  const rows   = sorted.slice(start, start + limit);

  return { rows, total: TOTAL, page, limit, chartSeries, hourly, emotiePie };
}
