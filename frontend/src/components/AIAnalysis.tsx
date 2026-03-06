import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Insight {
  type: 'info' | 'warning' | 'tip' | 'alert';
  title: string;
  body: string;
}

interface AnalysisResult {
  summary: string;
  insights: Insight[];
  advice: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  generated_at: string;
  mock?: boolean;
}

type IntervalOption = 30 | 60 | 120 | 300;

interface AIPrefs {
  realtimeEnabled: boolean;
  intervalSec: IntervalOption;
  showInsights: boolean;
  showAdvice: boolean;
  showAlerts: boolean;
}

const DEFAULT_PREFS: AIPrefs = {
  realtimeEnabled: false,
  intervalSec: 60,
  showInsights: true,
  showAdvice: true,
  showAlerts: true,
};

const INTERVAL_OPTIONS: { value: IntervalOption; label: string }[] = [
  { value: 30,  label: '30 s' },
  { value: 60,  label: '1 min' },
  { value: 120, label: '2 min' },
  { value: 300, label: '5 min' },
];

// ── Config ────────────────────────────────────────────────────────────────────
const INSIGHT_CONFIG = {
  info:    { icon: 'fa-circle-info',           color: '#00f5ff', label: 'Info' },
  warning: { icon: 'fa-triangle-exclamation',  color: '#ffe600', label: 'Warning' },
  tip:     { icon: 'fa-lightbulb',             color: '#b44fff', label: 'Tip' },
  alert:   { icon: 'fa-shield-exclamation',    color: '#ff2020', label: 'Alert' },
};

const RISK_CONFIG = {
  low:      { color: '#00f5ff', icon: 'fa-circle-check',         label: 'Low Risk' },
  medium:   { color: '#ffe600', icon: 'fa-circle-exclamation',   label: 'Medium Risk' },
  high:     { color: '#ff2d78', icon: 'fa-triangle-exclamation', label: 'High Risk' },
  critical: { color: '#ff2020', icon: 'fa-skull',                label: 'Critical' },
};

// ── Sub-components ────────────────────────────────────────────────────────────
function RiskBadge({ level }: { level: AnalysisResult['risk_level'] }) {
  const cfg = RISK_CONFIG[level];
  return (
    <div
      className="risk-badge"
      style={{ '--risk-color': cfg.color } as React.CSSProperties}
    >
      <i className={`fa-solid ${cfg.icon}`} />
      {cfg.label}
    </div>
  );
}

function InsightCard({ insight, index }: { insight: Insight; index: number }) {
  const cfg = INSIGHT_CONFIG[insight.type] ?? INSIGHT_CONFIG.info;
  return (
    <motion.div
      className="insight-card"
      style={{ '--insight-color': cfg.color } as React.CSSProperties}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.35 }}
    >
      <div className="insight-icon">
        <i className={`fa-solid ${cfg.icon}`} />
      </div>
      <div className="insight-body">
        <div className="insight-header">
          <span className="insight-type">{cfg.label}</span>
          <span className="insight-title">{insight.title}</span>
        </div>
        <p className="insight-text">{insight.body}</p>
      </div>
    </motion.div>
  );
}

function StreamingText({ text }: { text: string }) {
  return (
    <motion.p
      className="analysis-summary"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {text}
    </motion.p>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AIAnalysis() {
  const [result,  setResult]  = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Preferences (persisted)
  const [prefs, setPrefs] = useState<AIPrefs>(() => {
    try {
      const raw = localStorage.getItem('ether:ai-prefs');
      if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
    } catch {}
    return DEFAULT_PREFS;
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const savePrefs = (next: AIPrefs) => {
    setPrefs(next);
    try { localStorage.setItem('ether:ai-prefs', JSON.stringify(next)); } catch {}
  };
  const patchPrefs = (patch: Partial<AIPrefs>) => savePrefs({ ...prefs, ...patch });

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`${API_BASE}/api/analysis`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Unknown error');
      setResult(data as AnalysisResult);
    } catch (e: any) {
      setError(e.message ?? 'Analysis failed.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Realtime interval
  useEffect(() => {
    clearInterval(timerRef.current);
    if (prefs.realtimeEnabled) {
      timerRef.current = setInterval(runAnalysis, prefs.intervalSec * 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [prefs.realtimeEnabled, prefs.intervalSec, runAnalysis]);

  const risk = result ? RISK_CONFIG[result.risk_level] : null;

  // Derived: filter insights by type for alert visibility
  const visibleInsights = result?.insights.filter(ins =>
    prefs.showAlerts || ins.type !== 'alert'
  ) ?? [];

  const RISK_PCT: Record<AnalysisResult['risk_level'], number> = {
    low: 18, medium: 45, high: 72, critical: 100,
  };

  return (
    <div className="ai-root">

      {/* ── Hero trigger panel ── */}
      <div className="ai-trigger-panel">
        <div className="ai-trigger-bg" aria-hidden />
        <div className="ai-trigger-left">
          <div className="ai-model-badge">
            <i className="fa-solid fa-microchip-ai" />
            Gemini 1.5 Flash
          </div>
          <h2 className="ai-trigger-heading">AI Energy Analysis</h2>
          <p className="ai-desc">
            Analyzes your last 50 readings — surfaces inefficiencies,
            flags risks, and suggests optimisations.
          </p>
        </div>
        <button
          className={`ai-run-btn ${loading ? 'loading' : ''}`}
          onClick={runAnalysis}
          disabled={loading}
        >
          {loading
            ? <><i className="fa-solid fa-circle-notch fa-spin" /> Analyzing…</>
            : <><i className="fa-solid fa-wand-magic-sparkles" /> Run Analysis</>
          }
        </button>
      </div>

      {/* ── Controls toolbar ── */}
      <div className="ai-controls">
        <div className={`ai-rt-toggle ${prefs.realtimeEnabled ? 'on' : ''}`}>
          <button
            className="ai-rt-btn"
            onClick={() => patchPrefs({ realtimeEnabled: !prefs.realtimeEnabled })}
          >
            <i className={`fa-solid ${prefs.realtimeEnabled ? 'fa-stop' : 'fa-play'}`} />
            {prefs.realtimeEnabled ? 'Stop Auto' : 'Auto-Analyze'}
          </button>
          {prefs.realtimeEnabled && (
            <div className="ai-rt-interval">
              {INTERVAL_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`ai-interval-btn ${prefs.intervalSec === opt.value ? 'active' : ''}`}
                  onClick={() => patchPrefs({ intervalSec: opt.value })}
                >{opt.label}</button>
              ))}
            </div>
          )}
          {prefs.realtimeEnabled && (
            <span className="ai-rt-dot" title="Auto-analysis active" />
          )}
        </div>

        <div className="ai-section-toggles">
          <button className={`ai-section-btn ${prefs.showInsights ? 'on' : ''}`}
            onClick={() => patchPrefs({ showInsights: !prefs.showInsights })}>
            <i className="fa-solid fa-list-check" /> Insights
          </button>
          <button className={`ai-section-btn ${prefs.showAlerts ? 'on' : ''}`}
            onClick={() => patchPrefs({ showAlerts: !prefs.showAlerts })}>
            <i className="fa-solid fa-shield-exclamation" /> Alerts
          </button>
          <button className={`ai-section-btn ${prefs.showAdvice ? 'on' : ''}`}
            onClick={() => patchPrefs({ showAdvice: !prefs.showAdvice })}>
            <i className="fa-solid fa-circle-check" /> Advice
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="dash-error">
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="ai-loading-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="insight-card-skeleton">
              <div className="skeleton-box" style={{ width: 40, height: 40, borderRadius: 8, flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="skeleton-box" style={{ width: '40%', height: 10, borderRadius: 4 }} />
                <div className="skeleton-box" style={{ width: '90%', height: 14, borderRadius: 4 }} />
                <div className="skeleton-box" style={{ width: '75%', height: 14, borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Results ── */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div
            className="ai-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Risk banner */}
            <motion.div
              className="ai-risk-banner"
              style={{ '--risk-color': risk?.color } as React.CSSProperties}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <div className="ai-risk-left">
                <RiskBadge level={result.risk_level} />
                {result.mock && (
                  <span className="mock-indicator">
                    <i className="fa-solid fa-flask" /> MOCK
                  </span>
                )}
              </div>
              <div className="ai-risk-meter">
                <div className="ai-risk-track">
                  <motion.div
                    className="ai-risk-fill"
                    style={{ background: risk?.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${RISK_PCT[result.risk_level]}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                  />
                </div>
                <span className="ai-risk-pct" style={{ color: risk?.color }}>
                  {RISK_PCT[result.risk_level]}%
                </span>
              </div>
              <span className="ai-timestamp">
                <i className="fa-regular fa-clock" style={{ marginRight: 4 }} />
                {new Date(result.generated_at).toLocaleTimeString()}
              </span>
            </motion.div>

            {/* Summary card */}
            <motion.div
              className="ai-summary-card"
              style={{ '--risk-color': risk?.color } as React.CSSProperties}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="ai-summary-icon">
                <i className={`fa-solid ${risk?.icon}`} style={{ color: risk?.color }} />
              </div>
              <div>
                <p className="ai-summary-label">Summary</p>
                <StreamingText text={result.summary} />
              </div>
            </motion.div>

            {/* Insights grid */}
            {prefs.showInsights && visibleInsights.length > 0 && (
              <div>
                <p className="ai-section-heading">
                  <i className="fa-solid fa-list-check" />
                  Insights <span className="ai-section-count">{visibleInsights.length}</span>
                </p>
                <div className="ai-insights-grid">
                  {visibleInsights.map((insight, i) => (
                    <InsightCard key={i} insight={insight} index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Advice footer */}
            {prefs.showAdvice && (
              <motion.div
                className="ai-advice-card"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: visibleInsights.length * 0.08 + 0.2, duration: 0.4 }}
              >
                <div className="ai-advice-icon-wrap">
                  <i className="fa-solid fa-lightbulb" />
                </div>
                <div>
                  <p className="ai-advice-label">Recommendation</p>
                  <p className="ai-advice-text">{result.advice}</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Empty state ── */}
      {!result && !loading && !error && (
        <div className="ai-empty">
          <i className="fa-solid fa-brain ai-empty-icon" />
          <p>Press <strong>Run Analysis</strong> to get AI-powered insights about your energy usage.</p>
        </div>
      )}
    </div>
  );
}
