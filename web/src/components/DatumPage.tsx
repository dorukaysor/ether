/**
 * DatumPage — Hidden advanced administration panel.
 *
 * Access: click the "ether." wordmark in the header 5 times in rapid succession.
 * Not linked in the main navigation.
 *
 * Sections:
 *  1. System Status    — DB counts, env vars, current data mode
 *  2. ESP32 Config     — IP, hostname, poll interval, log endpoint, OTA URL
 *  3. Data & Storage   — max records, retention period, CSV export, prune
 *  4. AI Configuration — Gemini model, context size, extra system context
 *  5. Live Config Table— read-only dump of the config table
 *  6. Danger Zone      — reset config, delete all history
 */
import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMicrochip,
  faDatabase,
  faBrain,
  faTriangleExclamation,
  faCheck,
  faXmark,
  faRotate,
  faDownload,
  faTrash,
  faShield,
  faServer,
  faArrowLeft,
  faChartBar,
} from '@fortawesome/free-solid-svg-icons';
import { getDataMode, type DataMode } from '../lib/mockData';

// ── Types ─────────────────────────────────────────────────────────────────────

type Settings  = Record<string, string>;
type EnvStatus = { TURSO_DATABASE_URL: boolean; TURSO_AUTH_TOKEN: boolean; GEMINI_API_KEY: boolean };
type DbStats   = { energyLogCount: number; configCount: number };

// ── Glass card ────────────────────────────────────────────────────────────────

function Card({
  title,
  icon,
  accentColor = '#f59e0b',
  className   = '',
  children,
}: {
  title:        string;
  icon:         Parameters<typeof FontAwesomeIcon>[0]['icon'];
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
        <FontAwesomeIcon icon={icon} style={{ color: accentColor, opacity: 0.7 }} className="w-3 h-3" />
        <span className="text-[11px] font-semibold text-white/50 uppercase tracking-widest">{title}</span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4">{children}</div>
    </div>
  );
}

// ── Table-like row ────────────────────────────────────────────────────────────

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
      <span className="text-xs text-white/50 shrink-0">{label}</span>
      {children}
    </div>
  );
}

// ── Env var badge ─────────────────────────────────────────────────────────────

function EnvBadge({ label, set }: { label: string; set: boolean }) {
  return (
    <Row label={label}>
      <span
        className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
        style={{
          background: set ? 'rgba(34,197,94,0.12)'  : 'rgba(239,68,68,0.12)',
          color:      set ? '#22c55e'                : '#ef4444',
          border:     `1px solid ${set ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
        }}
      >
        <FontAwesomeIcon icon={set ? faCheck : faXmark} className="w-2 h-2" />
        {set ? 'Set' : 'Missing'}
      </span>
    </Row>
  );
}

// ── Text input ────────────────────────────────────────────────────────────────

function TextInput({
  value,
  onChange,
  placeholder = '',
  mono        = false,
}: {
  value:        string;
  onChange:     (v: string) => void;
  placeholder?: string;
  mono?:        boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`max-w-[200px] w-full rounded-lg px-3 py-1 text-xs text-white/80 focus:outline-none placeholder-white/20 ${mono ? 'font-mono' : ''}`}
      style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }}
    />
  );
}

// ── Numeric stepper ───────────────────────────────────────────────────────────

function NumericStepper({
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
  const num = parseFloat(value) || 0;
  const dec = () => { const n = num - step; if (min === undefined || n >= min) onChange(String(n)); };
  const inc = () => { const n = num + step; if (max === undefined || n <= max) onChange(String(n)); };
  return (
    <div className="flex items-center rounded-lg border border-white/10 overflow-hidden bg-black/20">
      <button
        type="button"
        onClick={dec}
        disabled={min !== undefined && num <= min}
        className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/8 disabled:opacity-20 disabled:cursor-not-allowed transition-colors text-sm select-none"
      >−</button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="w-16 bg-transparent text-center text-xs font-semibold text-white tabular-nums focus:outline-none py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={inc}
        disabled={max !== undefined && num >= max}
        className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/8 disabled:opacity-20 disabled:cursor-not-allowed transition-colors text-sm select-none"
      >+</button>
    </div>
  );
}

// ── Confirmation button pair ──────────────────────────────────────────────────

function ConfirmPair({
  busy,
  onConfirm,
  onCancel,
  label,
}: {
  busy:      boolean;
  onConfirm: () => void;
  onCancel:  () => void;
  label:     string;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-red-400">{label}</span>
      <button
        onClick={onConfirm}
        disabled={busy}
        className="px-3 py-1 rounded-lg text-xs font-bold bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-40"
      >
        {busy ? '…' : 'Confirm'}
      </button>
      <button
        onClick={onCancel}
        className="px-3 py-1 rounded-lg text-xs text-white/40 border border-white/10 hover:bg-white/5 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}

// ── Gemini model list ─────────────────────────────────────────────────────────

const GEMINI_MODELS = [
  { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (exp)' },
  { value: 'gemini-2.0-flash',     label: 'Gemini 2.0 Flash'       },
  { value: 'gemini-1.5-pro',       label: 'Gemini 1.5 Pro'         },
  { value: 'gemini-1.5-flash',     label: 'Gemini 1.5 Flash'       },
];

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DatumPage() {
  const [settings,        setSettings]        = useState<Settings>({});
  const [envStatus,       setEnvStatus]       = useState<EnvStatus>({ TURSO_DATABASE_URL: false, TURSO_AUTH_TOKEN: false, GEMINI_API_KEY: false });
  const [dbStats,         setDbStats]         = useState<DbStats | null>(null);
  const [dataMode,        setDataModeUI]      = useState<DataMode>('live');
  const [loading,         setLoading]         = useState(true);
  const [saving,          setSaving]          = useState(false);
  const [savedOk,         setSavedOk]         = useState(false);
  const [saveError,       setSaveError]       = useState<string | null>(null);
  const [actionBusy,      setActionBusy]      = useState<string | null>(null);
  const [toast,           setToast]           = useState<{ msg: string; ok: boolean } | null>(null);
  const [confirmPurgeOld, setConfirmPurgeOld] = useState(false);
  const [confirmPurgeAll, setConfirmPurgeAll] = useState(false);
  const [confirmReset,    setConfirmReset]    = useState(false);

  const set = (key: string, v: string) =>
    setSettings((prev) => ({ ...prev, [key]: v }));

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Load ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    setDataModeUI(getDataMode());
    (async () => {
      try {
        const [sRes, stRes] = await Promise.all([
          fetch('/api/get-settings').then((r) => r.json()),
          fetch('/api/datum-actions', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ action: 'get_stats' }),
          }).then((r) => r.json()),
        ]);
        setSettings(sRes.settings ?? {});
        if (sRes.env) setEnvStatus(sRes.env);
        if (stRes.ok) setDbStats({ energyLogCount: stRes.energyLogCount, configCount: stRes.configCount });
      } catch { /* keep defaults */ }
      finally { setLoading(false); }
    })();
  }, []);

  const refreshStats = async () => {
    const r = await fetch('/api/datum-actions', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'get_stats' }),
    }).then((r) => r.json());
    if (r.ok) setDbStats({ energyLogCount: r.energyLogCount, configCount: r.configCount });
  };

  // ── Save settings ─────────────────────────────────────────────────────────

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

  // ── Run admin action ──────────────────────────────────────────────────────

  const runAction = async (action: string, params: Record<string, unknown> = {}) => {
    setActionBusy(action);
    try {
      const res  = await fetch('/api/datum-actions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action, params }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);
      showToast(data.message ?? 'Done');
      await refreshStats();
      if (action === 'reset_config') {
        const s = await fetch('/api/get-settings').then((r) => r.json());
        setSettings(s.settings ?? {});
      }
    } catch (e) {
      showToast(`Error: ${String(e)}`, false);
    } finally {
      setActionBusy(null);
      setConfirmPurgeOld(false);
      setConfirmPurgeAll(false);
      setConfirmReset(false);
    }
  };

  // ── CSV export ────────────────────────────────────────────────────────────

  const exportCsv = async () => {
    setActionBusy('export_csv');
    try {
      const res  = await fetch('/api/datum-actions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'export_all' }),
      });
      const data = await res.json();
      if (!data.ok || !data.rows) throw new Error('Export failed');
      const cols    = ['id', 'voltage', 'current', 'watts', 'energy', 'frequency', 'pf', 'relay_state', 'emotive_state', 'created_at'];
      const csvRows = [
        cols.join(','),
        ...data.rows.map((r: Record<string, unknown>) => cols.map((c) => String(r[c] ?? '')).join(',')),
      ];
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `ether_log_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Exported ${data.rows.length} records`);
    } catch (e) {
      showToast(`Export failed: ${String(e)}`, false);
    } finally {
      setActionBusy(null);
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
        <span className="text-white/30 text-sm">Loading datum…</span>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="w-full h-full flex flex-col px-5 pt-3 pb-4 gap-2">

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = '/')}
            className="flex items-center gap-1.5 text-white/25 hover:text-white/60 text-xs transition-colors"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="w-3 h-3" />
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white leading-none">
              datum<span style={{ color: '#f59e0b' }}>.</span>
            </h1>
            <p className="text-white/30 text-xs mt-0.5">Advanced system administration · restricted access</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {saveError && (
            <p className="text-red-400 text-xs max-w-xs truncate">{saveError}</p>
          )}
          {savedOk && (
            <p className="flex items-center gap-1.5 text-amber-400 text-xs">
              <FontAwesomeIcon icon={faCheck} className="w-2.5 h-2.5" />
              Saved
            </p>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', color: '#f59e0b' }}
          >
            {saving
              ? <><FontAwesomeIcon icon={faRotate} className="animate-spin w-3 h-3" /> Saving…</>
              : 'Save'}
          </button>
        </div>
      </div>

      {/* ── Access banner ──────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center gap-2.5 px-4 py-2 rounded-xl border text-xs"
        style={{ background: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.2)', color: 'rgba(245,158,11,0.7)' }}
      >
        <FontAwesomeIcon icon={faShield} className="w-3 h-3 shrink-0" />
        <span className="font-semibold tracking-wider uppercase">Admin Access</span>
        <span className="text-white/20 mx-1">·</span>
        <span>Changes here directly affect system behaviour. Handle with care.</span>
        <span className="ml-auto font-mono text-[10px] text-white/20">/datum</span>
      </div>

      {/* ── Card grid ──────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 md:grid-rows-3 xl:grid-rows-2 gap-3">

        {/* ── 1. System Status ───────────────────────────────────────── */}
        <Card title="System Status" icon={faChartBar} accentColor="#22c55e">
          <Row label="Data mode">
            <span
              className="text-xs font-mono font-bold px-2 py-0.5 rounded-full"
              style={{
                color:      dataMode === 'live' ? '#22c55e' : '#f59e0b',
                background: dataMode === 'live' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
              }}
            >
              {dataMode.toUpperCase()}
            </span>
          </Row>
          {dbStats && (
            <>
              <Row label="Energy log records">
                <span className="text-xs font-mono text-white/70">{dbStats.energyLogCount.toLocaleString()}</span>
              </Row>
              <Row label="Config entries">
                <span className="text-xs font-mono text-white/70">{dbStats.configCount}</span>
              </Row>
            </>
          )}
          <p className="text-[10px] uppercase tracking-widest text-white/20 mt-3 mb-1">Environment Variables</p>
          <EnvBadge label="Turso URL" set={envStatus.TURSO_DATABASE_URL} />
          <EnvBadge label="Turso Token"   set={envStatus.TURSO_AUTH_TOKEN}   />
          <EnvBadge label="Gemini API Key"     set={envStatus.GEMINI_API_KEY}     />
        </Card>

        {/* ── 2. ESP32 Configuration ──────────────────────────────────── */}
        <Card title="ESP32 Configuration" icon={faMicrochip} accentColor="#f59e0b">
          <Row label="Device IP">
            <TextInput
              value={settings.esp32_ip ?? ''}
              onChange={(v) => set('esp32_ip', v)}
              placeholder="192.168.1.xxx"
              mono
            />
          </Row>
          <Row label="Hostname">
            <TextInput
              value={settings.esp32_hostname ?? ''}
              onChange={(v) => set('esp32_hostname', v)}
              placeholder="ether-unit"
            />
          </Row>
          <Row label="Poll interval (ms)">
            <NumericStepper
              value={settings.polling_interval_ms ?? '3000'}
              onChange={(v) => set('polling_interval_ms', v)}
              min={500}
              max={60000}
              step={500}
            />
          </Row>
          <Row label="Log endpoint">
            <TextInput
              value={settings.log_endpoint_override ?? ''}
              onChange={(v) => set('log_endpoint_override', v)}
              placeholder="/api/log-energy"
              mono
            />
          </Row>
          <div className="mt-3 pt-3 border-t border-white/5">
            <p className="text-[10px] uppercase tracking-widest text-white/20 mb-2">Over-the-Air Update</p>
            <Row label="OTA URL">
              <TextInput
                value={settings.esp32_ota_url ?? ''}
                onChange={(v) => set('esp32_ota_url', v)}
                placeholder="http://…"
                mono
              />
            </Row>
          </div>
        </Card>

        {/* ── 3. Data & Storage ──────────────────────────────────────── */}
        <Card title="Data & Storage" icon={faDatabase} accentColor="#06b6d4">
          <Row label="Max log records">
            <NumericStepper
              value={settings.db_max_records ?? '5000'}
              onChange={(v) => set('db_max_records', v)}
              min={100}
              max={50000}
              step={500}
            />
          </Row>
          <Row label="Retention (days)">
            <NumericStepper
              value={settings.prune_days ?? '90'}
              onChange={(v) => set('prune_days', v)}
              min={7}
              max={365}
              step={7}
            />
          </Row>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={exportCsv}
              disabled={!!actionBusy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
              style={{ background: 'rgba(6,182,212,0.10)', border: '1px solid rgba(6,182,212,0.3)', color: '#06b6d4' }}
            >
              <FontAwesomeIcon icon={actionBusy === 'export_csv' ? faRotate : faDownload} className={`w-3 h-3 ${actionBusy === 'export_csv' ? 'animate-spin' : ''}`} />
              Export CSV
            </button>
            {!confirmPurgeOld ? (
              <button
                onClick={() => setConfirmPurgeOld(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
              >
                <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                Prune Old Records
              </button>
            ) : (
              <ConfirmPair
                label={`Purge records older than ${settings.prune_days ?? 90}d?`}
                busy={actionBusy === 'purge_history'}
                onConfirm={() => runAction('purge_history', { olderThanDays: Number(settings.prune_days ?? 90) })}
                onCancel={() => setConfirmPurgeOld(false)}
              />
            )}
          </div>
        </Card>

        {/* ── 4. AI Configuration ────────────────────────────────────── */}
        <Card title="AI Configuration" icon={faBrain} accentColor="#a855f7">
          <Row label="Gemini model">
            <select
              value={settings.gemini_model ?? 'gemini-2.0-flash-exp'}
              onChange={(e) => set('gemini_model', e.target.value)}
              className="bg-black/30 border border-white/10 rounded-lg px-3 py-1 text-xs text-white/80 focus:outline-none focus:border-purple-500/30 max-w-[200px]"
              style={{ colorScheme: 'dark' }}
            >
              {GEMINI_MODELS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </Row>
          <Row label="Context size (rows)">
            <NumericStepper
              value={settings.insight_context_size ?? '50'}
              onChange={(v) => set('insight_context_size', v)}
              min={10}
              max={200}
              step={10}
            />
          </Row>
          <div className="mt-3 pt-3 border-t border-white/5">
            <p className="text-[10px] uppercase tracking-widest text-white/20 mb-2">Extra System Context</p>
            <textarea
              value={settings.gemini_extra_context ?? ''}
              onChange={(e) => set('gemini_extra_context', e.target.value)}
              placeholder="Additional context included in every Gemini insight request…"
              rows={4}
              className="w-full rounded-lg px-3 py-2 text-xs text-white/70 placeholder-white/20 focus:outline-none resize-none"
              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }}
            />
          </div>
        </Card>

        {/* ── 5. Live Config Table ────────────────────────────────────── */}
        <Card title="Live Config Table" icon={faServer} accentColor="#64748b">
          <div className="max-h-60 overflow-y-auto">
            {Object.entries(settings).length === 0 ? (
              <p className="text-xs text-white/20">No config entries.</p>
            ) : (
              Object.entries(settings)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between gap-2 py-1.5 border-b border-white/5 last:border-0"
                  >
                    <span className="text-[11px] font-mono text-white/35 truncate">{k}</span>
                    <span className="text-[11px] font-mono text-white/60 text-right max-w-[140px] truncate shrink-0">
                      {v || '—'}
                    </span>
                  </div>
                ))
            )}
          </div>
        </Card>

        {/* ── 6. Danger Zone ─────────────────────────────────────────── */}
        <Card title="Danger Zone" icon={faTriangleExclamation} accentColor="#ef4444">
          <p className="text-xs text-white/30 mb-4">Irreversible operations — these cannot be undone.</p>

          {/* Reset all config */}
          <div
            className="mb-3 p-3 rounded-lg"
            style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)' }}
          >
            <p className="text-xs text-white/60 font-medium mb-0.5">Reset All Configuration</p>
            <p className="text-[11px] text-white/30 mb-3">Deletes all config table entries and reverts to defaults.</p>
            {!confirmReset ? (
              <button
                onClick={() => setConfirmReset(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
              >
                <FontAwesomeIcon icon={faRotate} className="w-3 h-3" />
                Reset Config
              </button>
            ) : (
              <ConfirmPair
                label="Reset all config?"
                busy={actionBusy === 'reset_config'}
                onConfirm={() => runAction('reset_config')}
                onCancel={() => setConfirmReset(false)}
              />
            )}
          </div>

          {/* Purge all history */}
          <div
            className="p-3 rounded-lg"
            style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)' }}
          >
            <p className="text-xs text-white/60 font-medium mb-0.5">Delete All History</p>
            <p className="text-[11px] text-white/30 mb-3">Permanently deletes every row in the energy_log table.</p>
            {!confirmPurgeAll ? (
              <button
                onClick={() => setConfirmPurgeAll(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
              >
                <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                Delete All Records
              </button>
            ) : (
              <ConfirmPair
                label="Delete all energy history?"
                busy={actionBusy === 'purge_history'}
                onConfirm={() => runAction('purge_history')}
                onCancel={() => setConfirmPurgeAll(false)}
              />
            )}
          </div>
        </Card>

      </div>

      {/* ── Floating toast ─────────────────────────────────────────────── */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl text-xs font-medium pointer-events-none whitespace-nowrap"
          style={{
            background:     toast.ok ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.2)',
            border:         `1px solid ${toast.ok ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.4)'}`,
            color:          toast.ok ? '#f59e0b' : '#ef4444',
            backdropFilter: 'blur(8px)',
          }}
        >
          {toast.msg}
        </div>
      )}

    </div>
  );
}
