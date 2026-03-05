import { c as createComponent, i as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BlN3iGIO.mjs';
import 'piccolore';
import { $ as $$Layout } from '../chunks/Layout_DSwVOdUh.mjs';
import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import { useState, useCallback, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area, LineChart, Legend, Line } from 'recharts';
/* empty css                                   */
export { renderers } from '../renderers.mjs';

const TIME_RANGES = [
  { id: "1h", label: "1 Hour" },
  { id: "6h", label: "6 Hours" },
  { id: "24h", label: "24 Hours" },
  { id: "7d", label: "7 Days" }
];
const METRICS = [
  { id: "power", label: "Power", unit: "W", color: "#ffe600" },
  { id: "voltage", label: "Voltage", unit: "V", color: "#00f5ff" },
  { id: "current", label: "Current", unit: "A", color: "#ff2d78" },
  { id: "energy", label: "Energy", unit: "kWh", color: "#b44fff" },
  { id: "frequency", label: "Frequency", unit: "Hz", color: "#00f5ff" },
  { id: "power_factor", label: "Power Factor", unit: "", color: "#ff2d78" }
];
const LIMIT_MAP = { "1h": 120, "6h": 360, "24h": 480, "7d": 500 };
function generateMockHistory(range) {
  const points = LIMIT_MAP[range];
  const now = Date.now();
  const rangeMs = {
    "1h": 36e5,
    "6h": 216e5,
    "24h": 864e5,
    "7d": 6048e5
  };
  const interval = rangeMs[range] / points;
  return Array.from({ length: points }, (_, i) => {
    const t = new Date(now - (points - i) * interval);
    const power = 80 + Math.sin(i / 20) * 60 + Math.random() * 30;
    return {
      time: t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      voltage: parseFloat((220 + Math.sin(i / 30) * 3 + Math.random() * 2).toFixed(1)),
      current: parseFloat((power / 220).toFixed(3)),
      power: parseFloat(power.toFixed(1)),
      energy: parseFloat((1.2 + i * 5e-4).toFixed(4)),
      frequency: parseFloat((50 + (Math.random() - 0.5) * 0.3).toFixed(2)),
      power_factor: parseFloat((0.95 + (Math.random() - 0.5) * 0.04).toFixed(3))
    };
  });
}
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return /* @__PURE__ */ jsxs("div", { className: "chart-tooltip", children: [
    /* @__PURE__ */ jsx("p", { className: "ct-time", children: label }),
    payload.map((p) => /* @__PURE__ */ jsxs("p", { style: { color: p.color }, className: "ct-row", children: [
      /* @__PURE__ */ jsx("span", { children: p.name }),
      /* @__PURE__ */ jsx("span", { children: p.value })
    ] }, p.dataKey))
  ] });
}
function StatCard({ label, value, unit, color }) {
  return /* @__PURE__ */ jsxs("div", { className: "stat-card", style: { "--stat-color": color }, children: [
    /* @__PURE__ */ jsx("span", { className: "stat-label", children: label }),
    /* @__PURE__ */ jsxs("span", { className: "stat-value", children: [
      value,
      /* @__PURE__ */ jsxs("span", { className: "stat-unit", children: [
        " ",
        unit
      ] })
    ] })
  ] });
}
function HistoryCharts() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [range, setRange] = useState("1h");
  const [metric, setMetric] = useState("power");
  const [isMock, setIsMock] = useState(true);
  const metaInfo = METRICS.find((m) => m.id === metric);
  const fetchData = useCallback(async () => {
    setLoading(true);
    if (isMock) {
      await new Promise((r) => setTimeout(r, 300));
      setData(generateMockHistory(range));
      setError(null);
      setLoading(false);
      return;
    }
    try {
      const limit = LIMIT_MAP[range];
      const res = await fetch(`/api/history?limit=${limit}`);
      if (!res.ok) throw new Error("API error");
      const json = await res.json();
      const points = json.data.reverse().map((r) => ({
        time: new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        voltage: r.readings.voltage,
        current: r.readings.current,
        power: r.readings.power,
        energy: r.readings.energy,
        frequency: r.readings.frequency,
        power_factor: r.readings.power_factor
      }));
      setData(points);
      setError(null);
    } catch {
      setError("Could not load history.");
    } finally {
      setLoading(false);
    }
  }, [range, isMock]);
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  const vals = data.map((d) => d[metric]);
  const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : "---";
  const max = vals.length ? Math.max(...vals).toFixed(2) : "---";
  const min = vals.length ? Math.min(...vals).toFixed(2) : "---";
  const last = vals.length ? vals[vals.length - 1].toFixed(2) : "---";
  const chartData = range === "7d" ? data.filter((_, i) => i % 6 === 0) : data;
  return /* @__PURE__ */ jsxs("div", { className: "history-root", children: [
    /* @__PURE__ */ jsxs("div", { className: "history-controls", children: [
      /* @__PURE__ */ jsxs("div", { className: "ctrl-group", children: [
        /* @__PURE__ */ jsx("span", { className: "ctrl-label", children: "Range" }),
        /* @__PURE__ */ jsx("div", { className: "ctrl-btns", children: TIME_RANGES.map((r) => /* @__PURE__ */ jsx(
          "button",
          {
            className: `ctrl-btn ${range === r.id ? "active" : ""}`,
            onClick: () => setRange(r.id),
            children: r.label
          },
          r.id
        )) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "ctrl-group", children: [
        /* @__PURE__ */ jsx("span", { className: "ctrl-label", children: "Metric" }),
        /* @__PURE__ */ jsx("div", { className: "ctrl-btns", children: METRICS.map((m) => /* @__PURE__ */ jsx(
          "button",
          {
            className: `ctrl-btn metric-btn ${metric === m.id ? "active" : ""}`,
            style: { "--btn-color": m.color },
            onClick: () => setMetric(m.id),
            children: m.label
          },
          m.id
        )) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "ctrl-group ctrl-mock", children: [
        /* @__PURE__ */ jsx("span", { className: "ctrl-label", children: "Source" }),
        /* @__PURE__ */ jsxs(
          "button",
          {
            className: `ctrl-btn mock-toggle ${isMock ? "active mock" : ""}`,
            onClick: () => setIsMock((p) => !p),
            children: [
              /* @__PURE__ */ jsx("i", { className: `fa-solid ${isMock ? "fa-flask" : "fa-database"}` }),
              isMock ? " Mock" : " Live DB"
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "stat-row", children: [
      /* @__PURE__ */ jsx(StatCard, { label: "Latest", value: last, unit: metaInfo.unit, color: metaInfo.color }),
      /* @__PURE__ */ jsx(StatCard, { label: "Avg", value: avg, unit: metaInfo.unit, color: metaInfo.color }),
      /* @__PURE__ */ jsx(StatCard, { label: "Min", value: min, unit: metaInfo.unit, color: metaInfo.color }),
      /* @__PURE__ */ jsx(StatCard, { label: "Max", value: max, unit: metaInfo.unit, color: metaInfo.color })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "chart-card", children: loading ? /* @__PURE__ */ jsxs("div", { className: "chart-loading", children: [
      /* @__PURE__ */ jsx("i", { className: "fa-solid fa-circle-notch fa-spin" }),
      "Loading data…"
    ] }) : error ? /* @__PURE__ */ jsxs("div", { className: "dash-error", children: [
      /* @__PURE__ */ jsx("i", { className: "fa-solid fa-triangle-exclamation" }),
      " ",
      error
    ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs("div", { className: "chart-header", children: [
        /* @__PURE__ */ jsxs("span", { className: "chart-title", style: { color: metaInfo.color }, children: [
          metaInfo.label,
          " ",
          /* @__PURE__ */ jsxs("span", { className: "chart-unit", children: [
            "(",
            metaInfo.unit || "ratio",
            ")"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("span", { className: "chart-points", children: [
          chartData.length,
          " points"
        ] })
      ] }),
      /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: 320, children: /* @__PURE__ */ jsxs(AreaChart, { data: chartData, margin: { top: 8, right: 16, left: 0, bottom: 0 }, children: [
        /* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs("linearGradient", { id: "metricGrad", x1: "0", y1: "0", x2: "0", y2: "1", children: [
          /* @__PURE__ */ jsx("stop", { offset: "5%", stopColor: metaInfo.color, stopOpacity: 0.25 }),
          /* @__PURE__ */ jsx("stop", { offset: "95%", stopColor: metaInfo.color, stopOpacity: 0 })
        ] }) }),
        /* @__PURE__ */ jsx(CartesianGrid, { stroke: "#1e1e3a", strokeDasharray: "4 4" }),
        /* @__PURE__ */ jsx(
          XAxis,
          {
            dataKey: "time",
            tick: { fill: "#6b6b8a", fontSize: 11 },
            tickLine: false,
            axisLine: { stroke: "#1e1e3a" },
            interval: "preserveStartEnd"
          }
        ),
        /* @__PURE__ */ jsx(
          YAxis,
          {
            tick: { fill: "#6b6b8a", fontSize: 11 },
            tickLine: false,
            axisLine: false,
            width: 48
          }
        ),
        /* @__PURE__ */ jsx(Tooltip, { content: /* @__PURE__ */ jsx(CustomTooltip, {}) }),
        /* @__PURE__ */ jsx(
          Area,
          {
            type: "monotone",
            dataKey: metric,
            name: metaInfo.label,
            stroke: metaInfo.color,
            strokeWidth: 2,
            fill: "url(#metricGrad)",
            dot: false,
            activeDot: { r: 4, fill: metaInfo.color }
          }
        )
      ] }) })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "chart-card", children: [
      /* @__PURE__ */ jsx("div", { className: "chart-header", children: /* @__PURE__ */ jsx("span", { className: "chart-title", children: "Power + Voltage + Current Overview" }) }),
      /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: 260, children: /* @__PURE__ */ jsxs(LineChart, { data: chartData, margin: { top: 8, right: 16, left: 0, bottom: 0 }, children: [
        /* @__PURE__ */ jsx(CartesianGrid, { stroke: "#1e1e3a", strokeDasharray: "4 4" }),
        /* @__PURE__ */ jsx(
          XAxis,
          {
            dataKey: "time",
            tick: { fill: "#6b6b8a", fontSize: 11 },
            tickLine: false,
            axisLine: { stroke: "#1e1e3a" },
            interval: "preserveStartEnd"
          }
        ),
        /* @__PURE__ */ jsx(
          YAxis,
          {
            yAxisId: "left",
            tick: { fill: "#6b6b8a", fontSize: 11 },
            tickLine: false,
            axisLine: false,
            width: 48
          }
        ),
        /* @__PURE__ */ jsx(
          YAxis,
          {
            yAxisId: "right",
            orientation: "right",
            tick: { fill: "#6b6b8a", fontSize: 11 },
            tickLine: false,
            axisLine: false,
            width: 48
          }
        ),
        /* @__PURE__ */ jsx(Tooltip, { content: /* @__PURE__ */ jsx(CustomTooltip, {}) }),
        /* @__PURE__ */ jsx(
          Legend,
          {
            wrapperStyle: { fontSize: 12, color: "#6b6b8a", paddingTop: 8 }
          }
        ),
        /* @__PURE__ */ jsx(Line, { yAxisId: "left", type: "monotone", dataKey: "power", name: "Power (W)", stroke: "#ffe600", strokeWidth: 2, dot: false }),
        /* @__PURE__ */ jsx(Line, { yAxisId: "right", type: "monotone", dataKey: "voltage", name: "Voltage (V)", stroke: "#00f5ff", strokeWidth: 1.5, dot: false }),
        /* @__PURE__ */ jsx(Line, { yAxisId: "left", type: "monotone", dataKey: "current", name: "Current (A)", stroke: "#ff2d78", strokeWidth: 1.5, dot: false })
      ] }) })
    ] })
  ] });
}

const $$History = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "History", "data-astro-cid-tal57otx": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="page-header" data-astro-cid-tal57otx> <h1 data-astro-cid-tal57otx>History</h1> <p class="subtitle" data-astro-cid-tal57otx>Energy data over time — charts, trends, and statistics.</p> </section> <div class="page-body" data-astro-cid-tal57otx> ${renderComponent($$result2, "HistoryCharts", HistoryCharts, { "client:load": true, "client:component-hydration": "load", "client:component-path": "D:/projects/ether/web/src/components/HistoryCharts", "client:component-export": "default", "data-astro-cid-tal57otx": true })} </div> ` })} `;
}, "D:/projects/ether/web/src/pages/history.astro", void 0);

const $$file = "D:/projects/ether/web/src/pages/history.astro";
const $$url = "/history";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$History,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
