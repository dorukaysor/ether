import { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

// ── Types ────────────────────────────────────────────────────────────────────
interface Reading {
  readings: {
    voltage: number;
    current: number;
    power: number;
    energy: number;
    frequency: number;
    power_factor: number;
  };
  state: string;
  relay: boolean;
  timestamp: string;
}

interface ChartPoint {
  time: string;
  voltage: number;
  current: number;
  power: number;
  energy: number;
  frequency: number;
  power_factor: number;
}

type TimeRange = '1h' | '6h' | '24h' | '7d';
type ChartMetric = 'power' | 'voltage' | 'current' | 'energy' | 'frequency' | 'power_factor';

const TIME_RANGES: { id: TimeRange; label: string }[] = [
  { id: '1h',  label: '1 Hour' },
  { id: '6h',  label: '6 Hours' },
  { id: '24h', label: '24 Hours' },
  { id: '7d',  label: '7 Days' },
];

const METRICS: { id: ChartMetric; label: string; unit: string; color: string }[] = [
  { id: 'power',        label: 'Power',        unit: 'W',   color: '#ffe600' },
  { id: 'voltage',      label: 'Voltage',      unit: 'V',   color: '#00f5ff' },
  { id: 'current',      label: 'Current',      unit: 'A',   color: '#ff2d78' },
  { id: 'energy',       label: 'Energy',       unit: 'kWh', color: '#b44fff' },
  { id: 'frequency',    label: 'Frequency',    unit: 'Hz',  color: '#00f5ff' },
  { id: 'power_factor', label: 'Power Factor', unit: '',    color: '#ff2d78' },
];

const LIMIT_MAP: Record<TimeRange, number> = { '1h': 120, '6h': 360, '24h': 480, '7d': 500 };

// ── Mock data generator ───────────────────────────────────────────────────────
function generateMockHistory(range: TimeRange): ChartPoint[] {
  const points = LIMIT_MAP[range];
  const now    = Date.now();
  const rangeMs: Record<TimeRange, number> = {
    '1h':  3600000, '6h': 21600000, '24h': 86400000, '7d': 604800000,
  };
  const interval = rangeMs[range] / points;

  return Array.from({ length: points }, (_, i) => {
    const t     = new Date(now - (points - i) * interval);
    const power = 80 + Math.sin(i / 20) * 60 + Math.random() * 30;
    return {
      time:         t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      voltage:      parseFloat((220 + Math.sin(i / 30) * 3 + Math.random() * 2).toFixed(1)),
      current:      parseFloat((power / 220).toFixed(3)),
      power:        parseFloat(power.toFixed(1)),
      energy:       parseFloat((1.2 + i * 0.0005).toFixed(4)),
      frequency:    parseFloat((50 + (Math.random() - 0.5) * 0.3).toFixed(2)),
      power_factor: parseFloat((0.95 + (Math.random() - 0.5) * 0.04).toFixed(3)),
    };
  });
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="ct-time">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="ct-row">
          <span>{p.name}</span>
          <span>{p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ── Stat summary card ─────────────────────────────────────────────────────────
function StatCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="stat-card" style={{ '--stat-color': color } as React.CSSProperties}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}<span className="stat-unit"> {unit}</span></span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function HistoryCharts() {
  const [data,       setData]      = useState<ChartPoint[]>([]);
  const [loading,    setLoading]   = useState(true);
  const [error,      setError]     = useState<string | null>(null);
  const [range,      setRange]     = useState<TimeRange>('1h');
  const [metric,     setMetric]    = useState<ChartMetric>('power');
  const [isMock,     setIsMock]    = useState(true);

  const metaInfo = METRICS.find(m => m.id === metric)!;

  const fetchData = useCallback(async () => {
    setLoading(true);
    if (isMock) {
      // Slight delay for realism
      await new Promise(r => setTimeout(r, 300));
      setData(generateMockHistory(range));
      setError(null);
      setLoading(false);
      return;
    }
    try {
      const limit = LIMIT_MAP[range];
      const res   = await fetch(`/api/history?limit=${limit}`);
      if (!res.ok) throw new Error('API error');
      const json  = await res.json();
      const points: ChartPoint[] = (json.data as Reading[]).reverse().map(r => ({
        time:         new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        voltage:      r.readings.voltage,
        current:      r.readings.current,
        power:        r.readings.power,
        energy:       r.readings.energy,
        frequency:    r.readings.frequency,
        power_factor: r.readings.power_factor,
      }));
      setData(points);
      setError(null);
    } catch {
      setError('Could not load history.');
    } finally {
      setLoading(false);
    }
  }, [range, isMock]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Stats from current data ──
  const vals  = data.map(d => d[metric]);
  const avg   = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : '---';
  const max   = vals.length ? Math.max(...vals).toFixed(2) : '---';
  const min   = vals.length ? Math.min(...vals).toFixed(2) : '---';
  const last  = vals.length ? vals[vals.length - 1].toFixed(2) : '---';

  // Thin out data for 7d to avoid SVG overload
  const chartData = range === '7d' ? data.filter((_, i) => i % 6 === 0) : data;

  return (
    <div className="history-root">
      {/* ── Controls ── */}
      <div className="history-controls">
        <div className="ctrl-group">
          <span className="ctrl-label">Range</span>
          <div className="ctrl-btns">
            {TIME_RANGES.map(r => (
              <button
                key={r.id}
                className={`ctrl-btn ${range === r.id ? 'active' : ''}`}
                onClick={() => setRange(r.id)}
              >{r.label}</button>
            ))}
          </div>
        </div>

        <div className="ctrl-group">
          <span className="ctrl-label">Metric</span>
          <div className="ctrl-btns">
            {METRICS.map(m => (
              <button
                key={m.id}
                className={`ctrl-btn metric-btn ${metric === m.id ? 'active' : ''}`}
                style={{ '--btn-color': m.color } as React.CSSProperties}
                onClick={() => setMetric(m.id)}
              >{m.label}</button>
            ))}
          </div>
        </div>

        <div className="ctrl-group ctrl-mock">
          <span className="ctrl-label">Source</span>
          <button
            className={`ctrl-btn mock-toggle ${isMock ? 'active mock' : ''}`}
            onClick={() => setIsMock(p => !p)}
          >
            <i className={`fa-solid ${isMock ? 'fa-flask' : 'fa-database'}`} />
            {isMock ? ' Mock' : ' Live DB'}
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="stat-row">
        <StatCard label="Latest" value={last}  unit={metaInfo.unit} color={metaInfo.color} />
        <StatCard label="Avg"    value={avg}   unit={metaInfo.unit} color={metaInfo.color} />
        <StatCard label="Min"    value={min}   unit={metaInfo.unit} color={metaInfo.color} />
        <StatCard label="Max"    value={max}   unit={metaInfo.unit} color={metaInfo.color} />
      </div>

      {/* ── Chart ── */}
      <div className="chart-card">
        {loading ? (
          <div className="chart-loading">
            <i className="fa-solid fa-circle-notch fa-spin" />
            Loading data…
          </div>
        ) : error ? (
          <div className="dash-error">
            <i className="fa-solid fa-triangle-exclamation" /> {error}
          </div>
        ) : (
          <>
            <div className="chart-header">
              <span className="chart-title" style={{ color: metaInfo.color }}>
                {metaInfo.label} <span className="chart-unit">({metaInfo.unit || 'ratio'})</span>
              </span>
              <span className="chart-points">{chartData.length} points</span>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={metaInfo.color} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={metaInfo.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e1e3a" strokeDasharray="4 4" />
                <XAxis
                  dataKey="time"
                  tick={{ fill: '#6b6b8a', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#1e1e3a' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#6b6b8a', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey={metric}
                  name={metaInfo.label}
                  stroke={metaInfo.color}
                  strokeWidth={2}
                  fill="url(#metricGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: metaInfo.color }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}
      </div>

      {/* ── Multi-line overview ── */}
      <div className="chart-card">
        <div className="chart-header">
          <span className="chart-title">Power + Voltage + Current Overview</span>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#1e1e3a" strokeDasharray="4 4" />
            <XAxis
              dataKey="time"
              tick={{ fill: '#6b6b8a', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#1e1e3a' }}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: '#6b6b8a', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#6b6b8a', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, color: '#6b6b8a', paddingTop: 8 }}
            />
            <Line yAxisId="left"  type="monotone" dataKey="power"   name="Power (W)"   stroke="#ffe600" strokeWidth={2} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="voltage" name="Voltage (V)"  stroke="#00f5ff" strokeWidth={1.5} dot={false} />
            <Line yAxisId="left"  type="monotone" dataKey="current" name="Current (A)"  stroke="#ff2d78" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
