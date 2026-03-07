/**
 * SettingsPage — compact HUD layout.
 *
 * Fits entirely in the viewport on desktop without any scrolling.
 * 3-column grid:
 *   Col 1 — Data Mode   (Live / Mock toggle + 6 sub-modes)
 *   Col 2 — Emotive Thresholds (2 × 3 compact grid of steppers)
 *   Col 3 — Dashboard Controls + Relay Control + Environment (stacked)
 *
 * Mobile: single-column, vertically scrollable (parent Layout allows it).
 */
import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faWifi,
  faVial,
  faToggleOn,
  faToggleOff,
  faServer,
  faCheck,
  faXmark,
  faRotate,
} from '@fortawesome/free-solid-svg-icons';
import {
  getDataMode,
  setDataMode,
  type DataMode,
} from '../lib/mockData';

// ── Types ─────────────────────────────────────────────────────────────────────

type Settings = Record<string, string>;

// ── Compact glass card ────────────────────────────────────────────────────────

function Card({
  title,
  accentColor = '#06b6d4',
  className   = '',
  children,
}: {
  title:        string;
  accentColor?: string;
  className?:   string;
  children:     React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col rounded-xl border overflow-hidden ${className}`}
      style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      <div
        className="px-4 py-2.5 flex items-center gap-2.5 shrink-0 border-b"
        style={{ borderBottomColor: `${accentColor}22` }}
      >
        <div className="w-1 h-3.5 rounded-full shrink-0" style={{ background: accentColor, opacity: 0.75 }} />
        <span className="text-[11px] font-semibold text-white/50 uppercase tracking-widest">{title}</span>
      </div>
      <div className="flex-1 min-h-0 p-4">{children}</div>
    </div>
  );
}
// ── Inline stepper ────────────────────────────────────────────────────────────

function NumericInput({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value:    string;
  onChange: (v: string) => void;
  min?:     number;
  max?:     number;
  step?:    number;
}) {
  const num  = parseFloat(value) || 0;
  const dec  = () => { const n = num - step; if (min === undefined || n >= min) onChange(String(n)); };
  const inc  = () => { const n = num + step; if (max === undefined || n <= max) onChange(String(n)); };
  const atMin = min !== undefined && num <= min;
  const atMax = max !== undefined && num >= max;

  return (
    <div className="flex items-center rounded-lg border border-white/10 overflow-hidden bg-black/20">
      <button type="button" onClick={dec} disabled={atMin} className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/8 disabled:opacity-20 disabled:cursor-not-allowed transition-colors text-sm select-none">−</button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="w-14 bg-transparent text-center text-xs font-semibold text-white tabular-nums focus:outline-none py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button type="button" onClick={inc} disabled={atMax} className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/8 disabled:opacity-20 disabled:cursor-not-allowed transition-colors text-sm select-none">+</button>
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  accentColor = '#06b6d4',
}: {
  checked:      boolean;
  onChange:     (v: boolean) => void;
  accentColor?: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center transition-colors duration-150"
      style={{ color: checked ? accentColor : 'rgba(255,255,255,0.2)' }}
    >
      <FontAwesomeIcon icon={checked ? faToggleOn : faToggleOff} className="w-6 h-6" />
    </button>
  );
}

// ── Env badge ─────────────────────────────────────────────────────────────────

function EnvBadge({ label, set }: { label: string; set: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-xs text-white/40 font-mono truncate mr-2">{label}</span>
      <span
        className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
        style={{
          background:  set ? 'rgba(6,182,212,0.12)' : 'rgba(239,68,68,0.12)',
          color:       set ? '#06b6d4' : '#ef4444',
          border:      `1px solid ${set ? 'rgba(6,182,212,0.3)' : 'rgba(239,68,68,0.3)'}`,
        }}
      >
        <FontAwesomeIcon icon={set ? faCheck : faXmark} className="w-2 h-2" />
        {set ? 'Set' : 'Missing'}
      </span>
    </div>
  );
}

// ── Mode + threshold config ───────────────────────────────────────────────────

const MOCK_SUBMODES: { key: DataMode; label: string; color: string }[] = [
  { key: 'mock:auto',       label: 'Auto',       color: '#f59e0b' },
  { key: 'mock:idle',       label: 'Idle',       color: '#06b6d4' },
  { key: 'mock:happy',      label: 'Happy',      color: '#ec4899' },
  { key: 'mock:dizzy',      label: 'Dizzy',      color: '#eab308' },
  { key: 'mock:frustrated', label: 'Frustrated', color: '#a855f7' },
  { key: 'mock:angry',      label: 'Angry',      color: '#ef4444' },
];

const THRESHOLDS: { key: string; label: string; unit: string; def: string; step: number }[] = [
  { key: 'threshold_idle_max',       label: 'Idle max',     unit: 'W',   def: '300',  step: 10  },
  { key: 'threshold_happy_drop',     label: 'Happy drop',   unit: 'W',   def: '50',   step: 10  },
  { key: 'threshold_dizzy_spike',    label: 'Dizzy spike',  unit: 'W',   def: '100',  step: 10  },
  { key: 'threshold_frustrated_w',   label: 'Frustrated',   unit: 'W',   def: '1000', step: 50  },
  { key: 'threshold_frustrated_min', label: 'Frust. dur.',  unit: 'min', def: '15',   step: 1   },
  { key: 'threshold_angry_w',        label: 'Angry cutoff', unit: 'W',   def: '2500', step: 50  },
];

// ── Main component ────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [settings,       setSettings]       = useState<Settings>({});
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [savedOk,        setSavedOk]        = useState(false);
  const [saveError,      setSaveError]      = useState<string | null>(null);
  const [relayBusy,      setRelayBusy]      = useState(false);
  const [dataMode,       setDataModeState]  = useState<DataMode>('live');
  const [envStatus,      setEnvStatus]      = useState({
    TURSO_DATABASE_URL: false,
    TURSO_AUTH_TOKEN:   false,
    GEMINI_API_KEY:     false,
  });

  useEffect(() => {
    setDataModeState(getDataMode());
    (async () => {
      try {
        const res  = await fetch('/api/get-settings');
        const json = await res.json();
        setSettings(json.settings ?? {});
        if (json.env) setEnvStatus(json.env);
        if (json.settings?.data_mode) {
          const dbMode = json.settings.data_mode as DataMode;
          setDataMode(dbMode);
          setDataModeState(dbMode);
        }
      } catch { /* keep defaults */ }
      finally { setLoading(false); }
    })();
  }, []);

  const set = (key: string, value: string) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const switchMode = (mode: DataMode) => {
    setDataModeState(mode);
    setDataMode(mode);
    set('data_mode', mode);
  };

  const save = async () => {
    setSaving(true);
    setSavedOk(false);
    setSaveError(null);
    try {
      const res  = await fetch('/api/save-settings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ settings }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? `HTTP ${res.status}`);
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 3000);
    } catch (e) {
      setSaveError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const toggleRelay = async (on: boolean) => {
    setRelayBusy(true);
    set('relay', on ? '1' : '0');
    try {
      await fetch('/api/relay-control', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ relay: on }),
      });
    } catch { /* ignore */ }
    finally { setRelayBusy(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
        <span className="text-white/30 text-sm">Loading settings…</span>
      </div>
    );
  }

  const isMock = dataMode !== 'live';

  return (
    <div className="w-full h-full flex flex-col px-5 pt-3 pb-4 gap-3">

      {/* ── Header row ─────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white leading-none">Settings</h1>
          <p className="text-white/30 text-xs mt-0.5">Dashboard controls &amp; ESP32 configuration</p>
        </div>
        <div className="flex items-center gap-3">
          {saveError && <p className="text-red-400 text-xs max-w-xs truncate">{saveError}</p>}
          {savedOk && !saveError && (
            <p className="flex items-center gap-1.5 text-cyan-400 text-xs">
              <FontAwesomeIcon icon={faCheck} className="w-2.5 h-2.5" />
              Saved
            </p>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.35)', color: '#06b6d4' }}
          >
            {saving
              ? <><FontAwesomeIcon icon={faRotate} className="animate-spin w-3 h-3" /> Saving…</>
              : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* ── 3-column HUD grid ──────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-3">

        {/* ── Col 1: Data Mode ──────────────────────────────────────────── */}
        <Card title="Data Mode" accentColor="#06b6d4">
          <div className="flex flex-col gap-2.5">

            {/* LIVE */}
            <button
              onClick={() => switchMode('live')}
              className="flex items-center gap-3 w-full px-3.5 py-3 rounded-xl border transition-all duration-200 text-left"
              style={
                dataMode === 'live'
                  ? { background: 'rgba(34,197,94,0.12)',   borderColor: 'rgba(34,197,94,0.45)',   color: '#22c55e' }
                  : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)' }
              }
            >
              <FontAwesomeIcon icon={faWifi} className="w-4 h-4 shrink-0" />
              <div>
                <p className="text-sm font-bold leading-tight">Live</p>
                <p className="text-[10px] opacity-60 mt-0.5">Real ESP32 sensor data</p>
              </div>
            </button>

            {/* MOCK */}
            <button
              onClick={() => !isMock && switchMode('mock:auto')}
              className="flex items-center gap-3 w-full px-3.5 py-3 rounded-xl border transition-all duration-200 text-left"
              style={
                isMock
                  ? { background: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.45)', color: '#f59e0b' }
                  : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)' }
              }
            >
              <FontAwesomeIcon icon={faVial} className="w-4 h-4 shrink-0" />
              <div>
                <p className="text-sm font-bold leading-tight">Mock</p>
                <p className="text-[10px] opacity-60 mt-0.5">Scripted synthetic data</p>
              </div>
            </button>

            {/* Sub-modes */}
            <div>
              <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2">Sub-mode</p>
              <div className="grid grid-cols-2 gap-1.5">
                {MOCK_SUBMODES.map((sm) => {
                  const active = dataMode === sm.key;
                  return (
                    <button
                      key={sm.key}
                      onClick={() => switchMode(sm.key)}
                      className="px-2 py-2 rounded-lg border text-xs font-semibold transition-all duration-150 text-center"
                      style={
                        active
                          ? { background: `${sm.color}18`, borderColor: `${sm.color}55`, color: sm.color }
                          : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.22)' }
                      }
                    >
                      {sm.label}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </Card>

        {/* ── Col 2: Emotive Thresholds ─────────────────────────────────── */}
        <Card title="Emotive Thresholds" accentColor="#a855f7">
          <div className="grid grid-cols-2 gap-x-5 gap-y-4">
            {THRESHOLDS.map((t) => (
              <div key={t.key} className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold text-white/35 uppercase tracking-widest">
                  {t.label}
                </span>
                <div className="flex items-center gap-1.5">
                  <NumericInput
                    value={settings[t.key] ?? t.def}
                    onChange={(v) => set(t.key, v)}
                    min={0}
                    step={t.step}
                  />
                  <span className="text-white/25 text-[10px]">{t.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Col 3: Dashboard + Relay + Environment (stacked) ─────────── */}
        <div className="flex flex-col gap-3 min-h-0">

          <Card title="Dashboard" accentColor="#06b6d4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-white/60">Poll interval</p>
                  <p className="text-[10px] text-white/25">Live fetch frequency</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <NumericInput
                    value={settings.polling_interval_ms ?? '3000'}
                    onChange={(v) => set('polling_interval_ms', v)}
                    min={500}
                    max={30000}
                    step={500}
                  />
                  <span className="text-white/25 text-[10px]">ms</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5">
                <div>
                  <p className="text-xs text-white/60">Auto-analyze</p>
                  <p className="text-[10px] text-white/25">Hourly Gemini insight</p>
                </div>
                <Toggle
                  checked={settings.auto_analyze === 'true'}
                  onChange={(v) => set('auto_analyze', String(v))}
                />
              </div>
            </div>
          </Card>

          <Card title="Relay Control" accentColor="#ec4899">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/60">Manual override</p>
                {relayBusy
                  ? <div className="w-4 h-4 rounded-full border-2 border-pink-400/30 border-t-pink-400 animate-spin" />
                  : <Toggle checked={settings.relay === '1'} onChange={toggleRelay} accentColor="#ec4899" />
                }
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <p className="text-xs text-white/40">Persisted state</p>
                <span
                  className="text-xs font-bold"
                  style={{ color: settings.relay === '1' ? '#06b6d4' : '#ef4444' }}
                >
                  {settings.relay === '1' ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>
          </Card>

          <Card title="Environment" accentColor="#eab308" className="flex-1">
            <EnvBadge label="Turso URL" set={envStatus.TURSO_DATABASE_URL} />
            <EnvBadge label="Turso Token"   set={envStatus.TURSO_AUTH_TOKEN}   />
            <EnvBadge label="Gemini API Key"     set={envStatus.GEMINI_API_KEY}     />
            <p className="text-white/15 text-[10px] mt-3 leading-relaxed">
              Set in <code className="font-mono">/web/.env</code>. Restart dev server after changes.
            </p>
          </Card>

        </div>
      </div>
    </div>
  );
}
