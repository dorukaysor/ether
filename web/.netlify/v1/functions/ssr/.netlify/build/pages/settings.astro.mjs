import { c as createComponent, i as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BlN3iGIO.mjs';
import 'piccolore';
import { $ as $$Layout } from '../chunks/Layout_DSwVOdUh.mjs';
import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import { useState, useCallback, useEffect } from 'react';
import '../chunks/LiveDashboard_16Ev-m9b.mjs';
/* empty css                                    */
export { renderers } from '../renderers.mjs';

const MOCK_MODES = [
  { id: "off", label: "Live", color: "#6b6b8a", desc: "Fetch real data from the API" },
  { id: "auto", label: "Auto", color: "#00ff88", desc: "Simulates real-life fluctuations" },
  { id: "idle", label: "Idle", color: "#00f5ff", desc: "120–200 W · normal operation" },
  { id: "happy", label: "Happy", color: "#ff2d78", desc: "20–35 W · power drop detected" },
  { id: "dizzy", label: "Dizzy", color: "#ffe600", desc: "50–1450 W · spike / fluctuation" },
  { id: "frustrated", label: "Frustrated", color: "#b44fff", desc: "1050–1250 W · sustained high load" },
  { id: "angry", label: "Angry", color: "#ff2020", desc: "2600–2900 W · relay cutoff zone" }
];
function SectionTitle({ icon, title }) {
  return /* @__PURE__ */ jsxs("div", { className: "settings-section-title", children: [
    /* @__PURE__ */ jsx("i", { className: `fa-solid ${icon}` }),
    title
  ] });
}
function Toggle({ checked, onChange, label, desc }) {
  return /* @__PURE__ */ jsxs("label", { className: "settings-toggle", children: [
    /* @__PURE__ */ jsxs("div", { className: "toggle-text", children: [
      /* @__PURE__ */ jsx("span", { className: "toggle-label", children: label }),
      desc && /* @__PURE__ */ jsx("span", { className: "toggle-desc", children: desc })
    ] }),
    /* @__PURE__ */ jsx(
      "div",
      {
        className: `toggle-switch ${checked ? "on" : ""}`,
        onClick: () => onChange(!checked),
        children: /* @__PURE__ */ jsx("div", { className: "toggle-thumb" })
      }
    )
  ] });
}
function NumberField({ label, desc, value, onChange, unit, min, max, step = 1 }) {
  const dec = (n) => {
    const next = value - n;
    if (min !== void 0 && next < min) return;
    onChange(next);
  };
  const inc = (n) => {
    const next = value + n;
    if (max !== void 0 && next > max) return;
    onChange(next);
  };
  return /* @__PURE__ */ jsxs("div", { className: "settings-field", children: [
    /* @__PURE__ */ jsxs("div", { className: "field-text", children: [
      /* @__PURE__ */ jsx("span", { className: "field-label", children: label }),
      desc && /* @__PURE__ */ jsx("span", { className: "field-desc", children: desc })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "field-stepper", children: [
      /* @__PURE__ */ jsx("button", { className: "stepper-btn", onClick: () => dec(step), "aria-label": "Decrease", children: "−" }),
      /* @__PURE__ */ jsxs("span", { className: "stepper-val", children: [
        value,
        unit && /* @__PURE__ */ jsx("span", { className: "stepper-unit", children: unit })
      ] }),
      /* @__PURE__ */ jsx("button", { className: "stepper-btn", onClick: () => inc(step), "aria-label": "Increase", children: "+" })
    ] })
  ] });
}
function SettingsPanel() {
  const [mockMode, setMockMode] = useState(() => {
    try {
      return localStorage.getItem("ether:mockMode") ?? "off";
    } catch {
      return "off";
    }
  });
  function applyMockMode(mode) {
    setMockMode(mode);
    try {
      localStorage.setItem("ether:mockMode", mode);
    } catch {
    }
    window.dispatchEvent(new CustomEvent("ether:mockMode", { detail: mode }));
  }
  const [warnThresh, setWarnThresh] = useState(1e3);
  const [critThresh, setCritThresh] = useState(2500);
  const [frustMinutes, setFrustMinutes] = useState(15);
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [alertOnAngry, setAlertOnAngry] = useState(true);
  const [alertOnFrust, setAlertOnFrust] = useState(true);
  const [alertOnRelay, setAlertOnRelay] = useState(true);
  const [refreshRate, setRefreshRate] = useState(3);
  const [compactCards, setCompactCards] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState("checking");
  const [lastSeenTs, setLastSeenTs] = useState(null);
  const [relayState, setRelayState] = useState(true);
  const [relaySending, setRelaySending] = useState(false);
  const [samplingHz, setSamplingHz] = useState(2);
  const [postHz, setPostHz] = useState(3);
  const [ledBrightness, setLedBrightness] = useState(180);
  const [oledTimeout, setOledTimeout] = useState(5);
  const [cfgPushed, setCfgPushed] = useState(false);
  const [cfgPushing, setCfgPushing] = useState(false);
  const checkOnline = useCallback(async () => {
    try {
      const res = await fetch("/api/readings");
      if (!res.ok) {
        setOnlineStatus("offline");
        return;
      }
      const data = await res.json();
      const ts = data.timestamp ? new Date(data.timestamp) : null;
      if (ts && Date.now() - ts.getTime() < 3e4) {
        setOnlineStatus("online");
        setRelayState(data.relay ?? true);
      } else {
        setOnlineStatus("offline");
      }
      if (data.timestamp) setLastSeenTs(data.timestamp);
    } catch {
      setOnlineStatus("offline");
    }
  }, []);
  useEffect(() => {
    checkOnline();
    const id = setInterval(checkOnline, 1e4);
    return () => clearInterval(id);
  }, [checkOnline]);
  async function sendRelay(state) {
    setRelaySending(true);
    try {
      await fetch("/api/relay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state })
      });
      setRelayState(state);
    } finally {
      setRelaySending(false);
    }
  }
  async function pushDeviceConfig() {
    setCfgPushing(true);
    try {
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          samplingIntervalSec: samplingHz,
          postIntervalSec: postHz,
          ledBrightness,
          oledTimeout,
          warnThreshW: warnThresh,
          critThreshW: critThresh,
          frustMinutes
        })
      });
      setCfgPushed(true);
      setTimeout(() => setCfgPushed(false), 2500);
    } finally {
      setCfgPushing(false);
    }
  }
  useEffect(() => {
    fetch("/api/config").then((r) => r.json()).then((d) => {
      const c = d.config;
      if (!c) return;
      if (c.samplingIntervalSec) setSamplingHz(c.samplingIntervalSec);
      if (c.postIntervalSec) setPostHz(c.postIntervalSec);
      if (c.ledBrightness) setLedBrightness(c.ledBrightness);
      if (c.oledTimeout) setOledTimeout(c.oledTimeout);
    }).catch(() => {
    });
  }, []);
  const [saved, setSaved] = useState(false);
  function saveSettings() {
    try {
      localStorage.setItem("ether:settings", JSON.stringify({
        warnThresh,
        critThresh,
        frustMinutes,
        telegramEnabled,
        alertOnAngry,
        alertOnFrust,
        alertOnRelay,
        refreshRate,
        compactCards
      }));
    } catch {
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2e3);
  }
  useEffect(() => {
    try {
      const raw = localStorage.getItem("ether:settings");
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.warnThresh) setWarnThresh(s.warnThresh);
      if (s.critThresh) setCritThresh(s.critThresh);
      if (s.frustMinutes) setFrustMinutes(s.frustMinutes);
      if (s.telegramEnabled !== void 0) setTelegramEnabled(s.telegramEnabled);
      if (s.alertOnAngry !== void 0) setAlertOnAngry(s.alertOnAngry);
      if (s.alertOnFrust !== void 0) setAlertOnFrust(s.alertOnFrust);
      if (s.alertOnRelay !== void 0) setAlertOnRelay(s.alertOnRelay);
      if (s.refreshRate) setRefreshRate(s.refreshRate);
      if (s.compactCards !== void 0) setCompactCards(s.compactCards);
    } catch {
    }
  }, []);
  return /* @__PURE__ */ jsxs("div", { className: "settings-root", children: [
    /* @__PURE__ */ jsxs("div", { className: "settings-card", children: [
      /* @__PURE__ */ jsx(SectionTitle, { icon: "fa-flask", title: "Demo / Mock Mode" }),
      /* @__PURE__ */ jsx("p", { className: "settings-desc", children: "Simulate different emotive states without live hardware. The home dashboard updates in real-time when you switch modes." }),
      /* @__PURE__ */ jsx("div", { className: "mock-mode-grid", children: MOCK_MODES.map((m) => /* @__PURE__ */ jsxs(
        "button",
        {
          className: `mock-mode-card ${mockMode === m.id ? "active" : ""}`,
          style: { "--btn-color": m.color },
          onClick: () => applyMockMode(m.id),
          children: [
            /* @__PURE__ */ jsx("span", { className: "mmc-dot", style: { background: m.color, boxShadow: `0 0 6px ${m.color}` } }),
            /* @__PURE__ */ jsxs("div", { className: "mmc-text", children: [
              /* @__PURE__ */ jsx("span", { className: "mmc-label", children: m.label }),
              /* @__PURE__ */ jsx("span", { className: "mmc-desc", children: m.desc })
            ] }),
            mockMode === m.id && /* @__PURE__ */ jsx("i", { className: "fa-solid fa-check mmc-check", style: { color: m.color } })
          ]
        },
        m.id
      )) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "settings-card", children: [
      /* @__PURE__ */ jsx(SectionTitle, { icon: "fa-sliders", title: "Power Thresholds" }),
      /* @__PURE__ */ jsx("p", { className: "settings-desc", children: "Define when ETHER changes emotive state and triggers alerts." }),
      /* @__PURE__ */ jsxs("div", { className: "settings-fields", children: [
        /* @__PURE__ */ jsx(
          NumberField,
          {
            label: "Warning threshold",
            desc: "Enters Frustrated state above this",
            unit: "W",
            value: warnThresh,
            onChange: setWarnThresh,
            min: 100,
            max: 2499
          }
        ),
        /* @__PURE__ */ jsx(
          NumberField,
          {
            label: "Critical threshold",
            desc: "Enters Angry state + relay cutoff",
            unit: "W",
            value: critThresh,
            onChange: setCritThresh,
            min: 500,
            max: 9999
          }
        ),
        /* @__PURE__ */ jsx(
          NumberField,
          {
            label: "Frustration window",
            desc: "Minutes above warning before state triggers",
            unit: "min",
            value: frustMinutes,
            onChange: setFrustMinutes,
            min: 1,
            max: 60
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "settings-card", children: [
      /* @__PURE__ */ jsx(SectionTitle, { icon: "fa-bell", title: "Telegram Notifications" }),
      /* @__PURE__ */ jsxs("p", { className: "settings-desc", children: [
        "Telegram bot token and chat ID are configured via the ",
        /* @__PURE__ */ jsx("code", { children: ".env" }),
        " file on the server."
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "settings-toggles", children: [
        /* @__PURE__ */ jsx(
          Toggle,
          {
            checked: telegramEnabled,
            onChange: setTelegramEnabled,
            label: "Enable Telegram alerts",
            desc: "Requires TELEGRAM_BOT_TOKEN in .env"
          }
        ),
        /* @__PURE__ */ jsx(
          Toggle,
          {
            checked: alertOnAngry,
            onChange: setAlertOnAngry,
            label: "Alert on Angry state",
            desc: "Fires when power exceeds critical threshold"
          }
        ),
        /* @__PURE__ */ jsx(
          Toggle,
          {
            checked: alertOnFrust,
            onChange: setAlertOnFrust,
            label: "Alert on Frustrated state",
            desc: "Fires after sustained high load"
          }
        ),
        /* @__PURE__ */ jsx(
          Toggle,
          {
            checked: alertOnRelay,
            onChange: setAlertOnRelay,
            label: "Alert on relay change",
            desc: "Notify when relay is turned on or off"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "settings-card", children: [
      /* @__PURE__ */ jsx(SectionTitle, { icon: "fa-gauge", title: "Dashboard" }),
      /* @__PURE__ */ jsx("div", { className: "settings-fields", children: /* @__PURE__ */ jsx(
        NumberField,
        {
          label: "Refresh rate",
          desc: "How often the dashboard polls for new data",
          unit: "sec",
          value: refreshRate,
          onChange: setRefreshRate,
          min: 1,
          max: 60
        }
      ) }),
      /* @__PURE__ */ jsx("div", { className: "settings-toggles", style: { marginTop: "0.75rem" }, children: /* @__PURE__ */ jsx(
        Toggle,
        {
          checked: compactCards,
          onChange: setCompactCards,
          label: "Compact reading cards",
          desc: "Reduce card size on the home dashboard"
        }
      ) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "settings-card", children: [
      /* @__PURE__ */ jsx(SectionTitle, { icon: "fa-microchip", title: "ESP32 Device Control" }),
      /* @__PURE__ */ jsx("p", { className: "settings-desc", children: "Direct realtime control of the physical ETHER hardware. Commands are queued in the database and executed by the Avatar unit within its next polling cycle." }),
      /* @__PURE__ */ jsxs("div", { className: "esp-status-row", children: [
        /* @__PURE__ */ jsxs("div", { className: `esp-status-badge ${onlineStatus}`, children: [
          /* @__PURE__ */ jsx("span", { className: "esp-status-dot" }),
          onlineStatus === "checking" && "Checking…",
          onlineStatus === "online" && "Online",
          onlineStatus === "offline" && "Offline / No data"
        ] }),
        lastSeenTs && /* @__PURE__ */ jsxs("span", { className: "esp-last-seen", children: [
          /* @__PURE__ */ jsx("i", { className: "fa-regular fa-clock" }),
          "Last seen ",
          new Date(lastSeenTs).toLocaleTimeString()
        ] }),
        /* @__PURE__ */ jsx("button", { className: "esp-refresh-btn", onClick: checkOnline, children: /* @__PURE__ */ jsx("i", { className: "fa-solid fa-rotate" }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "esp-relay-row", children: [
        /* @__PURE__ */ jsxs("div", { className: "field-text", children: [
          /* @__PURE__ */ jsxs("span", { className: "field-label", children: [
            /* @__PURE__ */ jsx("i", { className: "fa-solid fa-plug" }),
            " Relay"
          ] }),
          /* @__PURE__ */ jsx("span", { className: "field-desc", children: "Instantly cut or restore power to the monitored outlet" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "esp-relay-btns", children: [
          /* @__PURE__ */ jsxs(
            "button",
            {
              className: `relay-btn on ${relayState ? "active" : ""}`,
              disabled: relaySending,
              onClick: () => sendRelay(true),
              children: [
                /* @__PURE__ */ jsx("i", { className: "fa-solid fa-plug-circle-check" }),
                " ON"
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            "button",
            {
              className: `relay-btn off ${!relayState ? "active" : ""}`,
              disabled: relaySending,
              onClick: () => sendRelay(false),
              children: [
                /* @__PURE__ */ jsx("i", { className: "fa-solid fa-plug-circle-xmark" }),
                " OFF"
              ]
            }
          )
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "settings-card", children: [
      /* @__PURE__ */ jsx(SectionTitle, { icon: "fa-sliders", title: "ESP32 Device Configuration" }),
      /* @__PURE__ */ jsx("p", { className: "settings-desc", children: "These settings are pushed to the Avatar unit and stored in the database. The ESP32 picks them up on its next config poll." }),
      /* @__PURE__ */ jsxs("div", { className: "settings-fields", children: [
        /* @__PURE__ */ jsx(
          NumberField,
          {
            label: "Sampling interval",
            desc: "How often the Sentry reads the PZEM sensor",
            unit: "sec",
            value: samplingHz,
            onChange: setSamplingHz,
            min: 1,
            max: 60
          }
        ),
        /* @__PURE__ */ jsx(
          NumberField,
          {
            label: "Post interval",
            desc: "How often the Avatar sends data to the server",
            unit: "sec",
            value: postHz,
            onChange: setPostHz,
            min: 1,
            max: 30
          }
        ),
        /* @__PURE__ */ jsx(
          NumberField,
          {
            label: "LED brightness",
            desc: "NeoPixel Halo brightness (0 = off, 255 = full)",
            unit: "",
            value: ledBrightness,
            onChange: setLedBrightness,
            min: 0,
            max: 255,
            step: 10
          }
        ),
        /* @__PURE__ */ jsx(
          NumberField,
          {
            label: "OLED mode cycle",
            desc: "Seconds the Avatar shows each display mode",
            unit: "sec",
            value: oledTimeout,
            onChange: setOledTimeout,
            min: 2,
            max: 30
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { marginTop: "1rem" }, children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            className: `save-btn ${cfgPushed ? "saved" : ""}`,
            onClick: pushDeviceConfig,
            disabled: cfgPushing,
            style: { width: "auto" },
            children: cfgPushed ? /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx("i", { className: "fa-solid fa-circle-check" }),
              " Config Pushed!"
            ] }) : cfgPushing ? /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx("i", { className: "fa-solid fa-circle-notch fa-spin" }),
              " Pushing…"
            ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx("i", { className: "fa-solid fa-upload" }),
              " Push to ESP32"
            ] })
          }
        ),
        /* @__PURE__ */ jsx("span", { className: "settings-note", style: { marginLeft: "1rem" }, children: "Config is stored in MongoDB — ESP32 reads it on next poll cycle." })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "settings-footer", children: [
      /* @__PURE__ */ jsx("button", { className: `save-btn ${saved ? "saved" : ""}`, onClick: saveSettings, children: saved ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("i", { className: "fa-solid fa-circle-check" }),
        " Saved!"
      ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("i", { className: "fa-solid fa-floppy-disk" }),
        " Save Settings"
      ] }) }),
      /* @__PURE__ */ jsxs("span", { className: "settings-note", children: [
        "Settings are stored locally in your browser. Server keys must be set in ",
        /* @__PURE__ */ jsx("code", { children: ".env" }),
        "."
      ] })
    ] })
  ] });
}

const $$Settings = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Settings", "data-astro-cid-swhfej32": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="page-header" data-astro-cid-swhfej32> <h1 data-astro-cid-swhfej32>Settings</h1> <p class="subtitle" data-astro-cid-swhfej32>Configure ETHER — mock mode, thresholds, notifications, and dashboard controls.</p> </section> <div class="page-body" data-astro-cid-swhfej32> ${renderComponent($$result2, "SettingsPanel", SettingsPanel, { "client:load": true, "client:component-hydration": "load", "client:component-path": "D:/projects/ether/web/src/components/SettingsPanel", "client:component-export": "default", "data-astro-cid-swhfej32": true })} </div> ` })} `;
}, "D:/projects/ether/web/src/pages/settings.astro", void 0);

const $$file = "D:/projects/ether/web/src/pages/settings.astro";
const $$url = "/settings";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Settings,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
