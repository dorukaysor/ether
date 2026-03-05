import { jsxs, jsx } from 'react/jsx-runtime';
import { memo, useRef, useEffect, useState, useReducer, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';

function useAnimatedNumber(target, spanRef, decimals) {
  const rafRef = useRef(void 0);
  const fromRef = useRef(null);
  useEffect(() => {
    if (target === null) {
      if (spanRef.current) spanRef.current.textContent = "---";
      fromRef.current = null;
      return;
    }
    if (fromRef.current === null) {
      fromRef.current = target;
      if (spanRef.current) spanRef.current.textContent = target.toFixed(decimals);
      return;
    }
    const from = fromRef.current;
    const to = target;
    const t0 = performance.now();
    const dur = 350;
    if (rafRef.current !== void 0) cancelAnimationFrame(rafRef.current);
    const step = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      fromRef.current = from + (to - from) * ease;
      if (spanRef.current) spanRef.current.textContent = fromRef.current.toFixed(decimals);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== void 0) cancelAnimationFrame(rafRef.current);
    };
  }, [target, decimals]);
}
const ReadingCard = memo(function ReadingCard2({
  label,
  value,
  unit,
  icon,
  accentColor,
  decimals = 2,
  loading = false
}) {
  const spanRef = useRef(null);
  const prevRef = useRef(null);
  const trend = value !== null && prevRef.current !== null ? value - prevRef.current : 0;
  useAnimatedNumber(value, spanRef, decimals);
  useEffect(() => {
    if (value !== null) prevRef.current = value;
  }, [value]);
  if (loading) {
    return /* @__PURE__ */ jsxs("div", { className: "reading-card loading", style: { "--accent": accentColor }, children: [
      /* @__PURE__ */ jsx("div", { className: "rc-icon-wrap skeleton-box", style: { width: 40, height: 40 } }),
      /* @__PURE__ */ jsxs("div", { className: "rc-body", style: { flex: 1 }, children: [
        /* @__PURE__ */ jsx("div", { className: "skeleton-box", style: { width: "55%", height: 10, borderRadius: 4, marginBottom: 8 } }),
        /* @__PURE__ */ jsx("div", { className: "skeleton-box", style: { width: "80%", height: 28, borderRadius: 6 } })
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { className: "reading-card", style: { "--accent": accentColor }, children: [
    /* @__PURE__ */ jsx("div", { className: "rc-icon-wrap", children: /* @__PURE__ */ jsx("i", { className: `fa-solid ${icon}` }) }),
    /* @__PURE__ */ jsxs("div", { className: "rc-body", children: [
      /* @__PURE__ */ jsx("span", { className: "rc-label", children: label }),
      /* @__PURE__ */ jsxs("div", { className: "rc-value-row", children: [
        /* @__PURE__ */ jsx("span", { ref: spanRef, className: "rc-value" }),
        /* @__PURE__ */ jsx("span", { className: "rc-unit", children: unit }),
        trend !== 0 && /* @__PURE__ */ jsx("span", { className: `rc-delta ${trend > 0 ? "up" : "down"}`, children: trend > 0 ? "▲" : "▼" })
      ] })
    ] })
  ] });
});

const STATES = [
  { id: "idle", label: "Idle", color: "#00f5ff", icon: "fa-circle-dot", desc: "50 – 300 W" },
  { id: "happy", label: "Happy", color: "#ff2d78", icon: "fa-heart", desc: "Power drop detected" },
  { id: "dizzy", label: "Dizzy", color: "#ffe600", icon: "fa-bolt-lightning", desc: "Fluctuations / spikes" },
  { id: "frustrated", label: "Frustrated", color: "#b44fff", icon: "fa-skull", desc: ">1000 W for >15 min" },
  { id: "angry", label: "Angry", color: "#ff2020", icon: "fa-triangle-exclamation", desc: ">2500 W — relay off" }
];
function EmotiveState({ state, watts }) {
  const current = STATES.find((s) => s.id === state) ?? STATES[0];
  return /* @__PURE__ */ jsxs("div", { className: "emotive-container", children: [
    /* @__PURE__ */ jsxs(
      "div",
      {
        className: "emotive-badge",
        style: {
          "--state-color": current.color,
          borderColor: current.color,
          boxShadow: `0 0 18px ${current.color}55`
        },
        children: [
          /* @__PURE__ */ jsx("i", { className: `fa-solid ${current.icon} emotive-icon`, style: { color: current.color } }),
          /* @__PURE__ */ jsxs("div", { className: "emotive-text", children: [
            /* @__PURE__ */ jsx("span", { className: "emotive-label", style: { color: current.color }, children: current.label }),
            /* @__PURE__ */ jsx("span", { className: "emotive-desc", children: current.desc })
          ] }),
          watts !== null && /* @__PURE__ */ jsxs("span", { className: "emotive-watts", children: [
            watts.toFixed(0),
            " W"
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsx("div", { className: "emotive-dots", children: STATES.map((s) => /* @__PURE__ */ jsx(
      "div",
      {
        title: s.label,
        className: `emotive-dot ${s.id === state ? "active" : ""}`,
        style: {
          backgroundColor: s.id === state ? s.color : "#1e1e3a",
          boxShadow: s.id === state ? `0 0 8px ${s.color}` : "none"
        }
      },
      s.id
    )) })
  ] });
}

function MiniTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return /* @__PURE__ */ jsxs("div", { className: "spark-tooltip", children: [
    payload[0].value.toFixed(1),
    " W"
  ] });
}
function PowerSparkline({ data, color }) {
  if (data.length < 2) return null;
  const min = Math.min(...data.map((d) => d.power));
  const max = Math.max(...data.map((d) => d.power));
  const delta = max - min;
  return /* @__PURE__ */ jsxs("div", { className: "sparkline-card", children: [
    /* @__PURE__ */ jsxs("div", { className: "sparkline-meta", children: [
      /* @__PURE__ */ jsxs("span", { className: "sparkline-label", children: [
        /* @__PURE__ */ jsx("i", { className: "fa-solid fa-chart-line" }),
        " Power Trend"
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "sparkline-range", children: [
        /* @__PURE__ */ jsx("span", { style: { color: "#6b6b8a" }, children: "min" }),
        /* @__PURE__ */ jsxs("span", { style: { color }, children: [
          min.toFixed(0),
          " W"
        ] }),
        /* @__PURE__ */ jsx("span", { style: { color: "#6b6b8a", margin: "0 0.15rem" }, children: "·" }),
        /* @__PURE__ */ jsx("span", { style: { color: "#6b6b8a" }, children: "max" }),
        /* @__PURE__ */ jsxs("span", { style: { color }, children: [
          max.toFixed(0),
          " W"
        ] }),
        /* @__PURE__ */ jsx("span", { style: { color: "#6b6b8a", margin: "0 0.15rem" }, children: "·" }),
        /* @__PURE__ */ jsx("span", { style: { color: "#6b6b8a" }, children: "Δ" }),
        /* @__PURE__ */ jsxs("span", { style: { color: delta > 100 ? "#ffe600" : color }, children: [
          delta.toFixed(0),
          " W"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: 72, children: /* @__PURE__ */ jsxs(AreaChart, { data, margin: { top: 4, right: 0, left: 0, bottom: 0 }, children: [
      /* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs("linearGradient", { id: "sparkGrad", x1: "0", y1: "0", x2: "0", y2: "1", children: [
        /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: color, stopOpacity: 0.3 }),
        /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: color, stopOpacity: 0 })
      ] }) }),
      /* @__PURE__ */ jsx(
        Area,
        {
          type: "monotone",
          dataKey: "power",
          stroke: color,
          strokeWidth: 1.5,
          fill: "url(#sparkGrad)",
          dot: false,
          isAnimationActive: false
        }
      ),
      /* @__PURE__ */ jsx(Tooltip, { content: /* @__PURE__ */ jsx(MiniTooltip, {}) })
    ] }) })
  ] });
}

function age(date) {
  const s = Math.floor((Date.now() - date.getTime()) / 1e3);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}
function EventFeed({ events }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 15e3);
    return () => clearInterval(id);
  }, []);
  return /* @__PURE__ */ jsxs("div", { className: "event-feed-card", children: [
    /* @__PURE__ */ jsxs("div", { className: "ef-header", children: [
      /* @__PURE__ */ jsxs("span", { className: "ef-title", children: [
        /* @__PURE__ */ jsx("i", { className: "fa-solid fa-list-ul" }),
        " Recent Events"
      ] }),
      /* @__PURE__ */ jsxs("span", { className: "ef-count", children: [
        events.length,
        " logged"
      ] })
    ] }),
    events.length === 0 ? /* @__PURE__ */ jsx("p", { className: "ef-empty", children: "Waiting for events…" }) : /* @__PURE__ */ jsx("ul", { className: "ef-list", children: events.map((e) => /* @__PURE__ */ jsxs("li", { className: "ef-item", children: [
      /* @__PURE__ */ jsx(
        "div",
        {
          className: "ef-dot",
          style: { background: e.color, boxShadow: `0 0 6px ${e.color}` },
          children: e.icon && /* @__PURE__ */ jsx("i", { className: `fa-solid ${e.icon}`, style: { color: e.color, fontSize: "0.6rem" } })
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: "ef-body", children: [
        /* @__PURE__ */ jsx("span", { className: "ef-msg", children: e.message }),
        /* @__PURE__ */ jsx("span", { className: "ef-ts", children: age(e.ts) })
      ] })
    ] }, e.id)) })
  ] });
}

const STATE_COLORS = {
  idle: "#00f5ff",
  happy: "#ff2d78",
  dizzy: "#ffe600",
  frustrated: "#b44fff",
  angry: "#ff2020"
};
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  const push = useCallback((t) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...t, id }]);
    const dur = t.duration ?? 6e3;
    if (dur > 0) {
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), dur);
    }
    return id;
  }, []);
  return { toasts, push, dismiss };
}
const TOAST_ICONS = {
  info: "fa-circle-info",
  warn: "fa-triangle-exclamation",
  alert: "fa-shield-exclamation",
  success: "fa-circle-check"
};
const TOAST_COLORS = {
  info: "#00f5ff",
  warn: "#ffe600",
  alert: "#ff2020",
  success: "#00ff88"
};
function ToastContainer({ toasts, onDismiss }) {
  return /* @__PURE__ */ jsx("div", { className: "toast-container", children: /* @__PURE__ */ jsx(AnimatePresence, { initial: false, children: toasts.map((t) => {
    const color = t.color ?? TOAST_COLORS[t.type];
    const icon = t.icon ?? TOAST_ICONS[t.type];
    return /* @__PURE__ */ jsxs(
      motion.div,
      {
        className: "toast",
        style: { "--tc": color },
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, x: "110%" },
        transition: { duration: 0.28, ease: "easeOut" },
        children: [
          /* @__PURE__ */ jsx("div", { className: "toast-icon-wrap", children: /* @__PURE__ */ jsx("i", { className: `fa-solid ${icon}` }) }),
          /* @__PURE__ */ jsxs("div", { className: "toast-body", children: [
            /* @__PURE__ */ jsx("span", { className: "toast-title", children: t.title }),
            t.body && /* @__PURE__ */ jsx("span", { className: "toast-text", children: t.body }),
            t.action && (t.action.href ? /* @__PURE__ */ jsx("a", { href: t.action.href, className: "toast-action", children: t.action.label }) : /* @__PURE__ */ jsx("button", { className: "toast-action", onClick: t.action.onClick, children: t.action.label }))
          ] }),
          /* @__PURE__ */ jsx("button", { className: "toast-close", onClick: () => onDismiss(t.id), children: /* @__PURE__ */ jsx("i", { className: "fa-solid fa-xmark" }) })
        ]
      },
      t.id
    );
  }) }) });
}
function buildMock(mode) {
  const r = () => Math.random();
  let power, state, relay = true;
  switch (mode) {
    case "happy":
      power = 20 + r() * 15;
      state = "happy";
      break;
    case "dizzy":
      power = 50 + r() * 1400;
      state = "dizzy";
      break;
    case "frustrated":
      power = 1050 + r() * 200;
      state = "frustrated";
      break;
    case "angry":
      power = 2600 + r() * 300;
      state = "angry";
      relay = false;
      break;
    default:
      power = 120 + r() * 80;
      state = "idle";
  }
  return {
    readings: {
      voltage: 220 + r() * 5,
      current: parseFloat((power / 220).toFixed(3)),
      power,
      energy: 1.234 + r() * 1e-3,
      frequency: 50 + (r() - 0.5) * 0.2,
      power_factor: 0.95 + (r() - 0.5) * 0.05
    },
    state,
    relay,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
const CARDS = [
  { key: "voltage", label: "Voltage", unit: "V", icon: "fa-bolt", color: "#00f5ff", decimals: 1 },
  { key: "current", label: "Current", unit: "A", icon: "fa-water", color: "#ff2d78", decimals: 3 },
  { key: "power", label: "Power", unit: "W", icon: "fa-plug-circle-bolt", color: "#ffe600", decimals: 1 },
  { key: "energy", label: "Energy", unit: "kWh", icon: "fa-battery-full", color: "#b44fff", decimals: 3 },
  { key: "frequency", label: "Frequency", unit: "Hz", icon: "fa-wave-square", color: "#00f5ff", decimals: 1 },
  { key: "power_factor", label: "Power Factor", unit: "", icon: "fa-percent", color: "#ff2d78", decimals: 2 }
];
const UptimeClock = memo(function UptimeClock2({ start }) {
  const ref = useRef(null);
  useEffect(() => {
    const tick = () => {
      if (!ref.current) return;
      const s = Math.floor((Date.now() - start.getTime()) / 1e3);
      ref.current.textContent = [
        Math.floor(s / 3600),
        Math.floor(s % 3600 / 60),
        s % 60
      ].map((n) => String(n).padStart(2, "0")).join(":");
    };
    tick();
    const id = setInterval(tick, 1e3);
    return () => clearInterval(id);
  }, []);
  return /* @__PURE__ */ jsx("span", { ref, className: "sp-val sp-clock", children: "00:00:00" });
});
const HeroPowerValue = memo(function HeroPowerValue2({ watts, color }) {
  const spanRef = useRef(null);
  const rafRef = useRef(void 0);
  const fromRef = useRef(null);
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
    const to = watts;
    const t0 = performance.now();
    const dur = 450;
    if (rafRef.current !== void 0) cancelAnimationFrame(rafRef.current);
    const step = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      fromRef.current = from + (to - from) * ease;
      if (spanRef.current) spanRef.current.textContent = fromRef.current.toFixed(1);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== void 0) cancelAnimationFrame(rafRef.current);
    };
  }, [watts]);
  return /* @__PURE__ */ jsxs("div", { className: "hpc-value-display", children: [
    /* @__PURE__ */ jsx("span", { ref: spanRef, className: "hpc-val", style: { color } }),
    /* @__PURE__ */ jsx("span", { className: "hpc-unit", children: "W" })
  ] });
});
const INIT = {
  data: null,
  loading: true,
  error: null,
  lastUpdated: null,
  sparkData: [],
  sessionKwh: 0,
  sessionPeak: 0,
  events: []
};
function reducer(s, a) {
  switch (a.type) {
    case "RESET":
      return { ...s, loading: true, data: null, sparkData: [], error: null };
    case "ERROR":
      return { ...s, loading: false, error: a.msg };
    case "DATA": {
      const { res, pt, kwhDelta, newEvts } = a.payload;
      return {
        ...s,
        data: res,
        loading: false,
        error: null,
        lastUpdated: /* @__PURE__ */ new Date(),
        sparkData: [...s.sparkData, pt].slice(-40),
        sessionKwh: parseFloat((s.sessionKwh + kwhDelta).toFixed(4)),
        sessionPeak: Math.max(s.sessionPeak, res.readings.power),
        events: newEvts.length ? [...newEvts, ...s.events].slice(0, 20) : s.events
      };
    }
  }
}
function readMockMode() {
  try {
    return localStorage.getItem("ether:mockMode") ?? "off";
  } catch {
    return "off";
  }
}
const MemoSparkline = memo(PowerSparkline);
const MemoEventFeed = memo(EventFeed);
const MemoEmotiveState = memo(EmotiveState);
function LiveDashboard() {
  const [st, dispatch] = useReducer(reducer, INIT);
  const [mockMode, setMockMode] = useState(readMockMode);
  const sessionStart = useRef(/* @__PURE__ */ new Date());
  const prevEnergy = useRef(null);
  const prevState = useRef(null);
  const prevRelay = useRef(null);
  const eventId = useRef(0);
  const lastEventId = useRef(-1);
  const { toasts, push, dismiss } = useToasts();
  const autoRef = useRef({ basePower: 150, trend: 0, ticks: 0 });
  const tickAuto = useCallback(() => {
    const a = autoRef.current;
    a.ticks++;
    a.trend += (Math.random() - 0.5) * 10;
    a.trend = Math.max(-55, Math.min(55, a.trend));
    a.basePower += a.trend / 10 + (Math.random() - 0.5) * 14;
    a.basePower = Math.max(10, Math.min(2600, a.basePower));
    if (Math.random() < 0.04) {
      const spike = (180 + Math.random() * 550) * (Math.random() > 0.5 ? 1 : -1);
      a.basePower = Math.max(10, Math.min(2600, a.basePower + spike));
      a.trend = 0;
    }
    const power = a.basePower + (Math.random() - 0.5) * 6;
    let state;
    if (power < 40) state = "happy";
    else if (power < 900) state = "idle";
    else if (power < 1400) state = "dizzy";
    else if (power < 2100) state = "frustrated";
    else state = "angry";
    const r = Math.random;
    return {
      readings: {
        voltage: 220 + (r() - 0.5) * 4,
        current: parseFloat((power / 220).toFixed(3)),
        power,
        energy: 1.234 + r() * 1e-3,
        frequency: 50 + (r() - 0.5) * 0.2,
        power_factor: 0.92 + r() * 0.06
      },
      state,
      relay: power < 2500,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  }, []);
  useEffect(() => {
    if (mockMode !== "off") return;
    const shown = sessionStorage.getItem("ether:mock-hint");
    if (shown) return;
    sessionStorage.setItem("ether:mock-hint", "1");
    const t = setTimeout(() => {
      push({
        type: "info",
        title: "Running in Live Mode",
        body: "No ESP32 connected yet? Switch to Mock Mode for a demo.",
        icon: "fa-flask",
        color: "#ffe600",
        duration: 9e3,
        action: { label: "Go to Settings →", href: "/settings" }
      });
    }, 1800);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!st.events.length) return;
    const newest = st.events[0];
    if (newest.id <= lastEventId.current) return;
    lastEventId.current = newest.id;
    if (newest.type === "relay" && !st.data?.relay) {
      push({ type: "alert", title: "Relay Tripped", body: "Power exceeded critical threshold — relay cut off.", icon: "fa-bolt", duration: 0 });
    } else if (newest.type === "state" && st.data?.state === "angry") {
      push({ type: "alert", title: "Critical Load Detected", body: "Power entered Angry state (>2500 W).", icon: "fa-skull", duration: 8e3 });
    } else if (newest.type === "relay" && st.data?.relay) {
      push({ type: "success", title: "Relay Restored", icon: "fa-circle-check", duration: 4e3 });
    }
  }, [st.events]);
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "ether:mockMode") setMockMode(e.newValue ?? "idle");
    };
    const onCustom = (e) => setMockMode(e.detail);
    window.addEventListener("storage", onStorage);
    window.addEventListener("ether:mockMode", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("ether:mockMode", onCustom);
    };
  }, []);
  useEffect(() => {
    dispatch({ type: "RESET" });
    prevEnergy.current = null;
    prevState.current = null;
    prevRelay.current = null;
    if (mockMode === "auto") autoRef.current = { basePower: 150, trend: 0, ticks: 0 };
  }, [mockMode]);
  const fetchData = useCallback(async () => {
    let res;
    if (mockMode === "off") {
      try {
        res = await fetch("/api/readings").then((r) => r.json());
      } catch {
        dispatch({ type: "ERROR", msg: "Could not reach ETHER unit." });
        return;
      }
    } else if (mockMode === "auto") {
      res = tickAuto();
    } else {
      res = buildMock(mockMode);
    }
    const pt = { t: Date.now(), power: res.readings.power };
    let kwhDelta = 0;
    if (prevEnergy.current !== null) {
      const d = res.readings.energy - prevEnergy.current;
      if (d > 0) kwhDelta = d;
    }
    prevEnergy.current = res.readings.energy;
    const newEvts = [];
    const STATE_ICONS = {
      idle: "fa-circle-dot",
      happy: "fa-heart",
      dizzy: "fa-rotate",
      frustrated: "fa-fire",
      angry: "fa-skull"
    };
    if (prevState.current !== null && prevState.current !== res.state) {
      newEvts.push({
        id: eventId.current++,
        ts: /* @__PURE__ */ new Date(),
        type: "state",
        message: `State → ${res.state}`,
        color: STATE_COLORS[res.state] ?? "#6b6b8a",
        icon: STATE_ICONS[res.state] ?? "fa-circle-dot"
      });
    }
    prevState.current = res.state;
    if (prevRelay.current !== null && prevRelay.current !== res.relay) {
      newEvts.push({
        id: eventId.current++,
        ts: /* @__PURE__ */ new Date(),
        type: "relay",
        message: `Relay ${res.relay ? "ON" : "OFF"}`,
        color: res.relay ? "#00f5ff" : "#ff2020",
        icon: res.relay ? "fa-plug" : "fa-plug-circle-xmark"
      });
    }
    prevRelay.current = res.relay;
    dispatch({ type: "DATA", payload: { res, pt, kwhDelta, newEvts } });
  }, [mockMode, tickAuto]);
  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 3e3);
    return () => clearInterval(id);
  }, [fetchData]);
  const { data, loading, error, lastUpdated, sparkData, sessionKwh, sessionPeak, events } = st;
  const readings = data?.readings ?? null;
  const stateVal = data?.state ?? "idle";
  const relay = data?.relay ?? true;
  const sparkColor = loading ? "#2e2e4a" : STATE_COLORS[stateVal] ?? "#00f5ff";
  return /* @__PURE__ */ jsxs("div", { className: "live-dashboard", children: [
    /* @__PURE__ */ jsxs("div", { className: "dash-topbar", children: [
      /* @__PURE__ */ jsx(MemoEmotiveState, { state: loading ? "idle" : stateVal, watts: loading ? null : readings?.power ?? null }),
      /* @__PURE__ */ jsxs("div", { className: "dash-meta", children: [
        mockMode !== "off" && /* @__PURE__ */ jsxs("span", { className: "mock-indicator", children: [
          /* @__PURE__ */ jsx("i", { className: "fa-solid fa-flask" }),
          " MOCK · ",
          mockMode
        ] }),
        /* @__PURE__ */ jsxs("span", { className: `relay-badge ${relay ? "on" : "off"}`, children: [
          /* @__PURE__ */ jsx("i", { className: `fa-solid ${relay ? "fa-circle-check" : "fa-circle-xmark"}` }),
          "Relay ",
          relay ? "ON" : "OFF"
        ] }),
        lastUpdated && !loading && /* @__PURE__ */ jsxs("span", { className: "last-updated", children: [
          /* @__PURE__ */ jsx("i", { className: "fa-regular fa-clock" }),
          " ",
          lastUpdated.toLocaleTimeString()
        ] })
      ] })
    ] }),
    error && /* @__PURE__ */ jsxs("div", { className: "dash-error", children: [
      /* @__PURE__ */ jsx("i", { className: "fa-solid fa-triangle-exclamation" }),
      " ",
      error
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "dash-hero-row", children: [
      /* @__PURE__ */ jsxs("div", { className: "hero-power-card", style: { "--sc": sparkColor }, children: [
        /* @__PURE__ */ jsxs("div", { className: "hpc-header", children: [
          /* @__PURE__ */ jsxs("span", { className: "hpc-label", children: [
            /* @__PURE__ */ jsx("span", { className: "live-dot", style: { background: sparkColor } }),
            "Live Power"
          ] }),
          loading ? /* @__PURE__ */ jsx("span", { className: "hpc-meta", children: "—" }) : /* @__PURE__ */ jsxs("span", { className: "hpc-meta", children: [
            readings?.frequency.toFixed(1),
            " Hz  ·  PF ",
            readings?.power_factor.toFixed(2)
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "hpc-value-row", children: loading ? /* @__PURE__ */ jsx("div", { className: "skeleton-box", style: { width: 200, height: 58, borderRadius: 8 } }) : /* @__PURE__ */ jsx(HeroPowerValue, { watts: readings?.power ?? 0, color: sparkColor }) }),
        /* @__PURE__ */ jsx(MemoSparkline, { data: sparkData, color: sparkColor })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "session-panel", children: [
        /* @__PURE__ */ jsxs("div", { className: "sp-row", children: [
          /* @__PURE__ */ jsxs("span", { className: "sp-label", children: [
            /* @__PURE__ */ jsx("i", { className: "fa-solid fa-stopwatch" }),
            " Uptime"
          ] }),
          /* @__PURE__ */ jsx(UptimeClock, { start: sessionStart.current })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "sp-sep" }),
        /* @__PURE__ */ jsxs("div", { className: "sp-row", children: [
          /* @__PURE__ */ jsxs("span", { className: "sp-label", children: [
            /* @__PURE__ */ jsx("i", { className: "fa-solid fa-bolt" }),
            " Energy"
          ] }),
          /* @__PURE__ */ jsxs("span", { className: "sp-val", style: { color: "#b44fff" }, children: [
            sessionKwh.toFixed(4),
            " ",
            /* @__PURE__ */ jsx("em", { children: "kWh" })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "sp-sep" }),
        /* @__PURE__ */ jsxs("div", { className: "sp-row", children: [
          /* @__PURE__ */ jsxs("span", { className: "sp-label", children: [
            /* @__PURE__ */ jsx("i", { className: "fa-solid fa-fire" }),
            " Peak"
          ] }),
          /* @__PURE__ */ jsxs("span", { className: "sp-val", style: { color: "#ff2d78" }, children: [
            sessionPeak.toFixed(0),
            " ",
            /* @__PURE__ */ jsx("em", { children: "W" })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "sp-sep" }),
        /* @__PURE__ */ jsxs("div", { className: "sp-row", children: [
          /* @__PURE__ */ jsxs("span", { className: "sp-label", children: [
            /* @__PURE__ */ jsx("i", { className: "fa-solid fa-signal" }),
            " Source"
          ] }),
          /* @__PURE__ */ jsx("span", { className: "sp-val", style: { color: mockMode !== "off" ? "#ffe600" : "#00f5ff" }, children: mockMode !== "off" ? mockMode : "Live API" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "readings-grid", children: CARDS.map((card) => /* @__PURE__ */ jsx(
      ReadingCard,
      {
        label: card.label,
        value: loading ? null : readings ? readings[card.key] : null,
        unit: card.unit,
        icon: card.icon,
        accentColor: card.color,
        decimals: card.decimals,
        loading
      },
      card.key
    )) }),
    /* @__PURE__ */ jsx(MemoEventFeed, { events }),
    /* @__PURE__ */ jsx(ToastContainer, { toasts, onDismiss: dismiss })
  ] });
}

export { LiveDashboard as L };
