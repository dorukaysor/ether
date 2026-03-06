import React, { useState, useReducer, useEffect, useCallback, useRef, memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { API_BASE, WS_BASE } from '../lib/api';
import ChromaGrid from './ChromaGrid';
import { type ReadingItem } from './ChromaGrid';
import EmotiveState from './EmotiveState';
import PowerSparkline from './PowerSparkline';
import EventFeed, { type EtherEvent } from './EventFeed';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Readings {
  voltage: number; current: number; power: number;
  energy: number; frequency: number; power_factor: number;
}
interface ApiResponse {
  readings: Readings; state: string; relay: boolean; timestamp: string;
}
export type MockMode = 'off' | 'idle' | 'happy' | 'dizzy' | 'frustrated' | 'angry' | 'auto';
type SparkPoint = { t: number; power: number };

const STATE_COLORS: Record<string, string> = {
  idle: '#00f5ff', happy: '#ff2d78', dizzy: '#ffe600',
  frustrated: '#b44fff', angry: '#ff2020',
};

const STATE_ICONS: Record<string, string> = {
  idle: 'fa-circle-dot', happy: 'fa-heart', dizzy: 'fa-rotate',
  frustrated: 'fa-fire', angry: 'fa-skull',
};

// ── Toast notification system ─────────────────────────────────────────────────
interface Toast {
  id: string;
  type: 'info' | 'warn' | 'alert' | 'success';
  title: string;
  body?: string;
  color?: string;
  icon?: string;
  duration?: number; // ms; 0 = sticky until dismissed
  action?: { label: string; href?: string; onClick?: () => void };
}

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { ...t, id }]);
    const dur = t.duration ?? 6000;
    if (dur > 0) {
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), dur);
    }
    return id;
  }, []);

  return { toasts, push, dismiss };
}

const TOAST_ICONS: Record<Toast['type'], string> = {
  info:    'fa-circle-info',
  warn:    'fa-triangle-exclamation',
  alert:   'fa-shield-exclamation',
  success: 'fa-circle-check',
};
const TOAST_COLORS: Record<Toast['type'], string> = {
  info:    '#00f5ff',
  warn:    '#ffe600',
  alert:   '#ff2020',
  success: '#00ff88',
};

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="toast-container">
      <AnimatePresence initial={false}>
        {toasts.map(t => {
          const color = t.color ?? TOAST_COLORS[t.type];
          const icon  = t.icon  ?? TOAST_ICONS[t.type];
          return (
            <motion.div
              key={t.id}
              className="toast"
              style={{ '--tc': color } as React.CSSProperties}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: '110%' }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
            >
              <div className="toast-icon-wrap">
                <i className={`fa-solid ${icon}`} />
              </div>
              <div className="toast-body">
                <span className="toast-title">{t.title}</span>
                {t.body && <span className="toast-text">{t.body}</span>}
                {t.action && (
                  t.action.href
                    ? <a href={t.action.href} className="toast-action">{t.action.label}</a>
                    : <button className="toast-action" onClick={t.action.onClick}>{t.action.label}</button>
                )}
              </div>
              <button className="toast-close" onClick={() => onDismiss(t.id)}>
                <i className="fa-solid fa-xmark" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ── Mock builder (static modes — 'auto' handled via tickAuto in component) ───
export function buildMock(mode: Exclude<MockMode, 'auto' | 'off'>): ApiResponse {
  const r = () => Math.random();
  let power: number, state: string, relay = true;
  switch (mode) {
    case 'happy':      power = 20 + r() * 15;    state = 'happy';      break;
    case 'dizzy':      power = 50 + r() * 1400;  state = 'dizzy';      break;
    case 'frustrated': power = 1050 + r() * 200; state = 'frustrated'; break;
    case 'angry':      power = 2600 + r() * 300; state = 'angry'; relay = false; break;
    default:           power = 120 + r() * 80;   state = 'idle';
  }
  return {
    readings: {
      voltage: 220 + r() * 5, current: parseFloat((power / 220).toFixed(3)),
      power, energy: 1.234 + r() * 0.001,
      frequency: 50 + (r() - 0.5) * 0.2, power_factor: 0.95 + (r() - 0.5) * 0.05,
    },
    state, relay, timestamp: new Date().toISOString(),
  };
}

// ── Constants ─────────────────────────────────────────────────────────────────
const SPARK_MAX = 40;
const CARDS = [
  { key: 'voltage',      label: 'Voltage',      unit: 'V',   icon: 'fa-bolt',             color: '#00f5ff', decimals: 1 },
  { key: 'current',      label: 'Current',      unit: 'A',   icon: 'fa-water',            color: '#ff2d78', decimals: 3 },
  { key: 'power',        label: 'Power',        unit: 'W',   icon: 'fa-plug-circle-bolt', color: '#ffe600', decimals: 1 },
  { key: 'energy',       label: 'Energy',       unit: 'kWh', icon: 'fa-battery-full',     color: '#b44fff', decimals: 3 },
  { key: 'frequency',    label: 'Frequency',    unit: 'Hz',  icon: 'fa-wave-square',      color: '#00f5ff', decimals: 1 },
  { key: 'power_factor', label: 'Power Factor', unit: '',    icon: 'fa-percent',          color: '#ff2d78', decimals: 2 },
] as const;

// ── UptimeClock — mutates DOM directly, never triggers React re-renders ───────
const UptimeClock = memo(function UptimeClock({ start }: { start: Date }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const tick = () => {
      if (!ref.current) return;
      const s = Math.floor((Date.now() - start.getTime()) / 1000);
      ref.current.textContent = [
        Math.floor(s / 3600),
        Math.floor((s % 3600) / 60),
        s % 60,
      ].map(n => String(n).padStart(2, '0')).join(':');
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <span ref={ref} className="sp-val sp-clock">00:00:00</span>;
});

// ── Animated hero power number — DOM ref, zero React re-renders during animation ─
const HeroPowerValue = memo(function HeroPowerValue({ watts, color }: { watts: number; color: string }) {
  const spanRef  = useRef<HTMLSpanElement>(null);
  const rafRef   = useRef<number | undefined>(undefined);
  const fromRef  = useRef<number | null>(null);
  const colorRef = useRef(color);

  useEffect(() => {
    colorRef.current = color;
    if (spanRef.current) spanRef.current.style.color = color;
  }, [color]);

  useEffect(() => {
    if (fromRef.current === null) {
      fromRef.current = watts;
      if (spanRef.current) spanRef.current.textContent = watts.toFixed(1);
      return;
    }
    const from = fromRef.current;
    const to   = watts;
    const t0   = performance.now();
    const dur  = 450;
    if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    const step = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3); // easeOutCubic
      fromRef.current = from + (to - from) * ease;
      if (spanRef.current) spanRef.current.textContent = (fromRef.current as number).toFixed(1);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current); };
  }, [watts]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="hpc-value-display">
      <span ref={spanRef} className="hpc-val" style={{ color }} />
      <span className="hpc-unit">W</span>
    </div>
  );
});

// ── Reducer — single dispatch per fetch, one re-render per cycle ──────────────
interface DashState {
  data: ApiResponse | null; loading: boolean; error: string | null;
  lastUpdated: Date | null; sparkData: SparkPoint[];
  sessionKwh: number; sessionPeak: number; events: EtherEvent[];
}
type Action =
  | { type: 'RESET' }
  | { type: 'ERROR'; msg: string }
  | { type: 'DATA'; payload: { res: ApiResponse; pt: SparkPoint; kwhDelta: number; newEvts: EtherEvent[] } };

const INIT: DashState = {
  data: null, loading: true, error: null, lastUpdated: null,
  sparkData: [], sessionKwh: 0, sessionPeak: 0, events: [],
};

function reducer(s: DashState, a: Action): DashState {
  switch (a.type) {
    case 'RESET': return { ...s, loading: true, data: null, sparkData: [], error: null };
    case 'ERROR': return { ...s, loading: false, error: a.msg };
    case 'DATA': {
      const { res, pt, kwhDelta, newEvts } = a.payload;
      return {
        ...s, data: res, loading: false, error: null, lastUpdated: new Date(),
        sparkData: [...s.sparkData, pt].slice(-SPARK_MAX),
        sessionKwh:  parseFloat((s.sessionKwh + kwhDelta).toFixed(4)),
        sessionPeak: Math.max(s.sessionPeak, res.readings.power),
        events: newEvts.length ? [...newEvts, ...s.events].slice(0, 20) : s.events,
      };
    }
  }
}

function readMockMode(): MockMode {
  try { return (localStorage.getItem('ether:mockMode') as MockMode) ?? 'off'; }
  catch { return 'off'; }
}
// ── Backend health badge ──────────────────────────────────────────────────────

function BackendStatus() {
  const [status, setStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(4000) });
        if (active) setStatus(res.ok ? 'online' : 'offline');
      } catch {
        if (active) setStatus('offline');
      }
    };
    check();
    const id = setInterval(check, 15_000);
    return () => { active = false; clearInterval(id); };
  }, []);

  const label = status === 'online' ? 'API Online' : status === 'offline' ? 'API Offline' : 'API…';
  const icon  = status === 'online' ? 'fa-server' : status === 'offline' ? 'fa-server' : 'fa-circle-notch';

  return (
    <span className={`backend-badge ${status}`}>
      <i className={`fa-solid ${icon} bb-dot ${status === 'unknown' ? 'fa-spin' : ''}`} />
      {label}
    </span>
  );
}
// ── Memoized heavy children ───────────────────────────────────────────────────
const MemoSparkline    = memo(PowerSparkline);
const MemoEventFeed    = memo(EventFeed);
const MemoEmotiveState = memo(EmotiveState);

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function LiveDashboard() {
  const [st, dispatch]   = useReducer(reducer, INIT);
  const [mockMode, setMockMode] = useState<MockMode>(readMockMode);
  const sessionStart = useRef(new Date());
  const prevEnergy   = useRef<number | null>(null);
  const prevState    = useRef<string | null>(null);
  const prevRelay    = useRef<boolean | null>(null);
  const eventId      = useRef(0);
  const lastEventId  = useRef(-1);

  const { toasts, push, dismiss } = useToasts();

  // ── Auto-mode simulation state ────────────────────────────────────────────
  const autoRef = useRef({ basePower: 150, trend: 0, ticks: 0 });

  const tickAuto = useCallback((): ApiResponse => {
    const a = autoRef.current;
    a.ticks++;
    a.trend += (Math.random() - 0.5) * 10;
    a.trend  = Math.max(-55, Math.min(55, a.trend));
    a.basePower += a.trend / 10 + (Math.random() - 0.5) * 14;
    a.basePower  = Math.max(10, Math.min(2600, a.basePower));
    if (Math.random() < 0.04) {
      const spike = (180 + Math.random() * 550) * (Math.random() > 0.5 ? 1 : -1);
      a.basePower = Math.max(10, Math.min(2600, a.basePower + spike));
      a.trend     = 0;
    }
    const power = a.basePower + (Math.random() - 0.5) * 6;
    let state: string;
    if (power < 40)         state = 'happy';
    else if (power < 900)   state = 'idle';
    else if (power < 1400)  state = 'dizzy';
    else if (power < 2100)  state = 'frustrated';
    else                    state = 'angry';
    const r = Math.random;
    return {
      readings: {
        voltage:      220 + (r() - 0.5) * 4,
        current:      parseFloat((power / 220).toFixed(3)),
        power,
        energy:       1.234 + r() * 0.001,
        frequency:    50 + (r() - 0.5) * 0.2,
        power_factor: 0.92 + r() * 0.06,
      },
      state, relay: power < 2500,
      timestamp: new Date().toISOString(),
    };
  }, []); // stable — only reads autoRef

  // ── Mock suggestion toast on first load in live mode ─────────────────────
  useEffect(() => {
    if (mockMode !== 'off') return;
    const shown = sessionStorage.getItem('ether:mock-hint');
    if (shown) return;
    sessionStorage.setItem('ether:mock-hint', '1');
    const t = setTimeout(() => {
      push({
        type: 'info',
        title: 'Running in Live Mode',
        body: 'No ESP32 connected yet? Switch to Mock Mode for a demo.',
        icon: 'fa-flask',
        color: '#ffe600',
        duration: 9000,
        action: { label: 'Go to Settings →', href: '/settings' },
      });
    }, 1800);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Toast on critical events (relay trip / angry) ─────────────────────────
  useEffect(() => {
    if (!st.events.length) return;
    const newest = st.events[0];
    if (newest.id <= lastEventId.current) return;
    lastEventId.current = newest.id;

    if (newest.type === 'relay' && !st.data?.relay) {
      push({ type: 'alert', title: 'Relay Tripped', body: 'Power exceeded critical threshold — relay cut off.', icon: 'fa-bolt', duration: 0 });
    } else if (newest.type === 'state' && st.data?.state === 'angry') {
      push({ type: 'alert', title: 'Critical Load Detected', body: 'Power entered Angry state (>2500 W).', icon: 'fa-skull', duration: 8000 });
    } else if (newest.type === 'relay' && st.data?.relay) {
      push({ type: 'success', title: 'Relay Restored', icon: 'fa-circle-check', duration: 4000 });
    }
  }, [st.events]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync mockMode from Settings page ──────────────────────────────────────
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'ether:mockMode') setMockMode((e.newValue as MockMode) ?? 'idle');
    };
    const onCustom = (e: Event) => setMockMode((e as CustomEvent).detail as MockMode);
    window.addEventListener('storage', onStorage);
    window.addEventListener('ether:mockMode', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('ether:mockMode', onCustom);
    };
  }, []);

  // ── Reset state on mode change ────────────────────────────────────────────
  useEffect(() => {
    dispatch({ type: 'RESET' });
    prevEnergy.current = null;
    prevState.current  = null;
    prevRelay.current  = null;
    if (mockMode === 'auto') autoRef.current = { basePower: 150, trend: 0, ticks: 0 };
  }, [mockMode]);

  // ── Core reading processor — shared by WebSocket and mock paths ─────────────────
  const processReading = useCallback((res: ApiResponse) => {
    const pt: SparkPoint = { t: Date.now(), power: res.readings.power };

    let kwhDelta = 0;
    if (prevEnergy.current !== null) {
      const d = res.readings.energy - prevEnergy.current;
      if (d > 0) kwhDelta = d;
    }
    prevEnergy.current = res.readings.energy;

    const newEvts: EtherEvent[] = [];
    if (prevState.current !== null && prevState.current !== res.state) {
      newEvts.push({ id: eventId.current++, ts: new Date(), type: 'state',
        message: `State → ${res.state}`, color: STATE_COLORS[res.state] ?? '#6b6b8a',
        icon: STATE_ICONS[res.state] ?? 'fa-circle-dot' });
    }
    prevState.current = res.state;

    if (prevRelay.current !== null && prevRelay.current !== res.relay) {
      newEvts.push({ id: eventId.current++, ts: new Date(), type: 'relay',
        message: `Relay ${res.relay ? 'ON' : 'OFF'}`, color: res.relay ? '#00f5ff' : '#ff2020',
        icon: res.relay ? 'fa-plug' : 'fa-plug-circle-xmark' });
    }
    prevRelay.current = res.relay;

    dispatch({ type: 'DATA', payload: { res, pt, kwhDelta, newEvts } });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mock tick — builds a reading from mock generators ────────────────────────
  const fetchMock = useCallback(() => {
    processReading(mockMode === 'auto' ? tickAuto() : buildMock(mockMode as Exclude<MockMode, 'auto' | 'off'>));
  }, [mockMode, tickAuto, processReading]);

  // ── WebSocket (live mode) ─────────────────────────────────────────────────────
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');

  useEffect(() => {
    if (mockMode !== 'off') return;
    let active = true;
    let ws: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      setWsStatus('connecting');
      ws = new WebSocket(`${WS_BASE}/ws`);

      ws.onopen = () => {
        if (!active) { ws?.close(); return; }
        setWsStatus('connected');
        // Fetch an immediate snapshot so the UI isn’t blank before the first push
        fetch(`${API_BASE}/api/readings`)
          .then(r => r.json())
          .then(d => { if (active) processReading(d as ApiResponse); })
          .catch(() => { if (active) dispatch({ type: 'ERROR', msg: 'Could not reach ETHER unit.' }); });
      };

      ws.onmessage = (ev) => {
        if (!active) return;
        try {
          const msg = JSON.parse(ev.data as string) as { type: string; data: ApiResponse };
          if (msg.type === 'reading') processReading(msg.data);
        } catch { /* ignore malformed frames */ }
      };

      ws.onerror = () => { if (active) setWsStatus('error'); };

      ws.onclose = () => {
        if (!active) return;
        setWsStatus('disconnected');
        retryTimer = setTimeout(connect, 4000);
      };
    };

    connect();

    return () => {
      active = false;
      clearTimeout(retryTimer);
      ws?.close();
    };
  }, [mockMode, processReading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mock interval (non-live modes) ───────────────────────────────────────────────────
  useEffect(() => {
    if (mockMode === 'off') return;
    fetchMock();
    const id = setInterval(fetchMock, 3000);
    return () => clearInterval(id);
  }, [fetchMock, mockMode]);

  const { data, loading, error, lastUpdated, sparkData, sessionKwh, sessionPeak, events } = st;
  const readings  = data?.readings ?? null;
  const stateVal  = data?.state    ?? 'idle';
  const relay     = data?.relay    ?? true;
  const sparkColor = loading ? '#2e2e4a' : (STATE_COLORS[stateVal] ?? '#00f5ff');

  return (
    <div className="live-dashboard" style={{ '--sc': sparkColor } as React.CSSProperties}>

      {/* ── Topbar ── */}
      <div className="dash-topbar">
        <MemoEmotiveState state={loading ? 'idle' : stateVal} watts={loading ? null : (readings?.power ?? null)} />
        <div className="dash-meta">
          {mockMode !== 'off' && (
            <span className="mock-indicator">
              <i className="fa-solid fa-flask" /> MOCK · {mockMode}
            </span>
          )}
          {mockMode === 'off' && (
            <span className={`ws-badge ${wsStatus}`}>
              <i className={`fa-solid ${
                wsStatus === 'connected'    ? 'fa-circle' :
                wsStatus === 'connecting'   ? 'fa-circle-half-stroke' :
                                             'fa-circle-exclamation'
              }`} />
              {wsStatus === 'connected' ? 'Live' : wsStatus === 'connecting' ? 'Connecting…' : 'Reconnecting…'}
            </span>
          )}
          <span className={`relay-badge ${relay ? 'on' : 'off'}`}>
            <i className={`fa-solid ${relay ? 'fa-circle-check' : 'fa-circle-xmark'}`} />
            Relay {relay ? 'ON' : 'OFF'}
          </span>
          <BackendStatus />
          {lastUpdated && !loading && (
            <span className="last-updated">
              <i className="fa-regular fa-clock" /> {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="dash-error">
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}

      {/* ── 3-column main grid ── */}
      <div className="dash-main">

        {/* Left col — session stats */}
        <div className="dash-left">
          <div className="session-panel">
            <p className="sp-heading">
              <i className="fa-solid fa-chart-simple" /> Session
            </p>
            <div className="sp-items">
              <div className="sp-item">
                <span className="sp-icon"><i className="fa-solid fa-stopwatch" /></span>
                <div className="sp-text">
                  <span className="sp-label">Uptime</span>
                  <UptimeClock start={sessionStart.current} />
                </div>
              </div>
              <div className="sp-item">
                <span className="sp-icon" style={{ color: '#b44fff' }}><i className="fa-solid fa-bolt" /></span>
                <div className="sp-text">
                  <span className="sp-label">Energy</span>
                  <span className="sp-val" style={{ color: '#b44fff' }}>
                    {sessionKwh.toFixed(4)} <em>kWh</em>
                  </span>
                </div>
              </div>
              <div className="sp-item">
                <span className="sp-icon" style={{ color: '#ff2d78' }}><i className="fa-solid fa-fire" /></span>
                <div className="sp-text">
                  <span className="sp-label">Peak</span>
                  <span className="sp-val" style={{ color: '#ff2d78' }}>
                    {sessionPeak.toFixed(0)} <em>W</em>
                  </span>
                </div>
              </div>
              <div className="sp-item">
                <span className="sp-icon" style={{ color: mockMode !== 'off' ? '#ffe600' : '#00f5ff' }}>
                  <i className="fa-solid fa-signal" />
                </span>
                <div className="sp-text">
                  <span className="sp-label">Source</span>
                  <span className="sp-val" style={{ color: mockMode !== 'off' ? '#ffe600' : '#00f5ff' }}>
                    {mockMode !== 'off' ? mockMode : 'Live API'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center col — hero power */}
        <div className="dash-center">
          <div className="hero-power-card">
            <span className="hpc-state-label">
              <span className="live-dot" style={{ background: sparkColor } as React.CSSProperties} />
              {loading ? 'Loading…' : stateVal.toUpperCase()}
            </span>
            <div className="hpc-value-area">
              {loading
                ? <div className="hpc-skeleton skeleton-box" />
                : <HeroPowerValue watts={readings?.power ?? 0} color={sparkColor} />
              }
            </div>
            {!loading && readings && (
              <div className="hpc-sub">
                <span>{readings.voltage.toFixed(1)} V</span>
                <span className="hpc-sub-sep">·</span>
                <span>{readings.current.toFixed(2)} A</span>
                <span className="hpc-sub-sep">·</span>
                <span>{readings.frequency.toFixed(1)} Hz</span>
                <span className="hpc-sub-sep">·</span>
                <span>PF {readings.power_factor.toFixed(2)}</span>
              </div>
            )}
            <MemoSparkline data={sparkData} color={sparkColor} />
          </div>
        </div>

        {/* Right col — reading cards */}
        <div className="dash-right">
          <ChromaGrid
            items={CARDS.map(card => ({
              key: card.key,
              label: card.label,
              value: loading ? null : (readings ? readings[card.key as keyof Readings] : null),
              unit: card.unit,
              icon: card.icon,
              accentColor: card.color,
              decimals: card.decimals,
              loading,
            } satisfies ReadingItem))}
          />
        </div>

      </div>

      {/* ── Event feed ── */}
      <MemoEventFeed events={events} />

      {/* ── Toast notifications ── */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

    </div>
  );
}

