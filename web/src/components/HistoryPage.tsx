/**
 * HistoryPage — full history view for Ether.
 *
 * Sections:
 *  1. Date-range filter bar
 *  2. AreaChart — watts over time (up to 500 points)
 *  3. BarChart  — hourly average watts
 *  4. PieChart  — emotive state distribution
 *  5. Paginated data table (20 rows/page)
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
  faFilter,
  faCircleXmark,
} from '@fortawesome/free-solid-svg-icons';
import {
  getDataMode,
  generateMockHistory,
  type DataMode,
} from '../lib/mockData';

// ── Types ────────────────────────────────────────────────────────────────────

interface Row {
  id: number; voltage: number; current: number; watts: number;
  energy: number; frequency: number; pf: number;
  relay_state: number; emotive_state: string; created_at: number;
}
interface ChartPoint { watts: number; emotive_state: string; created_at: number }
interface HourlyPoint { hour: string; avgWatts: number }
interface PiePoint    { state: string; value: number }

interface HistoryData {
  rows:        Row[];
  total:       number;
  page:        number;
  limit:       number;
  chartSeries: ChartPoint[];
  hourly:      HourlyPoint[];
  emotiePie:   PiePoint[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const EMOTIVE_COLORS: Record<string, string> = {
  cyan:   '#06b6d4',
  pink:   '#ec4899',
  yellow: '#eab308',
  purple: '#a855f7',
  red:    '#ef4444',
};

const TOOLTIP_STYLE = {
  background: '#0a0a0f',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  fontSize: 12,
  color: '#fff',
};

// ── Helper ───────────────────────────────────────────────────────────────────

function fmt(unix: number) {
  return new Date(unix * 1000).toLocaleString('en-GB', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StateBadge({ state }: { state: string }) {
  const color = EMOTIVE_COLORS[state] ?? '#06b6d4';
  const label = state.charAt(0).toUpperCase() + state.slice(1);
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
      style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
    >
      {label}
    </span>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [data,      setData]      = useState<HistoryData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [page,      setPage]      = useState(1);
  const [fromDate,  setFromDate]  = useState('');
  const [toDate,    setToDate]    = useState('');
  const [applied,   setApplied]   = useState<{ from: string; to: string }>({ from: '', to: '' });
  const [dataMode,  setDataModeState] = useState<DataMode>('live');

  const fetchData = useCallback(async (p: number, from: string, to: string) => {
    setLoading(true);
    setError(null);
    try {
      const mode = getDataMode();

      // ─ Mock mode ────────────────────────────────────────────────────────────
      if (mode !== 'live') {
        const mock = generateMockHistory(mode, p, 20);
        setData(mock as unknown as HistoryData);
        setLoading(false);
        return;
      }

      // ─ Live mode ─────────────────────────────────────────────────────────────
      const params = new URLSearchParams({ page: String(p) });
      if (from) params.set('from', from);
      if (to)   params.set('to',   to);

      const res = await fetch(`/api/get-history?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: HistoryData = await res.json();
      setData(json);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { fetchData(1, '', ''); }, [fetchData]);

  // Sync mode state + re-fetch on mode change
  useEffect(() => {
    setDataModeState(getDataMode());
    const sync = () => {
      setDataModeState(getDataMode());
      fetchData(1, '', '');
      setPage(1);
    };
    window.addEventListener('ether-mode-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('ether-mode-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, [fetchData]);

  // Auto-refresh every 30 s in live mode
  useEffect(() => {
    const timer = setInterval(() => {
      fetchData(page, applied.from, applied.to);
    }, 30_000);
    return () => clearInterval(timer);
  }, [fetchData, page, applied.from, applied.to]);

  const applyFilter = () => {
    setApplied({ from: fromDate, to: toDate });
    setPage(1);
    fetchData(1, fromDate, toDate);
  };

  const clearFilter = () => {
    setFromDate(''); setToDate('');
    setApplied({ from: '', to: '' });
    setPage(1);
    fetchData(1, '', '');
  };

  const goTo = (p: number) => {
    setPage(p);
    fetchData(p, applied.from, applied.to);
  };

  const totalPages = data ? Math.ceil(data.total / (data.limit || 20)) : 1;
  const isFiltered = applied.from || applied.to;

  // ── Custom PieChart label ──────────────────────────────────────────────────
  const renderPieLabel = (props: {
    cx?: number; cy?: number; midAngle?: number;
    innerRadius?: number; outerRadius?: number;
    percent?: number; name?: string;
  }) => {
    const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0, name = '' } = props;
    if (percent < 0.06) return null;
    const RADIAN = Math.PI / 180;
    const r  = innerRadius + (outerRadius - innerRadius) * 0.55;
    const x  = cx + r * Math.cos(-midAngle * RADIAN);
    const y  = cy + r * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x} y={y}
        fill={EMOTIVE_COLORS[name] ?? '#fff'}
        textAnchor="middle" dominantBaseline="central"
        fontSize={11} fontWeight={600}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full px-5 pb-6 pt-3">

      {/* ── Title ────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-4xl font-black tracking-tighter text-white mb-1">History</h1>
        <p className="text-white/35 text-sm">Full energy log from TursoDB</p>
      </div>

      {/* ── Filter bar ───────────────────────────────────────────────── */}
      <div className="glass-card p-4 mb-6 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-white/35 text-xs uppercase tracking-widest">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-white/35 text-xs uppercase tracking-widest">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>
        <div className="flex gap-2 pb-0.5">
          <button
            onClick={applyFilter}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-sm font-medium hover:bg-cyan-500/25 transition-colors"
          >
            <FontAwesomeIcon icon={faFilter} className="w-3 h-3" />
            Apply
          </button>
          {isFiltered && (
            <button
              onClick={clearFilter}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/50 text-sm hover:text-white hover:border-white/20 transition-colors"
            >
              <FontAwesomeIcon icon={faCircleXmark} className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
        {data && (
          <span className="ml-auto text-white/25 text-xs self-center">
            {data.total.toLocaleString()} readings
          </span>
        )}
      </div>

      {/* ── Loading / Error state ─────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-20 gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
          <span className="text-white/30 text-sm">Loading…</span>
        </div>
      )}
      {error && (
        <div className="glass-card p-6 text-center text-red-400 text-sm mb-6">
          Failed to load history: {error}
        </div>
      )}

      {/* ── Charts ───────────────────────────────────────────────────── */}
      {data && !loading && data.chartSeries.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

          {/* AreaChart — watts over time */}
          <div className="glass-card p-4 lg:col-span-3">
            <p className="text-white/35 text-xs uppercase tracking-widest mb-3">Active Power — Over Time</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.chartSeries.map((r) => ({
                  w: r.watts,
                  t: new Date(r.created_at * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                }))}>
                  <defs>
                    <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="t" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} width={40} unit=" W" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${Number(v).toFixed(1)} W`, 'Power']} />
                  <Area type="monotone" dataKey="w" stroke="#06b6d4" strokeWidth={2} fill="url(#wGrad)" dot={false} isAnimationActive={true} animationDuration={600} animationEasing="ease-out" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* BarChart — hourly averages */}
          <div className="glass-card p-4 lg:col-span-2">
            <p className="text-white/35 text-xs uppercase tracking-widest mb-3">Hourly Avg Watts</p>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.hourly} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} width={40} unit=" W" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${Number(v).toFixed(1)} W`, 'Avg']} />
                  <Bar dataKey="avgWatts" fill="#06b6d4" fillOpacity={0.7} radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={500} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* PieChart — emotive state distribution */}
          <div className="glass-card p-4">
            <p className="text-white/35 text-xs uppercase tracking-widest mb-3">Emotive States</p>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.emotiePie}
                    dataKey="value"
                    nameKey="state"
                    cx="50%" cy="50%"
                    outerRadius={72}
                    strokeWidth={0}
                    labelLine={false}
                    label={renderPieLabel}
                    isAnimationActive={true}
                    animationBegin={0}
                    animationDuration={600}
                    animationEasing="ease-out"
                  >
                    {data.emotiePie.map((entry) => (
                      <Cell
                        key={entry.state}
                        fill={EMOTIVE_COLORS[entry.state] ?? '#06b6d4'}
                        fillOpacity={0.8}
                      />
                    ))}
                  </Pie>
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(v) => (
                      <span style={{ color: EMOTIVE_COLORS[v] ?? '#fff', fontSize: 11 }}>
                        {v.charAt(0).toUpperCase() + v.slice(1)}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── Data table ───────────────────────────────────────────────── */}
      {data && !loading && (
        <>
          <div className="glass-card overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8">
                    {['Time', 'Voltage', 'Current', 'Watts', 'Energy', 'Freq', 'PF', 'Relay', 'State'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-white/35 text-xs uppercase tracking-widest font-medium whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-white/25 text-xs">
                        No readings found for the selected range.
                      </td>
                    </tr>
                  ) : (
                    data.rows.map((r, i) => (
                      <tr
                        key={r.id}
                        className={`border-b border-white/5 transition-colors hover:bg-white/3 ${i % 2 === 1 ? 'bg-white/2' : ''}`}
                      >
                        <td className="px-4 py-2.5 text-white/40 whitespace-nowrap tabular-nums">{fmt(r.created_at)}</td>
                        <td className="px-4 py-2.5 text-white/80 tabular-nums">{r.voltage.toFixed(1)} V</td>
                        <td className="px-4 py-2.5 text-white/80 tabular-nums">{r.current.toFixed(2)} A</td>
                        <td className="px-4 py-2.5 text-white    tabular-nums font-medium">{r.watts.toFixed(1)} W</td>
                        <td className="px-4 py-2.5 text-white/80 tabular-nums">{r.energy.toFixed(3)} kWh</td>
                        <td className="px-4 py-2.5 text-white/80 tabular-nums">{r.frequency.toFixed(1)} Hz</td>
                        <td className="px-4 py-2.5 text-white/80 tabular-nums">{r.pf.toFixed(2)}</td>
                        <td className="px-4 py-2.5">
                          <span className={r.relay_state ? 'text-cyan-400' : 'text-red-400'}>
                            {r.relay_state ? 'ON' : 'OFF'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <StateBadge state={r.emotive_state} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Pagination ──────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-white/25 text-xs">
                Page {page} of {totalPages} &middot; {data.total.toLocaleString()} total rows
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goTo(page - 1)}
                  disabled={page <= 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <FontAwesomeIcon icon={faChevronLeft} className="w-3 h-3" />
                </button>

                {/* Page numbers — show 5 around current page */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  return start + i;
                }).map((p) => (
                  <button
                    key={p}
                    onClick={() => goTo(p)}
                    className={[
                      'w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-colors',
                      p === page
                        ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-400'
                        : 'bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/20',
                    ].join(' ')}
                  >
                    {p}
                  </button>
                ))}

                <button
                  onClick={() => goTo(page + 1)}
                  disabled={page >= totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <FontAwesomeIcon icon={faChevronRight} className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
