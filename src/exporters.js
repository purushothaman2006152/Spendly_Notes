// Report exporters: PDF, Excel, CSV, JSON, HTML, Word, Markdown, Text.
// Heavy libraries (jsPDF, ExcelJS) are loaded on demand so the app stays fast.

import { fmtPlain, dayKey } from "./analytics";

const stamp = () => dayKey(new Date());
const fileName = (ext) => `spendly-report-${stamp()}.${ext}`;
const dateText = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const monthText = (m) => {
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
};
const pct = (n) => `${(n || 0).toFixed(1)}%`;
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

const periodText = (r) =>
  r.period ? `${dateText(r.period.from)} to ${dateText(r.period.to)} (${r.period.days} days)` : "No data";

function summaryRows(r) {
  return [
    ["Total income", fmtPlain(r.totals.income)],
    ["Total expense", fmtPlain(r.totals.expense)],
    ["Balance", fmtPlain(r.totals.balance)],
    ["Savings rate", r.totals.savingsRate === null ? "N/A" : pct(r.totals.savingsRate)],
    ["Transactions", `${r.counts.total} (${r.counts.income} income, ${r.counts.expense} expense)`],
    ["Average daily expense", fmtPlain(r.averages.dailyExpense)],
    ["Average per expense", fmtPlain(r.averages.perExpense)],
    ["Largest expense", r.biggestExpense ? `${fmtPlain(r.biggestExpense.amount)} (${r.biggestExpense.category})` : "N/A"],
    ["Largest income", r.biggestIncome ? `${fmtPlain(r.biggestIncome.amount)} (${r.biggestIncome.category})` : "N/A"],
  ];
}

// ---------------------------------------------------------------- JSON
export function exportJSON(r) {
  const data = {
    app: "Spendly Notes",
    generatedAt: r.generatedAt.toISOString(),
    period: r.period && { from: r.period.from, to: r.period.to, days: r.period.days },
    counts: r.counts,
    totals: r.totals,
    averages: r.averages,
    biggestExpense: r.biggestExpense,
    biggestIncome: r.biggestIncome,
    expenseByCategory: r.categories,
    incomeBySource: r.incomeSources,
    monthly: r.monthly,
    last7Days: r.week.map(({ key, day, income, expense }) => ({ date: key, day, income, expense })),
    insights: r.insights,
    transactions: r.transactions,
  };
  download(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), fileName("json"));
}

// ---------------------------------------------------------------- CSV
const csvCell = (v) => {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csvRow = (cells) => cells.map(csvCell).join(",");

export function exportCSV(r) {
  const lines = [];
  lines.push(csvRow(["Spendly Notes - Analysis Report"]));
  lines.push(csvRow(["Generated", r.generatedAt.toLocaleString("en-IN")]));
  lines.push(csvRow(["Period", periodText(r)]));
  lines.push("");
  lines.push(csvRow(["SUMMARY"]));
  summaryRows(r).forEach((row) => lines.push(csvRow(row)));
  lines.push("");
  lines.push(csvRow(["EXPENSE BY CATEGORY"]));
  lines.push(csvRow(["Category", "Amount", "Share %", "Transactions"]));
  r.categories.forEach((c) => lines.push(csvRow([c.category, c.value.toFixed(2), c.pct.toFixed(1), c.count])));
  lines.push("");
  lines.push(csvRow(["MONTHLY TREND"]));
  lines.push(csvRow(["Month", "Income", "Expense", "Net"]));
  r.monthly.forEach((m) => lines.push(csvRow([monthText(m.month), m.income.toFixed(2), m.expense.toFixed(2), m.net.toFixed(2)])));
  lines.push("");
  lines.push(csvRow(["INSIGHTS"]));
  r.insights.forEach((i) => lines.push(csvRow([i])));
  lines.push("");
  lines.push(csvRow(["TRANSACTIONS"]));
  lines.push(csvRow(["Date", "Type", "Category", "Amount", "Note"]));
  r.transactions.forEach((t) => lines.push(csvRow([dayKey(t.date), t.type, t.category, t.amount.toFixed(2), t.note || ""])));
  // BOM so Excel opens UTF-8 correctly
  download(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), fileName("csv"));
}

// ---------------------------------------------------------------- Markdown / Text
function mdTable(head, rows) {
  const line = (cells) => `| ${cells.join(" | ")} |`;
  return [line(head), line(head.map(() => "---")), ...rows.map(line)].join("\n");
}

function buildMarkdown(r) {
  const out = [];
  out.push("# Spendly Notes - Analysis Report", "");
  out.push(`Generated: ${r.generatedAt.toLocaleString("en-IN")}  `);
  out.push(`Period: ${periodText(r)}`, "");
  out.push("## Summary", "", mdTable(["Metric", "Value"], summaryRows(r)), "");
  out.push("## Insights", "", ...r.insights.map((i) => `- ${i}`), "");
  if (r.categories.length) {
    out.push(
      "## Expense by category", "",
      mdTable(["Category", "Amount", "Share", "Count"], r.categories.map((c) => [c.category, fmtPlain(c.value), pct(c.pct), c.count])),
      ""
    );
  }
  if (r.monthly.length) {
    out.push(
      "## Monthly trend", "",
      mdTable(["Month", "Income", "Expense", "Net"], r.monthly.map((m) => [monthText(m.month), fmtPlain(m.income), fmtPlain(m.expense), fmtPlain(m.net)])),
      ""
    );
  }
  if (r.transactions.length) {
    out.push(
      "## Transactions", "",
      mdTable(["Date", "Type", "Category", "Amount", "Note"], r.transactions.map((t) => [dateText(t.date), t.type, t.category, fmtPlain(t.amount), t.note || "-"])),
      ""
    );
  }
  return out.join("\n");
}

export function exportMarkdown(r) {
  download(new Blob([buildMarkdown(r)], { type: "text/markdown;charset=utf-8" }), fileName("md"));
}

export function exportText(r) {
  const out = [];
  const rule = "=".repeat(60);
  out.push(rule, "SPENDLY NOTES - ANALYSIS REPORT", rule);
  out.push(`Generated : ${r.generatedAt.toLocaleString("en-IN")}`);
  out.push(`Period    : ${periodText(r)}`, "");
  out.push("SUMMARY", "-".repeat(60));
  summaryRows(r).forEach(([k, v]) => out.push(`${k.padEnd(24)} ${v}`));
  out.push("", "INSIGHTS", "-".repeat(60));
  r.insights.forEach((i) => out.push(`* ${i}`));
  if (r.categories.length) {
    out.push("", "EXPENSE BY CATEGORY", "-".repeat(60));
    r.categories.forEach((c) => out.push(`${c.category.padEnd(16)} ${fmtPlain(c.value).padStart(16)} ${pct(c.pct).padStart(8)}  (${c.count})`));
  }
  if (r.monthly.length) {
    out.push("", "MONTHLY TREND", "-".repeat(60));
    r.monthly.forEach((m) => out.push(`${monthText(m.month).padEnd(12)} in ${fmtPlain(m.income).padStart(14)}  out ${fmtPlain(m.expense).padStart(14)}  net ${fmtPlain(m.net).padStart(14)}`));
  }
  if (r.transactions.length) {
    out.push("", "TRANSACTIONS", "-".repeat(60));
    r.transactions.forEach((t) =>
      out.push(`${dayKey(t.date)}  ${t.type.padEnd(7)} ${t.category.padEnd(14)} ${fmtPlain(t.amount).padStart(14)}  ${t.note || ""}`)
    );
  }
  download(new Blob([out.join("\n")], { type: "text/plain;charset=utf-8" }), fileName("txt"));
}

// ---------------------------------------------------------------- HTML / Word
function buildHtml(r, { forWord = false } = {}) {
  const maxCat = r.categories.length ? r.categories[0].value : 1;
  const kv = summaryRows(r).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("");
  const cats = r.categories
    .map(
      (c) => `<tr><td>${esc(c.category)}</td><td class="n">${esc(fmtPlain(c.value))}</td><td class="n">${pct(c.pct)}</td><td class="n">${c.count}</td>
        <td class="barcell"><div class="bar" style="width:${Math.max(2, (c.value / maxCat) * 100).toFixed(0)}%"></div></td></tr>`
    )
    .join("");
  const months = r.monthly
    .map((m) => `<tr><td>${monthText(m.month)}</td><td class="n">${esc(fmtPlain(m.income))}</td><td class="n">${esc(fmtPlain(m.expense))}</td><td class="n ${m.net < 0 ? "neg" : "pos"}">${esc(fmtPlain(m.net))}</td></tr>`)
    .join("");
  const txs = r.transactions
    .map((t) => `<tr><td>${dateText(t.date)}</td><td>${t.type}</td><td>${esc(t.category)}</td><td class="n ${t.type === "expense" ? "neg" : "pos"}">${esc(fmtPlain(t.amount))}</td><td>${esc(t.note || "-")}</td></tr>`)
    .join("");

  const wordNs = forWord
    ? ' xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"'
    : "";

  return `<!DOCTYPE html>
<html lang="en"${wordNs}>
<head>
<meta charset="utf-8">
<title>Spendly Notes - Analysis Report</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 32px; line-height: 1.45; }
  h1 { margin: 0 0 4px; font-size: 24px; color: #4f46e5; }
  h2 { font-size: 16px; margin: 28px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #e2e8f0; }
  .meta { color: #64748b; font-size: 13px; margin-bottom: 8px; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  th, td { border: 1px solid #e2e8f0; padding: 6px 10px; text-align: left; }
  thead th { background: #eef2ff; }
  table.kv th { width: 35%; background: #f8fafc; }
  .n { text-align: right; white-space: nowrap; }
  .pos { color: #059669; } .neg { color: #dc2626; }
  .barcell { width: 30%; } .bar { height: 10px; background: #6366f1; border-radius: 3px; }
  ul { padding-left: 20px; } li { margin-bottom: 4px; }
  .foot { margin-top: 32px; color: #94a3b8; font-size: 12px; text-align: center; }
  @media print { body { margin: 14mm; } h2 { break-after: avoid; } tr { break-inside: avoid; } }
</style>
</head>
<body>
<h1>Spendly Notes - Analysis Report</h1>
<div class="meta">Generated ${esc(r.generatedAt.toLocaleString("en-IN"))} &middot; Period: ${esc(periodText(r))}</div>

<h2>Summary</h2>
<table class="kv"><tbody>${kv}</tbody></table>

<h2>Insights</h2>
<ul>${r.insights.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>

${r.categories.length ? `<h2>Expense by category</h2>
<table><thead><tr><th>Category</th><th class="n">Amount</th><th class="n">Share</th><th class="n">Count</th><th></th></tr></thead><tbody>${cats}</tbody></table>` : ""}

${r.monthly.length ? `<h2>Monthly trend</h2>
<table><thead><tr><th>Month</th><th class="n">Income</th><th class="n">Expense</th><th class="n">Net</th></tr></thead><tbody>${months}</tbody></table>` : ""}

${r.transactions.length ? `<h2>All transactions</h2>
<table><thead><tr><th>Date</th><th>Type</th><th>Category</th><th class="n">Amount</th><th>Note</th></tr></thead><tbody>${txs}</tbody></table>` : ""}

<div class="foot">&copy; ${new Date().getFullYear()} Spendly Notes &middot; Built by Purushothaman E</div>
</body>
</html>`;
}

export function exportHTML(r) {
  download(new Blob([buildHtml(r)], { type: "text/html;charset=utf-8" }), fileName("html"));
}

// Word opens HTML with the Office namespaces as an editable document.
export function exportWord(r) {
  download(new Blob(["﻿", buildHtml(r, { forWord: true })], { type: "application/msword" }), fileName("doc"));
}

// ---------------------------------------------------------------- Excel
export async function exportExcel(r) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Spendly Notes";
  wb.created = new Date();

  const headStyle = (row) => {
    row.font = { bold: true, color: { argb: "FFFFFFFF" } };
    row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
  };
  const money = '"Rs." #,##0.00';

  // Summary
  const s = wb.addWorksheet("Summary");
  s.columns = [{ width: 28 }, { width: 46 }];
  s.addRow(["Spendly Notes - Analysis Report"]).font = { bold: true, size: 16 };
  s.addRow(["Generated", r.generatedAt.toLocaleString("en-IN")]);
  s.addRow(["Period", periodText(r)]);
  s.addRow([]);
  headStyle(s.addRow(["Metric", "Value"]));
  summaryRows(r).forEach((row) => s.addRow(row));
  s.addRow([]);
  headStyle(s.addRow(["Insights", ""]));
  r.insights.forEach((i) => {
    const row = s.addRow([i]);
    s.mergeCells(`A${row.number}:B${row.number}`);
    row.alignment = { wrapText: true, vertical: "top" };
    row.height = 30;
  });

  // Categories
  const c = wb.addWorksheet("Categories");
  c.columns = [
    { header: "Category", key: "category", width: 20 },
    { header: "Amount", key: "value", width: 16, style: { numFmt: money } },
    { header: "Share %", key: "pct", width: 12, style: { numFmt: "0.0" } },
    { header: "Transactions", key: "count", width: 14 },
  ];
  headStyle(c.getRow(1));
  r.categories.forEach((x) => c.addRow(x));

  // Monthly
  const m = wb.addWorksheet("Monthly");
  m.columns = [
    { header: "Month", key: "month", width: 14 },
    { header: "Income", key: "income", width: 16, style: { numFmt: money } },
    { header: "Expense", key: "expense", width: 16, style: { numFmt: money } },
    { header: "Net", key: "net", width: 16, style: { numFmt: money } },
  ];
  headStyle(m.getRow(1));
  r.monthly.forEach((x) => m.addRow({ ...x, month: monthText(x.month) }));

  // Transactions
  const t = wb.addWorksheet("Transactions");
  t.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Type", key: "type", width: 10 },
    { header: "Category", key: "category", width: 16 },
    { header: "Amount", key: "amount", width: 16, style: { numFmt: money } },
    { header: "Note", key: "note", width: 40 },
  ];
  headStyle(t.getRow(1));
  t.views = [{ state: "frozen", ySplit: 1 }];
  r.transactions.forEach((x) => t.addRow({ date: new Date(x.date), type: x.type, category: x.category, amount: x.amount, note: x.note || "" }));
  t.getColumn("date").numFmt = "dd-mmm-yyyy";
  if (r.transactions.length) t.autoFilter = { from: "A1", to: "E1" };

  const buf = await wb.xlsx.writeBuffer();
  download(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    fileName("xlsx")
  );
}

// ---------------------------------------------------------------- PDF
export async function exportPDF(r) {
  const [{ jsPDF }, autoTableMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const autoTable = autoTableMod.default || autoTableMod.autoTable;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  const indigo = [79, 70, 229];

  doc.setFillColor(...indigo);
  doc.rect(0, 0, W, 70, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Spendly Notes - Analysis Report", M, 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Generated ${r.generatedAt.toLocaleString("en-IN")}   |   Period: ${periodText(r)}`, M, 55);
  doc.setTextColor(15, 23, 42);

  let y = 95;
  const heading = (text) => {
    if (y > 740) { doc.addPage(); y = 50; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(text, M, y);
    y += 8;
  };
  const common = { margin: { left: M, right: M }, styles: { fontSize: 9, cellPadding: 5 }, headStyles: { fillColor: indigo } };
  // right-align header cells of numeric columns so they line up with their numbers
  const alignHead = (...cols) => (d) => {
    if (d.section === "head" && cols.includes(d.column.index)) d.cell.styles.halign = "right";
  };
  const after = () => { y = doc.lastAutoTable.finalY + 24; };

  heading("Summary");
  autoTable(doc, { ...common, startY: y, head: [["Metric", "Value"]], body: summaryRows(r), columnStyles: { 0: { fontStyle: "bold", cellWidth: 170 } } });
  after();

  heading("Insights");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y += 14;
  r.insights.forEach((i) => {
    const lines = doc.splitTextToSize(`• ${i}`, W - M * 2);
    if (y + lines.length * 13 > 790) { doc.addPage(); y = 50; }
    doc.text(lines, M, y);
    y += lines.length * 13 + 3;
  });
  y += 12;

  if (r.categories.length) {
    heading("Expense by category");
    autoTable(doc, {
      ...common, startY: y,
      head: [["Category", "Amount", "Share", "Transactions"]],
      body: r.categories.map((c) => [c.category, fmtPlain(c.value), pct(c.pct), c.count]),
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
      didParseCell: alignHead(1, 2, 3),
    });
    after();
  }

  if (r.monthly.length) {
    heading("Monthly trend");
    autoTable(doc, {
      ...common, startY: y,
      head: [["Month", "Income", "Expense", "Net"]],
      body: r.monthly.map((m) => [monthText(m.month), fmtPlain(m.income), fmtPlain(m.expense), fmtPlain(m.net)]),
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
      didParseCell: alignHead(1, 2, 3),
    });
    after();
  }

  if (r.transactions.length) {
    heading("All transactions");
    autoTable(doc, {
      ...common, startY: y,
      head: [["Date", "Type", "Category", "Amount", "Note"]],
      body: r.transactions.map((t) => [dateText(t.date), t.type, t.category, fmtPlain(t.amount), t.note || "-"]),
      columnStyles: { 3: { halign: "right" } },
      didParseCell: (d) => {
        alignHead(3)(d);
        if (d.section === "body" && d.column.index === 3) {
          d.cell.styles.textColor = d.row.raw[1] === "expense" ? [220, 38, 38] : [5, 150, 105];
        }
      },
    });
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Spendly Notes  |  Page ${i} of ${pages}`, W / 2, 825, { align: "center" });
  }

  doc.save(fileName("pdf"));
}

// Opens the browser print dialog with the HTML report (Save as PDF also works).
export function printReport(r) {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.open();
  w.document.write(buildHtml(r));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
  return true;
}

export const FORMATS = [
  { id: "pdf", label: "PDF", ext: ".pdf", run: exportPDF },
  { id: "xlsx", label: "Excel", ext: ".xlsx", run: exportExcel },
  { id: "csv", label: "CSV", ext: ".csv", run: exportCSV },
  { id: "json", label: "JSON", ext: ".json", run: exportJSON },
  { id: "html", label: "HTML", ext: ".html", run: exportHTML },
  { id: "doc", label: "Word", ext: ".doc", run: exportWord },
  { id: "md", label: "Markdown", ext: ".md", run: exportMarkdown },
  { id: "txt", label: "Text", ext: ".txt", run: exportText },
];
