import { useEffect, useState } from "react";
import { Wallet, TrendingUp, TrendingDown, Trash2 } from "lucide-react";
import {                                                        BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid,
} from "recharts";
import "./App.css";

const STORAGE_KEY = "expense-tracker:v1";                     const EXPENSE_CATS = ["Food", "Transport", "Shopping", "Bills", "Entertainment", "Health", "Other"];
const INCOME_CATS = ["Salary", "Freelance", "Investment", "Gift", "Other"];                                                 const COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#8b5cf6"];

const fmt = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

// ---------- localStorage hook ----------
function useTransactions() {
  const [txs, setTxs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(txs));
  }, [txs]);

  const add = (tx) => setTxs((p) => [{ ...tx, id: crypto.randomUUID() }, ...p]);
  const remove = (id) => setTxs((p) => p.filter((t) => t.id !== id));
  return { txs, add, remove };
}

// ---------- analytics ----------
function summarize(txs) {
  const income = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const byCat = {};
  txs.filter((t) => t.type === "expense").forEach((t) => {
    byCat[t.category] = (byCat[t.category] || 0) + t.amount;
  });
  const categoryBreakdown = Object.entries(byCat)
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value);

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const day = { day: d.toLocaleDateString("en-US", { weekday: "short" }), income: 0, expense: 0 };
    txs.forEach((t) => {
      if (t.date.slice(0, 10) === key) day[t.type] += t.amount;
    });
    days.push(day);
  }
  return { income, expense, balance: income - expense, categoryBreakdown, days };
}

// ---------- App ----------
export default function App() {
  const { txs, add, remove } = useTransactions();
  const { income, expense, balance, categoryBreakdown, days } = summarize(txs);

  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [note, setNote] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    add({ type, amount: amt, category, note, date: new Date().toISOString() });
    setAmount(""); setNote("");
  };

  const cats = type === "expense" ? EXPENSE_CATS : INCOME_CATS;

  return (
    <div className="app">
      <header>
        <div className="logo"><Wallet size={20} /></div>
        <h1>Spendly Notes</h1>
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
          <input type="number" step="0.01" placeholder="Amount"
            value={amount} onChange={(e) => setAmount(e.target.value)} required />
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {cats.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <button type="submit" className="primary">Add</button>
        </form>

        <div className="card">
          <h3>Last 7 days</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={days}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" /><YAxis />
              <Tooltip formatter={fmt} /><Legend />
              <Bar dataKey="income" fill="#10b981" />
              <Bar dataKey="expense" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3>Spending by Category</h3>
          {categoryBreakdown.length === 0 ? <p className="muted">No expenses yet</p> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={categoryBreakdown} dataKey="value" nameKey="category"
                  outerRadius={80} label={(d) => d.category}>
                  {categoryBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={fmt} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="card">
        <h3>Recent Transactions</h3>
        {txs.length === 0 ? <p className="muted">No transactions yet</p> : (
          <ul className="list">
            {txs.map((t) => (
              <li key={t.id}>
                <div>
                  <strong>{t.category}</strong>
                  <small>{t.note || "—"} · {new Date(t.date).toLocaleDateString()}</small>
                </div>
                <span className={t.type}>{t.type === "expense" ? "-" : "+"}{fmt(t.amount)}</span>
                <button onClick={() => remove(t.id)} aria-label="Delete"><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
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
