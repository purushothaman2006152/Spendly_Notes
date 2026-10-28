import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  Wallet, TrendingUp, TrendingDown, Trash2, Palette, Download, Printer,
  FileText, Loader2, Lightbulb,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid,
} from "recharts";
import { THEMES, THEME_KEY, DEFAULT_THEME, applyTheme } from "./themes";
import { fmt, fmtCompact, dayKey, summarize, buildReport } from "./analytics";
import { FORMATS, printReport } from "./exporters";
import "./App.css";

const STORAGE_KEY = "expense-tracker:v1";
const EXPENSE_CATS = ["Food", "Transport", "Shopping", "Bills", "Entertainment", "Health", "Other"];
const INCOME_CATS = ["Salary", "Freelance", "Investment", "Gift", "Other"];

// ---------- hooks ----------
function useTransactions() {
  const [txs, setTxs] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(txs));
    } catch { /* storage full or blocked */ }
  }, [txs]);

  const add = (tx) => setTxs((p) => [{ ...tx, id: crypto.randomUUID() }, ...p]);
  const remove = (id) => setTxs((p) => p.filter((t) => t.id !== id));
  return { txs, add, remove };
}

function useTheme() {
  const [name, setName] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      return THEMES[saved] ? saved : DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  });

  useLayoutEffect(() => {
    applyTheme(name);
    try {
      localStorage.setItem(THEME_KEY, name);
    } catch { /* ignore */ }
  }, [name]);

  return [name, setName];
}

// ---------- App ----------
export default function App() {
  const [themeName, setThemeName] = useTheme();
  const theme = THEMES[themeName];
  const { txs, add, remove } = useTransactions();
  const { income, expense, balance, categoryBreakdown, days } = useMemo(() => summarize(txs), [txs]);
  const report = useMemo(() => buildReport(txs), [txs]);

  const today = dayKey(new Date());
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today);

  const submit = (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    // today's entries keep the real time; past days are stored at noon local time
    const when = date === today ? new Date() : new Date(`${date}T12:00:00`);
    add({ type, amount: amt, category, note: note.trim(), date: when.toISOString() });
    setAmount("");
    setNote("");
  };

  const cats = type === "expense" ? EXPENSE_CATS : INCOME_CATS;
  const weekHasData = days.some((d) => d.income > 0 || d.expense > 0);

  return (
    <div className="app">
      <header>
        <div className="brand">
          <div className="logo"><Wallet size={20} /></div>
          <h1>Spendly Notes</h1>
        </div>
        <ThemePicker value={themeName} onChange={setThemeName} />
      </header>

      <section className="stats">
        <Stat label="Balance" value={fmt(balance)} icon={<Wallet />} />
        <Stat label="Income" value={fmt(income)} icon={<TrendingUp />} tone="income" />
        <Stat label="Expense" value={fmt(expense)} icon={<TrendingDown />} tone="expense" />
      </section>

      <section className="grid">
        <form onSubmit={submit} className="card">
          <h3>Add Transaction</h3>
          <div className="tabs">
            <button type="button" className={type === "expense" ? "on" : ""}
              onClick={() => { setType("expense"); setCategory(EXPENSE_CATS[0]); }}>Expense</button>
            <button type="button" className={type === "income" ? "on" : ""}
              onClick={() => { setType("income"); setCategory(INCOME_CATS[0]); }}>Income</button>
          </div>
          <input type="number" step="0.01" min="0" inputMode="decimal" placeholder="Amount"
            aria-label="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          <select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {cats.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input type="date" aria-label="Date" max={today} value={date}
            onChange={(e) => setDate(e.target.value || today)} />
          <input placeholder="Note (optional)" aria-label="Note" value={note}
            onChange={(e) => setNote(e.target.value)} />
          <button type="submit" className="primary">Add</button>
        </form>

        <div className="card">
          <h3>Last 7 days</h3>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={days} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4} barCategoryGap="22%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.vars["--border"]} />
                <XAxis dataKey="day" tickLine={false} axisLine={{ stroke: theme.vars["--border"] }}
                  tick={{ fill: theme.vars["--muted"], fontSize: 12 }} />
                <YAxis width={48} tickLine={false} axisLine={false} allowDecimals={false}
                  tickFormatter={fmtCompact} tick={{ fill: theme.vars["--muted"], fontSize: 12 }} />
                <Tooltip
                  formatter={(v, n) => [fmt(v), n === "income" ? "Income" : "Expense"]}
                  cursor={{ fill: theme.vars["--soft"] }}
                  contentStyle={{
                    background: theme.vars["--card"], border: `1px solid ${theme.vars["--border"]}`,
                    borderRadius: 8, color: theme.vars["--text"],
                  }}
                  labelStyle={{ color: theme.vars["--text"], fontWeight: 600 }}
                  itemStyle={{ color: theme.vars["--text"] }}
                />
                <Bar dataKey="income" name="income" fill={theme.vars["--income"]} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="expense" name="expense" fill={theme.vars["--expense"]} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
            {!weekHasData && <p className="chart-empty">No activity in the last 7 days</p>}
          </div>
          <div className="legend-inline">
            <span><i style={{ background: theme.vars["--income"] }} />Income</span>
            <span><i style={{ background: theme.vars["--expense"] }} />Expense</span>
          </div>
        </div>

        <div className="card">
          <h3>Spending by Category</h3>
          {categoryBreakdown.length === 0 ? <p className="muted">No expenses yet</p> : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={categoryBreakdown} dataKey="value" nameKey="category"
                    innerRadius={48} outerRadius={95} paddingAngle={2} stroke={theme.vars["--card"]} strokeWidth={2}
                    labelLine={false} label={(p) => <PieLabel {...p} color={theme.vars["--accent-text"]} />}>
                    {categoryBreakdown.map((c, i) => (
                      <Cell key={c.category} fill={theme.chart[i % theme.chart.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v, n) => [fmt(v), n]}
                    contentStyle={{
                      background: theme.vars["--card"], border: `1px solid ${theme.vars["--border"]}`,
                      borderRadius: 8, color: theme.vars["--text"],
                    }}
                    itemStyle={{ color: theme.vars["--text"] }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <ul className="pie-legend">
                {categoryBreakdown.map((c, i) => (
                  <li key={c.category}>
                    <i style={{ background: theme.chart[i % theme.chart.length] }} />
                    <span className="name">{c.category}</span>
                    <span className="val">{fmt(c.value)}</span>
                    <span className="pct">{c.pct.toFixed(1)}%</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      <AnalysisReport report={report} hasData={txs.length > 0} />

      <section className="card">
        <h3>Recent Transactions</h3>
        {txs.length === 0 ? <p className="muted">No transactions yet</p> : (
          <ul className="list">
            {txs.map((t) => (
              <li key={t.id}>
                <div>
                  <strong>{t.category}</strong>
                  <small>{t.note || "—"} · {new Date(t.date).toLocaleDateString("en-IN")}</small>
                </div>
                <span className={t.type}>{t.type === "expense" ? "-" : "+"}{fmt(t.amount)}</span>
                <button onClick={() => remove(t.id)} aria-label={`Delete ${t.category} transaction`}><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="foot">
        <p>© {new Date().getFullYear()} Spendly Notes. All Rights Reserved.</p>
        <p>Built with ❤️ by Purushothaman E</p>
        <nav>
          <a href="/privacy-policy.html">Privacy Policy</a>
          <a href="/terms.html">Terms of Service</a>
          <a href="/disclaimer.html">Disclaimer</a>
        </nav>
      </footer>
    </div>
  );
}

// ---------- pieces ----------
const RAD = Math.PI / 180;

// Percent label drawn inside each slice so it never gets clipped outside the chart.
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, color }) {
  if (percent < 0.05) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RAD);
  const y = cy + r * Math.sin(-midAngle * RAD);
  return (
    <text x={x} y={y} fill={color} textAnchor="middle" dominantBaseline="central"
      fontSize={12} fontWeight={700} style={{ pointerEvents: "none" }}>
      {`${Math.round(percent * 100)}%`}
    </text>
  );
}

function ThemePicker({ value, onChange }) {
  return (
    <div className="theme-picker" role="group" aria-label="Theme">
      <Palette size={16} aria-hidden="true" />
      {Object.entries(THEMES).map(([id, t]) => (
        <button key={id} type="button" className={value === id ? "on" : ""}
          aria-pressed={value === id} title={`${t.label} theme`} onClick={() => onChange(id)}>
          <i style={{ background: t.swatch }} />
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

function AnalysisReport({ report, hasData }) {
  const [busy, setBusy] = useState(null);
  const [status, setStatus] = useState(null);

  const run = async (f) => {
    setBusy(f.id);
    setStatus(null);
    try {
      await f.run(report);
      setStatus({ ok: true, text: `${f.label} report downloaded.` });
    } catch (err) {
      console.error(err);
      setStatus({ ok: false, text: `Could not create the ${f.label} report. Please try again.` });
    } finally {
      setBusy(null);
    }
  };

  const print = () => {
    if (!printReport(report)) setStatus({ ok: false, text: "Pop-up blocked. Allow pop-ups to print the report." });
  };

  const { totals, averages, categories, biggestExpense } = report;

  return (
    <section className="card report">
      <h3><FileText size={16} /> Analysis Report</h3>

      <div className="kpis">
        <div><small>Savings rate</small>
          <strong>{totals.savingsRate === null ? "N/A" : `${totals.savingsRate.toFixed(1)}%`}</strong></div>
        <div><small>Avg daily spend</small><strong>{fmt(averages.dailyExpense)}</strong></div>
        <div><small>Top category</small><strong>{categories[0]?.category || "N/A"}</strong></div>
        <div><small>Largest expense</small><strong>{biggestExpense ? fmt(biggestExpense.amount) : "N/A"}</strong></div>
      </div>

      <h4><Lightbulb size={14} /> Insights</h4>
      <ul className="insights">
        {report.insights.map((i) => <li key={i}>{i}</li>)}
      </ul>

      <h4><Download size={14} /> Download report</h4>
      <div className="exports">
        {FORMATS.map((f) => (
          <button key={f.id} type="button" disabled={!hasData || busy !== null} onClick={() => run(f)}>
            {busy === f.id ? <Loader2 size={15} className="spin" /> : <Download size={15} />}
            <span>{f.label}</span><small>{f.ext}</small>
          </button>
        ))}
        <button type="button" disabled={!hasData || busy !== null} onClick={print}>
          <Printer size={15} /><span>Print</span><small>dialog</small>
        </button>
      </div>
      {!hasData && <p className="muted">Add a transaction to enable report downloads.</p>}
      {status && <p className={status.ok ? "status ok" : "status err"} role="status">{status.text}</p>}
    </section>
  );
}

function Stat({ label, value, icon, tone }) {
  return (
    <div className={`stat ${tone || ""}`}>
      <div className="stat-icon">{icon}</div>
      <div><small>{label}</small><strong>{value}</strong></div>
    </div>
  );
}
