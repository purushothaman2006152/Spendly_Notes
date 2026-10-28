// Analytics helpers shared by the dashboard and the report exporters.

export const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n || 0);

// Plain-text money (no ₹ glyph) for PDF / TXT where fonts may not include it.
export const fmtPlain = (n) =>
  "Rs. " + new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

export const fmtCompact = (n) =>
  new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n || 0);

const pad = (n) => String(n).padStart(2, "0");

// Local calendar day key (YYYY-MM-DD). Using toISOString() would shift the day
// by the timezone offset (e.g. IST = UTC+5:30) and put bars on the wrong day.
export const dayKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};

const monthKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}`;
};

const sum = (arr) => arr.reduce((s, t) => s + t.amount, 0);

function groupByCategory(list) {
  const map = {};
  list.forEach((t) => {
    map[t.category] = map[t.category] || { value: 0, count: 0 };
    map[t.category].value += t.amount;
    map[t.category].count += 1;
  });
  const total = sum(list);
  return Object.entries(map)
    .map(([category, { value, count }]) => ({
      category,
      value,
      count,
      pct: total ? (value / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

function lastNDays(txs, n, offset = 0) {
  const days = [];
  for (let i = n - 1 + offset; i >= offset; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    const row = {
      key,
      day: d.toLocaleDateString("en-US", { weekday: "short" }),
      income: 0,
      expense: 0,
    };
    txs.forEach((t) => {
      if (dayKey(t.date) === key) row[t.type] += t.amount;
    });
    days.push(row);
  }
  return days;
}

export function summarize(txs) {
  const incomeList = txs.filter((t) => t.type === "income");
  const expenseList = txs.filter((t) => t.type === "expense");
  const income = sum(incomeList);
  const expense = sum(expenseList);
  return {
    income,
    expense,
    balance: income - expense,
    categoryBreakdown: groupByCategory(expenseList),
    days: lastNDays(txs, 7),
  };
}

export function buildReport(txs) {
  const incomeList = txs.filter((t) => t.type === "income");
  const expenseList = txs.filter((t) => t.type === "expense");
  const income = sum(incomeList);
  const expense = sum(expenseList);
  const balance = income - expense;
  const savingsRate = income > 0 ? (balance / income) * 100 : null;

  const sorted = [...txs].sort((a, b) => new Date(b.date) - new Date(a.date));
  const first = sorted.length ? new Date(sorted[sorted.length - 1].date) : null;
  const last = sorted.length ? new Date(sorted[0].date) : null;
  const spanDays = first && last ? Math.max(1, Math.round((last - first) / 86400000) + 1) : 0;

  const categories = groupByCategory(expenseList);
  const incomeSources = groupByCategory(incomeList);

  const monthMap = {};
  txs.forEach((t) => {
    const k = monthKey(t.date);
    monthMap[k] = monthMap[k] || { month: k, income: 0, expense: 0 };
    monthMap[k][t.type] += t.amount;
  });
  const monthly = Object.values(monthMap)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((m) => ({ ...m, net: m.income - m.expense }));

  const biggestExpense = expenseList.reduce((m, t) => (!m || t.amount > m.amount ? t : m), null);
  const biggestIncome = incomeList.reduce((m, t) => (!m || t.amount > m.amount ? t : m), null);

  const week = lastNDays(txs, 7);
  const prevWeek = lastNDays(txs, 7, 7);
  const weekExpense = week.reduce((s, d) => s + d.expense, 0);
  const prevWeekExpense = prevWeek.reduce((s, d) => s + d.expense, 0);

  // ---- plain-language insights ----
  const insights = [];
  if (txs.length === 0) {
    insights.push("No transactions recorded yet. Add some income and expenses to see an analysis.");
  } else {
    if (savingsRate === null) {
      insights.push("No income recorded, so a savings rate cannot be calculated.");
    } else if (savingsRate >= 20) {
      insights.push(`Healthy savings rate of ${savingsRate.toFixed(1)}%. You keep more than a fifth of your income.`);
    } else if (savingsRate >= 0) {
      insights.push(`Savings rate is ${savingsRate.toFixed(1)}%. Aim for 20% or more by trimming the largest categories.`);
    } else {
      insights.push(`You spent ${fmtPlain(Math.abs(balance))} more than you earned. Spending exceeds income.`);
    }
    if (categories.length) {
      const top = categories[0];
      insights.push(`Biggest spending category is ${top.category} at ${top.pct.toFixed(1)}% of all expenses (${fmtPlain(top.value)}).`);
    }
    if (categories.length >= 3) {
      const top3 = categories.slice(0, 3).reduce((s, c) => s + c.pct, 0);
      insights.push(`Top 3 categories make up ${top3.toFixed(1)}% of your spending.`);
    }
    if (prevWeekExpense > 0) {
      const change = ((weekExpense - prevWeekExpense) / prevWeekExpense) * 100;
      insights.push(
        change >= 0
          ? `Spending in the last 7 days is ${change.toFixed(1)}% higher than the 7 days before.`
          : `Spending in the last 7 days is ${Math.abs(change).toFixed(1)}% lower than the 7 days before.`
      );
    } else if (weekExpense > 0) {
      insights.push(`You spent ${fmtPlain(weekExpense)} in the last 7 days.`);
    }
    if (biggestExpense) {
      insights.push(`Largest single expense: ${fmtPlain(biggestExpense.amount)} on ${biggestExpense.category}.`);
    }
  }

  return {
    generatedAt: new Date(),
    period: first && last ? { from: first, to: last, days: spanDays } : null,
    counts: { total: txs.length, income: incomeList.length, expense: expenseList.length },
    totals: { income, expense, balance, savingsRate },
    averages: {
      dailyExpense: spanDays ? expense / spanDays : 0,
      perExpense: expenseList.length ? expense / expenseList.length : 0,
      perIncome: incomeList.length ? income / incomeList.length : 0,
    },
    biggestExpense,
    biggestIncome,
    categories,
    incomeSources,
    monthly,
    week,
    insights,
    transactions: sorted,
  };
}
