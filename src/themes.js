// Theme definitions. Each theme sets CSS variables on <html>, and the charts
// read colors from the same object so UI and charts always match.

export const THEMES = {
  light: {
    label: "Light",
    swatch: "#6366f1",
    vars: {
      "--bg": "#f8fafc",
      "--card": "#ffffff",
      "--text": "#0f172a",
      "--muted": "#64748b",
      "--border": "#e2e8f0",
      "--soft": "#f1f5f9",
      "--accent": "#6366f1",
      "--accent-soft": "#eef2ff",
      "--accent-text": "#ffffff",
      "--income": "#10b981",
      "--income-soft": "#d1fae5",
      "--expense": "#ef4444",
      "--expense-soft": "#fee2e2",
      "--shadow": "0 1px 3px rgba(0,0,0,.08)",
    },
    chart: ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#8b5cf6"],
  },
  dark: {
    label: "Dark",
    swatch: "#818cf8",
    vars: {
      "--bg": "#0b1120",
      "--card": "#151c2f",
      "--text": "#e5e7eb",
      "--muted": "#94a3b8",
      "--border": "#27324a",
      "--soft": "#1c2540",
      "--accent": "#818cf8",
      "--accent-soft": "#25305a",
      "--accent-text": "#0b1120",
      "--income": "#34d399",
      "--income-soft": "#12362d",
      "--expense": "#f87171",
      "--expense-soft": "#3b1a1f",
      "--shadow": "0 1px 3px rgba(0,0,0,.5)",
    },
    chart: ["#818cf8", "#f472b6", "#fbbf24", "#34d399", "#60a5fa", "#f87171", "#a78bfa"],
  },
  ocean: {
    label: "Ocean",
    swatch: "#0ea5e9",
    vars: {
      "--bg": "#eaf6fb",
      "--card": "#ffffff",
      "--text": "#0c2a3a",
      "--muted": "#4b6b7c",
      "--border": "#cfe6f1",
      "--soft": "#e3f1f8",
      "--accent": "#0284c7",
      "--accent-soft": "#dff1fb",
      "--accent-text": "#ffffff",
      "--income": "#059669",
      "--income-soft": "#d1fae5",
      "--expense": "#dc2626",
      "--expense-soft": "#fee2e2",
      "--shadow": "0 1px 3px rgba(2,132,199,.15)",
    },
    chart: ["#0284c7", "#06b6d4", "#14b8a6", "#6366f1", "#f59e0b", "#ec4899", "#64748b"],
  },
  forest: {
    label: "Forest",
    swatch: "#16a34a",
    vars: {
      "--bg": "#10201a",
      "--card": "#17302a",
      "--text": "#e6f4ea",
      "--muted": "#9bb8a8",
      "--border": "#25463c",
      "--soft": "#1d3b33",
      "--accent": "#4ade80",
      "--accent-soft": "#20493c",
      "--accent-text": "#0b1a14",
      "--income": "#86efac",
      "--income-soft": "#1d4a38",
      "--expense": "#fca5a5",
      "--expense-soft": "#4a2528",
      "--shadow": "0 1px 3px rgba(0,0,0,.5)",
    },
    chart: ["#4ade80", "#facc15", "#38bdf8", "#f472b6", "#fb923c", "#a78bfa", "#2dd4bf"],
  },
  sunset: {
    label: "Sunset",
    swatch: "#f97316",
    vars: {
      "--bg": "#fff7ed",
      "--card": "#ffffff",
      "--text": "#3b1d0a",
      "--muted": "#8a5a3c",
      "--border": "#fed7aa",
      "--soft": "#ffedd5",
      "--accent": "#ea580c",
      "--accent-soft": "#ffedd5",
      "--accent-text": "#ffffff",
      "--income": "#15803d",
      "--income-soft": "#dcfce7",
      "--expense": "#be123c",
      "--expense-soft": "#ffe4e6",
      "--shadow": "0 1px 3px rgba(234,88,12,.18)",
    },
    chart: ["#ea580c", "#be123c", "#ca8a04", "#15803d", "#7c3aed", "#0891b2", "#db2777"],
  },
};

export const THEME_KEY = "spendly-notes:theme";
export const DEFAULT_THEME = "light";

export function applyTheme(name) {
  const theme = THEMES[name] || THEMES[DEFAULT_THEME];
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.setAttribute("data-theme", name);
  root.style.colorScheme = name === "dark" || name === "forest" ? "dark" : "light";
}
