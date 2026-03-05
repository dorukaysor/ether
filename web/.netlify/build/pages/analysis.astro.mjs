import { c as createComponent, i as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BlN3iGIO.mjs';
import 'piccolore';
import { $ as $$Layout } from '../chunks/Layout_DSwVOdUh.mjs';
import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import { useState, useRef, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
/* empty css                                    */
export { renderers } from '../renderers.mjs';

const DEFAULT_PREFS = {
  realtimeEnabled: false,
  intervalSec: 60,
  showInsights: true,
  showAdvice: true,
  showAlerts: true
};
const INTERVAL_OPTIONS = [
  { value: 30, label: "30 s" },
  { value: 60, label: "1 min" },
  { value: 120, label: "2 min" },
  { value: 300, label: "5 min" }
];
const INSIGHT_CONFIG = {
  info: { icon: "fa-circle-info", color: "#00f5ff", label: "Info" },
  warning: { icon: "fa-triangle-exclamation", color: "#ffe600", label: "Warning" },
  tip: { icon: "fa-lightbulb", color: "#b44fff", label: "Tip" },
  alert: { icon: "fa-shield-exclamation", color: "#ff2020", label: "Alert" }
};
const RISK_CONFIG = {
  low: { color: "#00f5ff", icon: "fa-circle-check", label: "Low Risk" },
  medium: { color: "#ffe600", icon: "fa-circle-exclamation", label: "Medium Risk" },
  high: { color: "#ff2d78", icon: "fa-triangle-exclamation", label: "High Risk" },
  critical: { color: "#ff2020", icon: "fa-skull", label: "Critical" }
};
function RiskBadge({ level }) {
  const cfg = RISK_CONFIG[level];
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: "risk-badge",
      style: { "--risk-color": cfg.color },
      children: [
        /* @__PURE__ */ jsx("i", { className: `fa-solid ${cfg.icon}` }),
        cfg.label
      ]
    }
  );
}
function InsightCard({ insight, index }) {
  const cfg = INSIGHT_CONFIG[insight.type] ?? INSIGHT_CONFIG.info;
  return /* @__PURE__ */ jsxs(
    motion.div,
    {
      className: "insight-card",
      style: { "--insight-color": cfg.color },
      initial: { opacity: 0, y: 16 },
      animate: { opacity: 1, y: 0 },
      transition: { delay: index * 0.1, duration: 0.35 },
      children: [
        /* @__PURE__ */ jsx("div", { className: "insight-icon", children: /* @__PURE__ */ jsx("i", { className: `fa-solid ${cfg.icon}` }) }),
        /* @__PURE__ */ jsxs("div", { className: "insight-body", children: [
          /* @__PURE__ */ jsxs("div", { className: "insight-header", children: [
            /* @__PURE__ */ jsx("span", { className: "insight-type", children: cfg.label }),
            /* @__PURE__ */ jsx("span", { className: "insight-title", children: insight.title })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "insight-text", children: insight.body })
        ] })
      ]
    }
  );
}
function StreamingText({ text }) {
  return /* @__PURE__ */ jsx(
    motion.p,
    {
      className: "analysis-summary",
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: 0.5 },
      children: text
    }
  );
}
function AIAnalysis() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [prefs, setPrefs] = useState(() => {
    try {
      const raw = localStorage.getItem("ether:ai-prefs");
      if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
    } catch {
    }
    return DEFAULT_PREFS;
  });
  const timerRef = useRef(void 0);
  const savePrefs = (next) => {
    setPrefs(next);
    try {
      localStorage.setItem("ether:ai-prefs", JSON.stringify(next));
    } catch {
    }
  };
  const patchPrefs = (patch) => savePrefs({ ...prefs, ...patch });
  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analysis", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unknown error");
      setResult(data);
    } catch (e) {
      setError(e.message ?? "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    clearInterval(timerRef.current);
    if (prefs.realtimeEnabled) {
      timerRef.current = setInterval(runAnalysis, prefs.intervalSec * 1e3);
    }
    return () => clearInterval(timerRef.current);
  }, [prefs.realtimeEnabled, prefs.intervalSec, runAnalysis]);
  const risk = result ? RISK_CONFIG[result.risk_level] : null;
  const visibleInsights = result?.insights.filter(
    (ins) => prefs.showAlerts || ins.type !== "alert"
  ) ?? [];
  return /* @__PURE__ */ jsxs("div", { className: "ai-root", children: [
    /* @__PURE__ */ jsxs("div", { className: "ai-trigger-panel", children: [
      /* @__PURE__ */ jsxs("div", { className: "ai-trigger-left", children: [
        /* @__PURE__ */ jsxs("div", { className: "ai-model-badge", children: [
          /* @__PURE__ */ jsx("i", { className: "fa-solid fa-brain" }),
          "Gemini 1.5 Flash"
        ] }),
        /* @__PURE__ */ jsx("p", { className: "ai-desc", children: "Analyzes your last 50 energy readings and produces insights, warnings, and efficiency tips." })
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          className: `ai-run-btn ${loading ? "loading" : ""}`,
          onClick: runAnalysis,
          disabled: loading,
          children: loading ? /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx("i", { className: "fa-solid fa-circle-notch fa-spin" }),
            " Analyzing…"
          ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx("i", { className: "fa-solid fa-wand-magic-sparkles" }),
            " Run Analysis"
          ] })
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "ai-controls", children: [
      /* @__PURE__ */ jsxs("div", { className: `ai-rt-toggle ${prefs.realtimeEnabled ? "on" : ""}`, children: [
        /* @__PURE__ */ jsxs(
          "button",
          {
            className: "ai-rt-btn",
            onClick: () => patchPrefs({ realtimeEnabled: !prefs.realtimeEnabled }),
            children: [
              /* @__PURE__ */ jsx("i", { className: `fa-solid ${prefs.realtimeEnabled ? "fa-stop" : "fa-play"}` }),
              prefs.realtimeEnabled ? "Stop Auto" : "Auto-Analyze"
            ]
          }
        ),
        prefs.realtimeEnabled && /* @__PURE__ */ jsx("div", { className: "ai-rt-interval", children: INTERVAL_OPTIONS.map((opt) => /* @__PURE__ */ jsx(
          "button",
          {
            className: `ai-interval-btn ${prefs.intervalSec === opt.value ? "active" : ""}`,
            onClick: () => patchPrefs({ intervalSec: opt.value }),
            children: opt.label
          },
          opt.value
        )) }),
        prefs.realtimeEnabled && /* @__PURE__ */ jsx("span", { className: "ai-rt-dot", title: "Auto-analysis active" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "ai-section-toggles", children: [
        /* @__PURE__ */ jsxs(
          "button",
          {
            className: `ai-section-btn ${prefs.showInsights ? "on" : ""}`,
            onClick: () => patchPrefs({ showInsights: !prefs.showInsights }),
            children: [
              /* @__PURE__ */ jsx("i", { className: "fa-solid fa-list-check" }),
              " Insights"
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          "button",
          {
            className: `ai-section-btn ${prefs.showAlerts ? "on" : ""}`,
            onClick: () => patchPrefs({ showAlerts: !prefs.showAlerts }),
            children: [
              /* @__PURE__ */ jsx("i", { className: "fa-solid fa-shield-exclamation" }),
              " Alerts"
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          "button",
          {
            className: `ai-section-btn ${prefs.showAdvice ? "on" : ""}`,
            onClick: () => patchPrefs({ showAdvice: !prefs.showAdvice }),
            children: [
              /* @__PURE__ */ jsx("i", { className: "fa-solid fa-circle-check" }),
              " Advice"
            ]
          }
        )
      ] })
    ] }),
    error && /* @__PURE__ */ jsxs("div", { className: "dash-error", children: [
      /* @__PURE__ */ jsx("i", { className: "fa-solid fa-triangle-exclamation" }),
      " ",
      error
    ] }),
    loading && /* @__PURE__ */ jsx("div", { className: "ai-loading-grid", children: [...Array(4)].map((_, i) => /* @__PURE__ */ jsxs("div", { className: "insight-card-skeleton", children: [
      /* @__PURE__ */ jsx("div", { className: "skeleton-box", style: { width: 40, height: 40, borderRadius: 8, flexShrink: 0 } }),
      /* @__PURE__ */ jsxs("div", { style: { flex: 1, display: "flex", flexDirection: "column", gap: 8 }, children: [
        /* @__PURE__ */ jsx("div", { className: "skeleton-box", style: { width: "40%", height: 10, borderRadius: 4 } }),
        /* @__PURE__ */ jsx("div", { className: "skeleton-box", style: { width: "90%", height: 14, borderRadius: 4 } }),
        /* @__PURE__ */ jsx("div", { className: "skeleton-box", style: { width: "75%", height: 14, borderRadius: 4 } })
      ] })
    ] }, i)) }),
    /* @__PURE__ */ jsx(AnimatePresence, { children: result && !loading && /* @__PURE__ */ jsxs(
      motion.div,
      {
        className: "ai-results",
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        children: [
          /* @__PURE__ */ jsxs("div", { className: "ai-results-header", children: [
            /* @__PURE__ */ jsxs("div", { className: "ai-results-meta", children: [
              /* @__PURE__ */ jsx(RiskBadge, { level: result.risk_level }),
              result.mock && /* @__PURE__ */ jsxs("span", { className: "mock-indicator", children: [
                /* @__PURE__ */ jsx("i", { className: "fa-solid fa-flask" }),
                " MOCK"
              ] })
            ] }),
            /* @__PURE__ */ jsxs("span", { className: "ai-timestamp", children: [
              "Generated ",
              new Date(result.generated_at).toLocaleTimeString()
            ] })
          ] }),
          /* @__PURE__ */ jsxs(
            motion.div,
            {
              className: "ai-summary-card",
              style: { "--risk-color": risk?.color },
              initial: { opacity: 0, y: 12 },
              animate: { opacity: 1, y: 0 },
              transition: { duration: 0.4 },
              children: [
                /* @__PURE__ */ jsx("div", { className: "ai-summary-icon", children: /* @__PURE__ */ jsx("i", { className: `fa-solid ${risk?.icon}`, style: { color: risk?.color } }) }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("p", { className: "ai-summary-label", children: "Summary" }),
                  /* @__PURE__ */ jsx(StreamingText, { text: result.summary })
                ] })
              ]
            }
          ),
          prefs.showInsights && visibleInsights.length > 0 && /* @__PURE__ */ jsx("div", { className: "ai-insights-grid", children: visibleInsights.map((insight, i) => /* @__PURE__ */ jsx(InsightCard, { insight, index: i }, i)) }),
          prefs.showAdvice && /* @__PURE__ */ jsxs(
            motion.div,
            {
              className: "ai-advice-card",
              initial: { opacity: 0, y: 12 },
              animate: { opacity: 1, y: 0 },
              transition: { delay: visibleInsights.length * 0.1 + 0.2, duration: 0.4 },
              children: [
                /* @__PURE__ */ jsx("i", { className: "fa-solid fa-circle-check ai-advice-icon" }),
                /* @__PURE__ */ jsx("p", { className: "ai-advice-text", children: result.advice })
              ]
            }
          )
        ]
      }
    ) }),
    !result && !loading && !error && /* @__PURE__ */ jsxs("div", { className: "ai-empty", children: [
      /* @__PURE__ */ jsx("i", { className: "fa-solid fa-brain ai-empty-icon" }),
      /* @__PURE__ */ jsxs("p", { children: [
        "Press ",
        /* @__PURE__ */ jsx("strong", { children: "Run Analysis" }),
        " to get AI-powered insights about your energy usage."
      ] })
    ] })
  ] });
}

const $$Analysis = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "AI Analysis", "data-astro-cid-xcx2albw": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="page-header" data-astro-cid-xcx2albw> <h1 data-astro-cid-xcx2albw>AI Analysis</h1> <p class="subtitle" data-astro-cid-xcx2albw>Deep energy insights powered by Gemini 1.5 Flash.</p> </section> <div class="page-body" data-astro-cid-xcx2albw> ${renderComponent($$result2, "AIAnalysis", AIAnalysis, { "client:load": true, "client:component-hydration": "load", "client:component-path": "D:/projects/ether/web/src/components/AIAnalysis", "client:component-export": "default", "data-astro-cid-xcx2albw": true })} </div> ` })} `;
}, "D:/projects/ether/web/src/pages/analysis.astro", void 0);

const $$file = "D:/projects/ether/web/src/pages/analysis.astro";
const $$url = "/analysis";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Analysis,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
