/**
 * HomeDashboard — root client component for the Ether home page.
 *
 * Polls /api/get-latest every 3 s and renders:
 *   • SplitText + TextType header
 *   • Emotive state ring (pulsing, colour-matched)
 *   • 6-card live readings grid with CountUp animations
 *   • Relay ON/OFF toggle
 *   • Mini sparkline (Recharts LineChart — last 10 readings)
 *   • Floating AI insight notification (bottom-right)
 */
import React, { Component, useCallback, useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBolt,
  faWaveSquare,
  faFire,
  faBatteryThreeQuarters,
  faRotate,
  faGaugeHigh,
  faToggleOn,
  faToggleOff,
  faXmark,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons';
import {
  AreaChart,
  Area,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import CountUp   from './reactbits/CountUp';
import TextType  from './reactbits/TextType';
import SplitText from './reactbits/SplitText';
import {
  getDataMode,
  generateMockReading,
  type DataMode,
} from '../lib/mockData';

// ── Error Boundary ───────────────────────────────────────────────────────────

interface EBState { hasError: boolean; message: string }

class ErrorBoundary extends Component<{ children: React.ReactNode }, EBState> {
  state: EBState = { hasError: false, message: '' };
  static getDerivedStateFromError(err: unknown): EBState {
    return { hasError: true, message: String(err) };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-8 text-center">
          <p className="text-red-400 text-sm font-mono">Dashboard render error:</p>
          <p className="text-white/40 text-xs max-w-md break-all">{this.state.message}</p>
          <p className="text-white/20 text-xs">Check DevTools Console for the full stack trace.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

interface EnergyReading {
  id:            number;
  voltage:       number;
  current:       number;
  watts:         number;
  energy:        number;
  frequency:     number;
  pf:            number;
  relay_state:   number; // 0 | 1
  emotive_state: string; // 'cyan' | 'pink' | 'yellow' | 'purple' | 'red'
  created_at:    number;
}

interface LatestData {
  readings:       EnergyReading[];
  latestInsight:  { content: string; created_at: number } | null;
}

// ── Constants ────────────────────────────────────────────────────────────────

const EMOTIVE: Record<string, { color: string; label: string; desc: string }> = {
  cyan:   { color: '#06b6d4', label: 'Idle',       desc: 'Normal energy usage'          },
  pink:   { color: '#ec4899', label: 'Happy',      desc: 'Power drop detected'          },
  yellow: { color: '#eab308', label: 'Dizzy',      desc: 'Fluctuations detected'        },
  purple: { color: '#a855f7', label: 'Frustrated', desc: 'High sustained load'          },
  red:    { color: '#ef4444', label: 'Angry',      desc: 'Critical — relay may cut off' },
};

const BLANK: EnergyReading = {
  id: 0, voltage: 0, current: 0, watts: 0,
  energy: 0, frequency: 0, pf: 0,
  relay_state: 1, emotive_state: 'cyan', created_at: 0,
};

const POLL_INTERVAL_MS = 3000;

// ── Metric registry ──────────────────────────────────────────────────────────

type MetricKey = 'voltage' | 'current' | 'watts' | 'energy' | 'frequency' | 'pf';

const METRICS: Array<{
  key:      MetricKey;
  icon:     Parameters<typeof FontAwesomeIcon>[0]['icon'];
  label:    string;
  unit:     string;
  color:    string;
  decimals: number;
}> = [
  { key: 'voltage',   icon: faBolt,                 label: 'Voltage',      unit: 'V',   color: '#f59e0b', decimals: 1 },
  { key: 'current',   icon: faWaveSquare,            label: 'Current',      unit: 'A',   color: '#06b6d4', decimals: 2 },
  { key: 'watts',     icon: faFire,                  label: 'Active Power', unit: 'W',   color: '#ef4444', decimals: 1 },
  { key: 'energy',    icon: faBatteryThreeQuarters,  label: 'Energy',       unit: 'kWh', color: '#22c55e', decimals: 3 },
  { key: 'frequency', icon: faRotate,                label: 'Frequency',    unit: 'Hz',  color: '#a855f7', decimals: 1 },
  { key: 'pf',        icon: faGaugeHigh,             label: 'Power Factor', unit: '',    color: '#ec4899', decimals: 2 },
];

const TIMEFRAMES = [10, 20, 50, 100] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

// ── Wrapper export (error boundary + root marker) ───────────────────────────

export default function HomeDashboard() {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
}

function Dashboard() {
  const [latest,       setLatest]       = useState<EnergyReading>(BLANK);
  const [chartData,    setChartData]    = useState<EnergyReading[]>([]);
  const [connected,    setConnected]    = useState(false);
  const [relayLoading, setRelayLoading] = useState(false);
  const [insight,      setInsight]      = useState<string | null>(null);
  const [showInsight,  setShowInsight]  = useState(false);
  const [dataMode,     setDataModeState] = useState<DataMode>('live');
  const [activeMetric, setActiveMetric]  = useState<MetricKey>('watts');
  const [timeframe,    setTimeframe]     = useState<Timeframe>(20);

  // Track last seen insight timestamp so we only show it when it’s NEW.
  const lastInsightTs = useRef<number | null>(null);

  // ── Sync data mode from localStorage ────────────────────────────────────────────────────

  useEffect(() => {
    setDataModeState(getDataMode());
    const sync = () => setDataModeState(getDataMode());
    window.addEventListener('ether-mode-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('ether-mode-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  // ── Polling ───────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const mode = getDataMode();

      // ─ Mock mode: generate synthetic readings locally ──────────────────────────
      if (mode !== 'live') {
        const reading = generateMockReading(mode) as unknown as EnergyReading;
        setLatest(reading);
        setChartData((prev) => [...prev.slice(-99), reading]);
        setConnected(true);
        return;
      }

      // ─ Live mode: fetch from API ───────────────────────────────────────
      const res = await fetch('/api/get-latest');
      if (!res.ok) return;
      const data: LatestData = await res.json();

      if (data.readings && data.readings.length > 0) {
        setLatest(data.readings[0]);
        // Reverse so chart shows oldest → newest left-to-right.
        setChartData([...data.readings].reverse());
        setConnected(true);
      }

      if (data.latestInsight) {
        const ts = data.latestInsight.created_at;
        // Show the notification only when a genuinely new insight arrives.
        if (lastInsightTs.current !== null && ts !== lastInsightTs.current) {
          setInsight(data.latestInsight.content);
          setShowInsight(true);
        }
        lastInsightTs.current = ts;
      }
    } catch {
      // Keep showing last known values — network hiccup is normal.
    }
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchData]);

  // ── Relay toggle ──────────────────────────────────────────────────────────

  const toggleRelay = async () => {
    if (relayLoading) return;
    setRelayLoading(true);
    const newState = latest.relay_state === 1 ? false : true;
    try {
      await fetch('/api/relay-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relay: newState }),
      });
      setLatest((prev) => ({ ...prev, relay_state: newState ? 1 : 0 }));
    } catch {
      // ignore
    } finally {
      setRelayLoading(false);
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────

  const emotive = EMOTIVE[latest.emotive_state] ?? EMOTIVE.cyan;
  const accent  = emotive.color;
  const relayOn = latest.relay_state === 1;

  // ── Active metric config ──────────────────────────────────────────────────

  const metricCfg  = METRICS.find((m) => m.key === activeMetric)!;
  const chartColor = metricCfg.color;

  const visibleData = chartData.slice(-timeframe).map((r) => ({
    v: r[activeMetric],
    t: r.created_at,
  }));

  const fmtTime = (ts: number) =>
    new Date(ts * 1000).toLocaleTimeString('en-GB', {
      hour:   '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="w-full px-4 pb-4 flex flex-col gap-3 select-none md:h-full" data-hd-root="1">

      {/* ── Top Bar: Title + Emotive Ring ──────────────────────────────── */}
      <div className="shrink-0 pt-4 flex items-center justify-between gap-4">

        {/* Wordmark + subtitle */}
        <div>
          <h1 className="text-5xl font-black tracking-tighter leading-none">
            <SplitText text="ETHER" staggerMs={60} />
          </h1>
          <div className="h-5 mt-1.5 text-white/40 text-xs">
            <TextType
              texts={[
                'Energy Tracking & Harmonic Emotive Reporter',
                'Dual-Unit IoT Energy Monitor',
                'Live power analytics',
                'Developed by Doruk Aysor',
                'ESP32 · PZEM-004T · TursoDB',
              ]}
              typingSpeed={60}
            />
          </div>
        </div>

        {/* Emotive ring */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-white/40 text-sm">{emotive.desc}</p>
            <p className="text-white/25 text-xs">
              {connected ? `${latest.watts.toFixed(1)} W · live` : 'Connecting…'}
            </p>
          </div>
          <div className="relative flex items-center justify-center w-[4.5rem] h-[4.5rem]">
            <div
              className="absolute inset-0 rounded-full animate-ping"
              style={{ backgroundColor: accent, opacity: 0.15 }}
            />
            <div
              className="absolute inset-1 rounded-full"
              style={{ border: `1px solid ${accent}40`, boxShadow: `0 0 20px ${accent}40` }}
            />
            <div
              className="relative w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: `radial-gradient(circle at 40% 40%, ${accent}30, ${accent}10)`,
                border: `2px solid ${accent}70`,
              }}
            >
              <span className="text-xs font-bold" style={{ color: accent }}>
                {emotive.label}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* ── Reading cards row (relay + 6 metrics) ────────────────────────── */}
      <div className="shrink-0 grid grid-cols-4 md:grid-cols-7 gap-2">

        {/* Relay card */}
        <div
          className="glass-card px-3 py-2.5 flex flex-col items-center justify-between gap-1 cursor-pointer col-span-2 md:col-span-1"
          onClick={toggleRelay}
          title={relayOn ? 'Click to turn relay OFF' : 'Click to turn relay ON'}
        >
          <span className="text-white/30 text-[9px] uppercase tracking-widest">Relay</span>
          <span className="text-xl font-black" style={{ color: relayOn ? '#06b6d4' : '#ef4444' }}>
            {relayLoading ? '…' : relayOn ? 'ON' : 'OFF'}
          </span>
          <FontAwesomeIcon
            icon={relayOn ? faToggleOn : faToggleOff}
            className="w-5 h-5"
            style={{ color: relayOn ? '#06b6d4' : '#ef4444', opacity: 0.7 }}
          />
        </div>

        {/* 6 metric reading cards */}
        {METRICS.map((m) => (
          <div
            key={m.key}
            onClick={() => setActiveMetric(m.key)}
            className="glass-card px-3 py-2.5 flex flex-col gap-1 cursor-pointer transition-all duration-200"
            style={activeMetric === m.key
              ? { borderColor: `${m.color}55`, boxShadow: `0 0 14px ${m.color}18` }
              : {}}
          >
            <div className="flex items-center gap-1.5">
              <FontAwesomeIcon icon={m.icon} className="w-2.5 h-2.5" style={{ color: m.color, opacity: 0.7 }} />
              <span className="text-white/30 text-[9px] uppercase tracking-widest truncate">{m.label}</span>
            </div>
            <div className="text-base font-semibold text-white tabular-nums leading-tight">
              <CountUp
                value={latest[m.key]}
                decimals={m.decimals}
                suffix={m.unit ? ` ${m.unit}` : ''}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── Chart panel ──────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 glass-card flex flex-col p-4 gap-2">

        {/* Toolbar */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2">

          {/* Metric toggles */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => setActiveMetric(m.key)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all duration-150"
                style={activeMetric === m.key
                  ? { background: `${m.color}18`, border: `1px solid ${m.color}50`, color: m.color }
                  : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)' }
                }
              >
                <FontAwesomeIcon icon={m.icon} className="w-2.5 h-2.5" />
                {m.label}
              </button>
            ))}
          </div>

          {/* Timeframe controls */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-white/25 uppercase tracking-wider mr-1">Pts</span>
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className="w-8 h-6 rounded text-[10px] font-semibold transition-all duration-150"
                style={timeframe === tf
                  ? { background: `${chartColor}18`, border: `1px solid ${chartColor}40`, color: chartColor }
                  : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.30)' }
                }
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={visibleData} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
              <defs>
                <linearGradient id="homeMetGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={chartColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="t"
                tickFormatter={fmtTime}
                tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                minTickGap={60}
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={(v) =>
                  `${Number(v).toFixed(metricCfg.decimals)}${metricCfg.unit ? ` ${metricCfg.unit}` : ''}`
                }
              />
              <Tooltip
                contentStyle={{
                  background:   '#0d0d0d',
                  border:       '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  fontSize:     12,
                }}
                labelFormatter={(t) => fmtTime(Number(t))}
                formatter={(v) => [
                  `${Number(v).toFixed(metricCfg.decimals)}${metricCfg.unit ? ` ${metricCfg.unit}` : ''}`,
                  metricCfg.label,
                ]}
                labelStyle={{ color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}
              />
              <Area
                type="monotone"
                dataKey="v"
                stroke={chartColor}
                strokeWidth={2}
                fill="url(#homeMetGrad)"
                dot={false}
                isAnimationActive={true}
                animationDuration={300}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Footer meta */}
        <div className="shrink-0 flex items-center justify-between pt-1 border-t border-white/5">
          <span className="text-[10px] text-white/25 uppercase tracking-widest">
            {metricCfg.label} · last {Math.min(timeframe, chartData.length)} readings
          </span>
          <span className="text-xs font-semibold tabular-nums" style={{ color: chartColor }}>
            {latest[activeMetric].toFixed(metricCfg.decimals)}{metricCfg.unit ? ` ${metricCfg.unit}` : ''}
          </span>
        </div>
      </div>

      {/* ── AI Insight Notification ─────────────────────────────────────── */}
      {showInsight && insight && (
        <div
          className="fixed bottom-4 right-4 z-50 max-w-xs glass-card p-4"
          style={{
            borderColor: `${accent}50`,
            boxShadow:   `0 8px 32px ${accent}20`,
            animation:   'fadeInUp 0.35s ease-out forwards',
          }}
        >
          <style>{`
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(12px); }
              to   { opacity: 1; transform: translateY(0);    }
            }
          `}</style>
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: accent }}>
                AI Insight
              </p>
              <p className="text-white/65 text-sm leading-relaxed line-clamp-4">
                {insight}
              </p>
            </div>
            <button
              onClick={() => setShowInsight(false)}
              className="text-white/30 hover:text-white/70 transition-colors shrink-0 mt-0.5"
              aria-label="Dismiss"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
          <a
            href="/insights"
            className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium hover:opacity-80 transition-opacity"
            style={{ color: accent }}
          >
            View full analysis
            <FontAwesomeIcon icon={faArrowRight} className="w-2.5 h-2.5" />
          </a>
        </div>
      )}
    </div>
  );
}
