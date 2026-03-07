/**
 * InsightsPage — Gemini AI analysis panel for Ether.
 *
 * Sections:
 *  1. Header with RotatingText subtitle
 *  2. "Analyze Now" hero card — triggers /api/generate-insight
 *  3. Emotive state timeline strip (latest 50 readings coloured by state)
 *  4. AnimatedList of all stored insights (newest first, paginated)
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBrain,
  faSpinner,
  faChevronLeft,
  faChevronRight,
  faClock,
} from '@fortawesome/free-solid-svg-icons';

import RotatingText from './reactbits/RotatingText';
import AnimatedList from './reactbits/AnimatedList';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Insight {
  id:         number;
  content:    string;
  created_at: number;
}

interface InsightsData {
  insights: Insight[];
  total:    number;
  page:     number;
  limit:    number;
}

interface TimelinePoint {
  emotive_state: string;
  created_at:    number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EMOTIVE: Record<string, { color: string; label: string }> = {
  cyan:   { color: '#06b6d4', label: 'Idle'        },
  pink:   { color: '#ec4899', label: 'Happy'       },
  yellow: { color: '#eab308', label: 'Dizzy'       },
  purple: { color: '#a855f7', label: 'Frustrated'  },
  red:    { color: '#ef4444', label: 'Angry'       },
};

const AUTO_REFRESH_MS = 60_000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(unix: number): string {
  const diff = Math.floor(Date.now() / 1000) - unix;
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return new Date(unix * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function fmtFull(unix: number): string {
  return new Date(unix * 1000).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Main component ────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const [data,       setData]       = useState<InsightsData | null>(null);
  const [timeline,   setTimeline]   = useState<TimelinePoint[]>([]);
  const [generating, setGenerating] = useState(false);
  const [genError,   setGenError]   = useState<string | null>(null);
  const [genSuccess, setGenSuccess] = useState<string | null>(null);
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);
  const autoTimer    = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch insights list ───────────────────────────────────────────────────

  const fetchInsights = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/get-insights?page=${p}`);
      const json: InsightsData = await res.json();
      setData(json);
    } catch {
      // silent — keep prior data
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch timeline strip from get-latest ─────────────────────────────────

  const fetchTimeline = useCallback(async () => {
    try {
      const res  = await fetch('/api/get-latest');
      const json = await res.json();
      if (json.readings) {
        setTimeline(
          (json.readings as { emotive_state: string; created_at: number }[])
            .slice()
            .reverse(),
        );
      }
    } catch { /* ignore */ }
  }, []);

  // ── Initial load + auto-refresh ──────────────────────────────────────────

  useEffect(() => {
    fetchInsights(1);
    fetchTimeline();

    autoTimer.current = setInterval(() => {
      fetchInsights(page);
      fetchTimeline();
    }, AUTO_REFRESH_MS);

    return () => {
      if (autoTimer.current) clearInterval(autoTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Generate new insight ─────────────────────────────────────────────────

  const generateInsight = async () => {
    if (generating) return;
    setGenerating(true);
    setGenError(null);
    setGenSuccess(null);

    try {
      const res  = await fetch('/api/generate-insight', { method: 'POST' });
      const json = await res.json();

      if (!res.ok || json.error) {
        setGenError(json.error ?? `HTTP ${res.status}`);
      } else {
        setGenSuccess(json.content as string);
        // Reload list from page 1 to show new insight at top.
        setPage(1);
        await fetchInsights(1);
        fetchTimeline();
      }
    } catch (e) {
      setGenError(String(e));
    } finally {
      setGenerating(false);
    }
  };

  const goTo = (p: number) => {
    setPage(p);
    fetchInsights(p);
  };

  const totalPages = data ? Math.ceil(data.total / (data.limit || 10)) : 1;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="mb-10">
        <h1 className="text-4xl font-black tracking-tighter text-white mb-2">AI Insights</h1>
        <p className="text-white/35 text-sm h-5">
          <RotatingText
            texts={[
              'Powered by Gemini 1.5 Pro',
              'Analyzing your last 24 hours',
              'Emotive energy intelligence',
              'Auto-refreshes every 60 seconds',
            ]}
            intervalMs={3500}
          />
        </p>
      </div>

      {/* ── Emotive Timeline ─────────────────────────────────────────── */}
      {timeline.length > 0 && (
        <div className="glass-card p-4 mb-6">
          <p className="text-white/35 text-xs uppercase tracking-widest mb-3">
            Emotive State Timeline — last {timeline.length} readings
          </p>
          <div className="flex items-end gap-0.5 h-10 overflow-hidden rounded-md">
            {timeline.map((t, i) => {
              const color = EMOTIVE[t.emotive_state]?.color ?? '#06b6d4';
              return (
                <div
                  key={i}
                  title={`${EMOTIVE[t.emotive_state]?.label ?? t.emotive_state} · ${fmtFull(t.created_at)}`}
                  className="flex-1 rounded-sm cursor-default transition-opacity hover:opacity-70"
                  style={{ background: color, height: '100%', opacity: 0.75 }}
                />
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3">
            {Object.entries(EMOTIVE).map(([key, { color, label }]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-[10px] text-white/35">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Generate Card ─────────────────────────────────────────────── */}
      <div
        className="glass-card p-6 mb-6"
        style={{ borderColor: 'rgba(6,182,212,0.25)', boxShadow: '0 0 32px rgba(6,182,212,0.06)' }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <FontAwesomeIcon icon={faBrain} className="text-cyan-400 w-4 h-4" />
              <span className="text-cyan-400 text-xs font-bold uppercase tracking-widest">Gemini 1.5 Pro</span>
            </div>
            <p className="text-white/55 text-sm leading-relaxed">
              Analyzes the last 24 hours of energy data — power trends, anomalies, efficiency, and emotive patterns — then stores the result.
            </p>
          </div>
          <button
            onClick={generateInsight}
            disabled={generating}
            className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: generating ? 'rgba(6,182,212,0.08)' : 'rgba(6,182,212,0.15)',
              border:     '1px solid rgba(6,182,212,0.35)',
              color:      '#06b6d4',
            }}
          >
            {generating
              ? <><FontAwesomeIcon icon={faSpinner} className="animate-spin w-3.5 h-3.5" /> Analyzing…</>
              : <><FontAwesomeIcon icon={faBrain}   className="w-3.5 h-3.5" /> Analyze Now</>}
          </button>
        </div>

        {/* Gen error */}
        {genError && (
          <div className="mt-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
            {genError}
          </div>
        )}

        {/* Freshly generated insight preview */}
        {genSuccess && !genError && (
          <div
            className="mt-4 px-4 py-3 rounded-lg text-sm leading-relaxed text-white/75"
            style={{ background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.2)' }}
          >
            {genSuccess}
          </div>
        )}
      </div>

      {/* ── Insights List ─────────────────────────────────────────────── */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-white/60 text-xs uppercase tracking-widest font-medium">
          Stored Insights{data ? ` · ${data.total}` : ''}
        </h2>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
          <span className="text-white/30 text-sm">Loading…</span>
        </div>
      )}

      {!loading && data && (
        <>
          {data.insights.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-white/20 text-sm">No insights yet. Hit "Analyze Now" to generate the first one.</p>
            </div>
          ) : (
            <AnimatedList staggerMs={70} className="flex flex-col gap-3">
              {data.insights.map((ins) => (
                <InsightCard key={ins.id} insight={ins} />
              ))}
            </AnimatedList>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <span className="text-white/25 text-xs">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goTo(page - 1)}
                  disabled={page <= 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <FontAwesomeIcon icon={faChevronLeft}  className="w-3 h-3" />
                </button>
                <button
                  onClick={() => goTo(page + 1)}
                  disabled={page >= totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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

// ── InsightCard ───────────────────────────────────────────────────────────────

function InsightCard({ insight }: { insight: Insight }) {
  const [expanded, setExpanded] = useState(false);
  // Show first 240 chars when collapsed.
  const isLong    = insight.content.length > 240;
  const displayed = !isLong || expanded
    ? insight.content
    : `${insight.content.slice(0, 240)}…`;

  return (
    <div className="glass-card p-5 transition-colors hover:border-white/15">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faBrain} className="text-cyan-400/60 w-3.5 h-3.5" />
          <span className="text-cyan-400/70 text-[10px] font-bold uppercase tracking-widest">Gemini</span>
        </div>
        <div className="flex items-center gap-1.5 text-white/25 text-[10px]">
          <FontAwesomeIcon icon={faClock} className="w-2.5 h-2.5" />
          <span title={fmtFull(insight.created_at)}>{timeAgo(insight.created_at)}</span>
        </div>
      </div>
      <p className="text-white/65 text-sm leading-relaxed">{displayed}</p>
      {isLong && (
        <button
          onClick={() => setExpanded((p) => !p)}
          className="mt-2 text-xs text-cyan-400/60 hover:text-cyan-400 transition-colors"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}
