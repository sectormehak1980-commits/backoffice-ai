// Pure forecasting helpers for BackOffice AI. No React, no localStorage.
// Dates are "yyyy-mm-dd" strings. They are parsed as LOCAL midnight Dates so
// day arithmetic does not drift across timezones.
//
// Cash model assumptions:
// - Cash in hand = startingCash + paid invoice amounts − paid bill amounts.
// - An unpaid invoice is expected on max(dueDate, referenceDate), plus any
//   delay override for that invoice id.
// - A bill recurs monthly from nextDueDate. If nextDueDate is already past,
//   the first occurrence is treated as due on referenceDate.
// - Bills flagged paid are already reflected in cash in hand, so they are not
//   re-counted here.

const DAY_MS = 86400000;

const pad = (n) => String(n).padStart(2, "0");

export function parseISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISO(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(iso, n) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

// Keeps the day of month, clamped to the last day of the target month.
export function addMonths(iso, n) {
  const [y, m, day] = iso.split("-").map(Number);
  const first = new Date(y, m - 1 + n, 1);
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  first.setDate(Math.min(day, lastDay));
  return toISO(first);
}

// B minus A, in whole days.
export function daysBetween(isoA, isoB) {
  return Math.round((parseISO(isoB) - parseISO(isoA)) / DAY_MS);
}

const isPaid = (invoice) => invoice.status === "Paid";

export function daysOverdue(invoice, referenceDate) {
  if (isPaid(invoice) || invoice.dueDate >= referenceDate) return 0;
  return daysBetween(invoice.dueDate, referenceDate);
}

export function effectiveStatus(invoice, referenceDate) {
  if (isPaid(invoice)) return "Paid";
  if (invoice.dueDate < referenceDate) return "Overdue";
  return "Pending";
}

export function invoiceOutstanding(invoice) {
  return isPaid(invoice) ? 0 : Number(invoice.amount) || 0;
}

const sum = (values) => values.reduce((total, v) => total + v, 0);

// Opening cash plus paid invoices, minus paid bills.
export function cashInHand(state) {
  const paidIn = sum(state.invoices.filter(isPaid).map((i) => Number(i.amount) || 0));
  const paidOut = sum(state.bills.filter((b) => b.paid).map((b) => Number(b.amount) || 0));
  return (Number(state.settings.startingCash) || 0) + paidIn - paidOut;
}

// Expected payment date for an unpaid invoice, with optional delay override.
function expectedPaymentDate(invoice, referenceDate, overrides) {
  const base = invoice.dueDate > referenceDate ? invoice.dueDate : referenceDate;
  const delay = overrides?.delayByInvoiceId?.[invoice.id] || 0;
  return delay ? addDays(base, delay) : base;
}

// Bill occurrences from nextDueDate, then +1, +2, ... months, up to endDate.
function billOccurrences(bill, referenceDate, endDate) {
  const out = [];
  for (let k = 0; ; k++) {
    const d = addMonths(bill.nextDueDate, k);
    if (d > endDate) break;
    if (d < referenceDate) {
      if (k === 0) out.push(referenceDate);
      continue;
    }
    out.push(d);
  }
  return out;
}

/**
 * Summary figures for the dashboard.
 * - cashInHand: see cashInHand().
 * - totalOwed: outstanding amount on all unpaid invoices (overdue + pending).
 * - overdueTotal: outstanding amount on unpaid invoices past due.
 * - collectedThisMonth: paid invoices whose paidDate is in the reference month.
 * - next30NetCash: expected incoming minus bill outflows over the 30-day
 *   forecast window that starts on referenceDate (inclusive, 31 days).
 */
export function computeSummary(state, referenceDate) {
  const ref = referenceDate ?? state.settings.referenceDate;
  const unpaid = state.invoices.filter((i) => !isPaid(i));

  const totalOwed = sum(unpaid.map(invoiceOutstanding));
  const overdueTotal = sum(
    unpaid.filter((i) => effectiveStatus(i, ref) === "Overdue").map(invoiceOutstanding)
  );
  const collectedThisMonth = sum(
    state.invoices
      .filter((i) => isPaid(i) && i.paidDate && i.paidDate.slice(0, 7) === ref.slice(0, 7))
      .map((i) => Number(i.amount) || 0)
  );
  const window = buildForecast({ state, horizonDays: 30, referenceDate: ref });
  const next30NetCash = sum(window.map((d) => d.incoming - d.outgoing));

  return {
    cashInHand: cashInHand(state),
    totalOwed,
    overdueTotal,
    collectedThisMonth,
    next30NetCash,
  };
}

/**
 * Day-by-day cash forecast from referenceDate through referenceDate+horizonDays.
 * Returns [{ date, dayIndex, incoming, outgoing, balance }].
 * balance starts at cashInHand and includes that day's incoming and outgoing.
 * overrides: { delayByInvoiceId: { [invoiceId]: days } }.
 */
export function buildForecast({ state, horizonDays = 30, referenceDate, overrides } = {}) {
  const ref = referenceDate ?? state.settings.referenceDate;
  const end = addDays(ref, horizonDays);

  const incomingByDate = {};
  for (const invoice of state.invoices) {
    if (isPaid(invoice)) continue;
    const date = expectedPaymentDate(invoice, ref, overrides);
    if (date > end) continue;
    incomingByDate[date] = (incomingByDate[date] || 0) + invoiceOutstanding(invoice);
  }

  const outgoingByDate = {};
  for (const bill of state.bills) {
    for (const date of billOccurrences(bill, ref, end)) {
      outgoingByDate[date] = (outgoingByDate[date] || 0) + (Number(bill.amount) || 0);
    }
  }

  let balance = cashInHand(state);
  const rows = [];
  for (let i = 0; i <= horizonDays; i++) {
    const date = addDays(ref, i);
    const incoming = incomingByDate[date] || 0;
    const outgoing = outgoingByDate[date] || 0;
    balance += incoming - outgoing;
    rows.push({ date, dayIndex: i, incoming, outgoing, balance });
  }
  return rows;
}

// First day where balance is negative, as { date, shortfall }, or null.
export function findCashCrunch(forecast) {
  for (const row of forecast) {
    if (row.balance < 0) return { date: row.date, shortfall: -row.balance };
  }
  return null;
}

/**
 * Which invoices to chase to cover the worst forecast shortfall.
 * Order: overdue by daysOverdue desc, then pending by dueDate asc.
 * Returns the shortest prefix of that order whose cumulative amount covers
 * shortfallAmount = max(0, -minimum forecast balance).
 */
export function chaseRecommendations({ state, referenceDate, horizonDays = 30 } = {}) {
  const ref = referenceDate ?? state.settings.referenceDate;
  const forecast = buildForecast({ state, horizonDays, referenceDate: ref });
  const minBalance = Math.min(...forecast.map((d) => d.balance));
  const shortfallAmount = Math.max(0, -minBalance);

  if (shortfallAmount === 0) {
    return { invoicesToChase: [], coversShortfall: true, shortfallAmount: 0 };
  }

  const unpaid = state.invoices.filter((i) => !isPaid(i));
  const overdue = unpaid
    .filter((i) => effectiveStatus(i, ref) === "Overdue")
    .sort((a, b) => daysOverdue(b, ref) - daysOverdue(a, ref));
  const pending = unpaid
    .filter((i) => effectiveStatus(i, ref) === "Pending")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const ordered = [...overdue, ...pending];

  const invoicesToChase = [];
  let cumulative = 0;
  for (const invoice of ordered) {
    if (cumulative >= shortfallAmount) break;
    const amount = invoiceOutstanding(invoice);
    cumulative += amount;
    const student = state.students.find((s) => s.id === invoice.studentId);
    invoicesToChase.push({
      invoice,
      studentName: student ? student.name : "Unknown",
      amount,
      daysOverdue: daysOverdue(invoice, ref),
      cumulative,
    });
  }

  return {
    invoicesToChase,
    coversShortfall: cumulative >= shortfallAmount,
    shortfallAmount,
  };
}

// Scenario: every unpaid invoice of one student is paid `days` late.
export function presetLatePayment({ state, studentId, days }) {
  const delayByInvoiceId = {};
  for (const invoice of state.invoices) {
    if (invoice.studentId === studentId && !isPaid(invoice)) {
      delayByInvoiceId[invoice.id] = days;
    }
  }
  return { delayByInvoiceId };
}

// Scenario: the `count` largest unpaid invoices are paid `days` late.
export function presetBadDay({ state, count, days }) {
  const largest = state.invoices
    .filter((i) => !isPaid(i))
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, count);
  const delayByInvoiceId = {};
  for (const invoice of largest) {
    delayByInvoiceId[invoice.id] = days;
  }
  return { delayByInvoiceId };
}
