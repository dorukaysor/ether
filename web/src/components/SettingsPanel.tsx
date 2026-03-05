import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import { type MockMode } from './LiveDashboard';

const MOCK_MODES: { id: MockMode; label: string; color: string; desc: string }[] = [
  { id: 'off',        label: 'Live',       color: '#6b6b8a', desc: 'Fetch real data from the API' },
  { id: 'auto',       label: 'Auto',       color: '#00ff88', desc: 'Simulates real-life fluctuations' },
  { id: 'idle',       label: 'Idle',       color: '#00f5ff', desc: '120–200 W · normal operation' },
  { id: 'happy',      label: 'Happy',      color: '#ff2d78', desc: '20–35 W · power drop detected' },
  { id: 'dizzy',      label: 'Dizzy',      color: '#ffe600', desc: '50–1450 W · spike / fluctuation' },
  { id: 'frustrated', label: 'Frustrated', color: '#b44fff', desc: '1050–1250 W · sustained high load' },
  { id: 'angry',      label: 'Angry',      color: '#ff2020', desc: '2600–2900 W · relay cutoff zone' },
];

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="settings-section-title">
      <i className={`fa-solid ${icon}`} />
      {title}
    </div>
  );
}

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc?: string;
}
function Toggle({ checked, onChange, label, desc }: ToggleProps) {
  return (
    <label className="settings-toggle">
      <div className="toggle-text">
        <span className="toggle-label">{label}</span>
        {desc && <span className="toggle-desc">{desc}</span>}
      </div>
      <div
        className={`toggle-switch ${checked ? 'on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <div className="toggle-thumb" />
      </div>
    </label>
  );
}

interface NumberFieldProps {
  label: string; desc?: string; value: number;
  onChange: (v: number) => void; unit?: string; min?: number; max?: number; step?: number;
}
function NumberField({ label, desc, value, onChange, unit, min, max, step = 1 }: NumberFieldProps) {
  const dec = (n: number) => {
    const next = value - n;
    if (min !== undefined && next < min) return;
    onChange(next);
  };
  const inc = (n: number) => {
    const next = value + n;
    if (max !== undefined && next > max) return;
    onChange(next);
  };
  return (
    <div className="settings-field">
      <div className="field-text">
        <span className="field-label">{label}</span>
        {desc && <span className="field-desc">{desc}</span>}
      </div>
      <div className="field-stepper">
        <button className="stepper-btn" onClick={() => dec(step)} aria-label="Decrease">−</button>
        <span className="stepper-val">
          {value}
          {unit && <span className="stepper-unit">{unit}</span>}
        </span>
        <button className="stepper-btn" onClick={() => inc(step)} aria-label="Increase">+</button>
      </div>
    </div>
  );
}

export default function SettingsPanel() {
  // ── Mock mode ────────────────────────────────────────────────────────────────
  const [mockMode, setMockMode] = useState<MockMode>(() => {
    try { return (localStorage.getItem('ether:mockMode') as MockMode) ?? 'off'; }
    catch { return 'off'; }
  });

  function applyMockMode(mode: MockMode) {
    setMockMode(mode);
    try { localStorage.setItem('ether:mockMode', mode); } catch {}
    // Notify LiveDashboard on same page or via storage event for other tabs
    window.dispatchEvent(new CustomEvent('ether:mockMode', { detail: mode }));
  }

  // ── Thresholds ───────────────────────────────────────────────────────────────
  const [warnThresh,     setWarnThresh]     = useState(1000);
  const [critThresh,     setCritThresh]     = useState(2500);
  const [frustMinutes,   setFrustMinutes]   = useState(15);

  // ── Notifications ────────────────────────────────────────────────────────────
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [alertOnAngry,    setAlertOnAngry]    = useState(true);
  const [alertOnFrust,    setAlertOnFrust]    = useState(true);
  const [alertOnRelay,    setAlertOnRelay]    = useState(true);

  // ── Dashboard ────────────────────────────────────────────────────────────────
  const [refreshRate,    setRefreshRate]    = useState(3);
  const [compactCards,   setCompactCards]   = useState(false);

  // ── ESP32 device status ──────────────────────────────────────────────────────
  type OnlineStatus = 'checking' | 'online' | 'offline';
  const [onlineStatus,   setOnlineStatus]   = useState<OnlineStatus>('checking');
  const [lastSeenTs,     setLastSeenTs]     = useState<string | null>(null);
  const [relayState,     setRelayState]     = useState<boolean>(true);
  const [relaySending,   setRelaySending]   = useState(false);

  // ── ESP32 device config ──────────────────────────────────────────────────────
  const [samplingHz,     setSamplingHz]     = useState(2);
  const [postHz,         setPostHz]         = useState(3);
  const [ledBrightness,  setLedBrightness]  = useState(180);
  const [oledTimeout,    setOledTimeout]    = useState(5);
  const [cfgPushed,      setCfgPushed]      = useState(false);
  const [cfgPushing,     setCfgPushing]     = useState(false);

  // ── Poll device status ────────────────────────────────────────────────────────
  const checkOnline = useCallback(async () => {
    try {
      const res  = await fetch('/api/readings');
      if (!res.ok) { setOnlineStatus('offline'); return; }
      const data = await res.json() as { timestamp?: string; relay?: boolean };
      const ts   = data.timestamp ? new Date(data.timestamp) : null;
      if (ts && (Date.now() - ts.getTime()) < 30_000) {
        setOnlineStatus('online');
        setRelayState(data.relay ?? true);
      } else {
        setOnlineStatus('offline');
      }
      if (data.timestamp) setLastSeenTs(data.timestamp);
    } catch {
      setOnlineStatus('offline');
    }
  }, []);

  useEffect(() => {
    checkOnline();
    const id = setInterval(checkOnline, 10_000);
    return () => clearInterval(id);
  }, [checkOnline]);

  async function sendRelay(state: boolean) {
    setRelaySending(true);
    try {
      await fetch('/api/relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state }),
      });
      setRelayState(state);
    } finally {
      setRelaySending(false);
    }
  }

  async function pushDeviceConfig() {
    setCfgPushing(true);
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          samplingIntervalSec: samplingHz,
          postIntervalSec:     postHz,
          ledBrightness,
          oledTimeout,
          warnThreshW:   warnThresh,
          critThreshW:   critThresh,
          frustMinutes,
        }),
      });
      setCfgPushed(true);
      setTimeout(() => setCfgPushed(false), 2500);
    } finally {
      setCfgPushing(false);
    }
  }

  // Load ESP32 config from server on mount
  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then((d: { config?: {
      samplingIntervalSec?: number; postIntervalSec?: number;
      ledBrightness?: number; oledTimeout?: number;
    } }) => {
      const c = d.config;
      if (!c) return;
      if (c.samplingIntervalSec) setSamplingHz(c.samplingIntervalSec);
      if (c.postIntervalSec)     setPostHz(c.postIntervalSec);
      if (c.ledBrightness)       setLedBrightness(c.ledBrightness);
      if (c.oledTimeout)         setOledTimeout(c.oledTimeout);
    }).catch(() => {});
  }, []);

  const [saved, setSaved] = useState(false);

  function saveSettings() {
    try {
      localStorage.setItem('ether:settings', JSON.stringify({
        warnThresh, critThresh, frustMinutes,
        telegramEnabled, alertOnAngry, alertOnFrust, alertOnRelay,
        refreshRate, compactCards,
      }));
    } catch {}
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem('ether:settings');
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.warnThresh)     setWarnThresh(s.warnThresh);
      if (s.critThresh)     setCritThresh(s.critThresh);
      if (s.frustMinutes)   setFrustMinutes(s.frustMinutes);
      if (s.telegramEnabled !== undefined) setTelegramEnabled(s.telegramEnabled);
      if (s.alertOnAngry    !== undefined) setAlertOnAngry(s.alertOnAngry);
      if (s.alertOnFrust    !== undefined) setAlertOnFrust(s.alertOnFrust);
      if (s.alertOnRelay    !== undefined) setAlertOnRelay(s.alertOnRelay);
      if (s.refreshRate)    setRefreshRate(s.refreshRate);
      if (s.compactCards    !== undefined) setCompactCards(s.compactCards);
    } catch {}
  }, []);

  return (
    <div className="settings-root">

      {/* ── Mock / Demo Mode ─────────────────────────────────────────────────── */}
      <div className="settings-card">
        <SectionTitle icon="fa-flask" title="Demo / Mock Mode" />
        <p className="settings-desc">
          Simulate different emotive states without live hardware. The home dashboard
          updates in real-time when you switch modes.
        </p>
        <div className="mock-mode-grid">
          {MOCK_MODES.map(m => (
            <button
              key={m.id}
              className={`mock-mode-card ${mockMode === m.id ? 'active' : ''}`}
              style={{ '--btn-color': m.color } as React.CSSProperties}
              onClick={() => applyMockMode(m.id)}
            >
              <span className="mmc-dot" style={{ background: m.color, boxShadow: `0 0 6px ${m.color}` }} />
              <div className="mmc-text">
                <span className="mmc-label">{m.label}</span>
                <span className="mmc-desc">{m.desc}</span>
              </div>
              {mockMode === m.id && <i className="fa-solid fa-check mmc-check" style={{ color: m.color }} />}
            </button>
          ))}
        </div>
      </div>

      {/* ── Thresholds ───────────────────────────────────────────────────────── */}
      <div className="settings-card">
        <SectionTitle icon="fa-sliders" title="Power Thresholds" />
        <p className="settings-desc">Define when ETHER changes emotive state and triggers alerts.</p>
        <div className="settings-fields">
          <NumberField
            label="Warning threshold" desc="Enters Frustrated state above this" unit="W"
            value={warnThresh} onChange={setWarnThresh} min={100} max={2499}
          />
          <NumberField
            label="Critical threshold" desc="Enters Angry state + relay cutoff" unit="W"
            value={critThresh} onChange={setCritThresh} min={500} max={9999}
          />
          <NumberField
            label="Frustration window" desc="Minutes above warning before state triggers" unit="min"
            value={frustMinutes} onChange={setFrustMinutes} min={1} max={60}
          />
        </div>
      </div>

      {/* ── Notifications ────────────────────────────────────────────────────── */}
      <div className="settings-card">
        <SectionTitle icon="fa-bell" title="Telegram Notifications" />
        <p className="settings-desc">
          Telegram bot token and chat ID are configured via the <code>.env</code> file on the server.
        </p>
        <div className="settings-toggles">
          <Toggle checked={telegramEnabled} onChange={setTelegramEnabled}
            label="Enable Telegram alerts" desc="Requires TELEGRAM_BOT_TOKEN in .env" />
          <Toggle checked={alertOnAngry} onChange={setAlertOnAngry}
            label="Alert on Angry state" desc="Fires when power exceeds critical threshold" />
          <Toggle checked={alertOnFrust} onChange={setAlertOnFrust}
            label="Alert on Frustrated state" desc="Fires after sustained high load" />
          <Toggle checked={alertOnRelay} onChange={setAlertOnRelay}
            label="Alert on relay change" desc="Notify when relay is turned on or off" />
        </div>
      </div>

      {/* ── Dashboard ────────────────────────────────────────────────────────── */}
      <div className="settings-card">
        <SectionTitle icon="fa-gauge" title="Dashboard" />
        <div className="settings-fields">
          <NumberField
            label="Refresh rate" desc="How often the dashboard polls for new data" unit="sec"
            value={refreshRate} onChange={setRefreshRate} min={1} max={60}
          />
        </div>
        <div className="settings-toggles" style={{ marginTop: '0.75rem' }}>
          <Toggle checked={compactCards} onChange={setCompactCards}
            label="Compact reading cards" desc="Reduce card size on the home dashboard" />
        </div>
      </div>

      {/* ── ESP32 Device Control ─────────────────────────────────────────────── */}
      <div className="settings-card">
        <SectionTitle icon="fa-microchip" title="ESP32 Device Control" />
        <p className="settings-desc">
          Direct realtime control of the physical ETHER hardware. Commands are queued
          in the database and executed by the Avatar unit within its next polling cycle.
        </p>

        {/* Online status */}
        <div className="esp-status-row">
          <div className={`esp-status-badge ${onlineStatus}`}>
            <span className="esp-status-dot" />
            {onlineStatus === 'checking' && 'Checking…'}
            {onlineStatus === 'online'   && 'Online'}
            {onlineStatus === 'offline'  && 'Offline / No data'}
          </div>
          {lastSeenTs && (
            <span className="esp-last-seen">
              <i className="fa-regular fa-clock" />
              Last seen {new Date(lastSeenTs).toLocaleTimeString()}
            </span>
          )}
          <button className="esp-refresh-btn" onClick={checkOnline}>
            <i className="fa-solid fa-rotate" />
          </button>
        </div>

        {/* Relay control */}
        <div className="esp-relay-row">
          <div className="field-text">
            <span className="field-label"><i className="fa-solid fa-plug" /> Relay</span>
            <span className="field-desc">Instantly cut or restore power to the monitored outlet</span>
          </div>
          <div className="esp-relay-btns">
            <button
              className={`relay-btn on ${relayState ? 'active' : ''}`}
              disabled={relaySending}
              onClick={() => sendRelay(true)}
            >
              <i className="fa-solid fa-plug-circle-check" /> ON
            </button>
            <button
              className={`relay-btn off ${!relayState ? 'active' : ''}`}
              disabled={relaySending}
              onClick={() => sendRelay(false)}
            >
              <i className="fa-solid fa-plug-circle-xmark" /> OFF
            </button>
          </div>
        </div>
      </div>

      {/* ── ESP32 Device Configuration ───────────────────────────────────────── */}
      <div className="settings-card">
        <SectionTitle icon="fa-sliders" title="ESP32 Device Configuration" />
        <p className="settings-desc">
          These settings are pushed to the Avatar unit and stored in the database.
          The ESP32 picks them up on its next config poll.
        </p>
        <div className="settings-fields">
          <NumberField
            label="Sampling interval" desc="How often the Sentry reads the PZEM sensor" unit="sec"
            value={samplingHz} onChange={setSamplingHz} min={1} max={60}
          />
          <NumberField
            label="Post interval" desc="How often the Avatar sends data to the server" unit="sec"
            value={postHz} onChange={setPostHz} min={1} max={30}
          />
          <NumberField
            label="LED brightness" desc="NeoPixel Halo brightness (0 = off, 255 = full)" unit=""
            value={ledBrightness} onChange={setLedBrightness} min={0} max={255} step={10}
          />
          <NumberField
            label="OLED mode cycle" desc="Seconds the Avatar shows each display mode" unit="sec"
            value={oledTimeout} onChange={setOledTimeout} min={2} max={30}
          />
        </div>
        <div style={{ marginTop: '1rem' }}>
          <button
            className={`save-btn ${cfgPushed ? 'saved' : ''}`}
            onClick={pushDeviceConfig}
            disabled={cfgPushing}
            style={{ width: 'auto' }}
          >
            {cfgPushed
              ? <><i className="fa-solid fa-circle-check" /> Config Pushed!</>
              : cfgPushing
              ? <><i className="fa-solid fa-circle-notch fa-spin" /> Pushing…</>
              : <><i className="fa-solid fa-upload" /> Push to ESP32</>
            }
          </button>
          <span className="settings-note" style={{ marginLeft: '1rem' }}>
            Config is stored in MongoDB — ESP32 reads it on next poll cycle.
          </span>
        </div>
      </div>

      {/* ── Save ─────────────────────────────────────────────────────────────── */}
      <div className="settings-footer">
        <button className={`save-btn ${saved ? 'saved' : ''}`} onClick={saveSettings}>
          {saved
            ? <><i className="fa-solid fa-circle-check" /> Saved!</>
            : <><i className="fa-solid fa-floppy-disk" /> Save Settings</>
          }
        </button>
        <span className="settings-note">
          Settings are stored locally in your browser. Server keys must be set in <code>.env</code>.
        </span>
      </div>

    </div>
  );
}
