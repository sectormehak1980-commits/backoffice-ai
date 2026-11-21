// Rule-based answers for the BackOffice copilot. Pure helpers: no React, no localStorage.
import {
  addDays,
  addMonths,
  buildForecast,
  computeSummary,
  daysOverdue,
  effectiveStatus,
  invoiceOutstanding,
} from "./forecastEngine.js";
import { batchStats } from "./batchEngine.js";
import { pendingExtraFees } from "./attendanceEngine.js";
import { reliabilityMap } from "./reliability.js";
import { buildFeeHikeNotice } from "./messages.js";

export const COPILOT_PROMPTS = [
  { id: "top-overdue", label: "Who are my top overdue students?" },
  { id: "afford-bills", label: "Can I afford my upcoming bills?" },
  { id: "fee-hike", label: "Draft a polite fee hike notice" },
  { id: "batch-seats", label: "Which batch has the most empty seats?" },
  { id: "extra-fees", label: "How much extra-class fee is pending to bill?" },
  { id: "risk", label: "Which parents are a late-payment risk?" },
];

const sum = (values) => values.reduce((total, v) => total + v, 0);
const fmt = (n) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
const nameOf = (state, id) => (state.students ?? []).find((s) => s.id === id)?.name ?? "Unknown";

// "yyyy-mm-dd" -> "15 Jun 2025" for copilot lines.
const formatDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

function topOverdue(state) {
  const ref = state.settings.referenceDate;
  const overdue = state.invoices.filter((i) => effectiveStatus(i, ref) === "Overdue");
  const top = [...overdue]
    .sort((a, b) => invoiceOutstanding(b) - invoiceOutstanding(a))
    .slice(0, 3);

  if (top.length === 0) {
    return {
      title: "Top overdue students",
      lines: ["No invoices are overdue right now."],
      action: { label: "Open invoices", target: "invoices" },
    };
  }

  const total = sum(overdue.map(invoiceOutstanding));
  return {
    title: "Top overdue students",
    lines: [
      `${overdue.length} overdue invoice(s) total ${fmt(total)}.`,
      ...top.map(
        (i) =>
          `${nameOf(state, i.studentId)}: ${fmt(invoiceOutstanding(i))}, ${daysOverdue(i, ref)} days overdue`
      ),
    ],
    action: { label: "Open invoices", target: "invoices" },
  };
}

function affordBills(state) {
  const ref = state.settings.referenceDate;
  const end = addDays(ref, 30);
  const cash = computeSummary(state, ref).cashInHand;
  const incoming = sum(
    buildForecast({ state, horizonDays: 30, referenceDate: ref }).map((d) => d.incoming)
  );
  const dueBills = (state.bills ?? []).filter((b) => !b.paid && b.nextDueDate <= end);
  const billsDue = sum(dueBills.map((b) => Number(b.amount) || 0));
  const margin = cash + incoming - billsDue;

  const verdict =
    margin >= 0
      ? `Yes, with ${fmt(margin)} to spare.`
      : `No, you are short by ${fmt(-margin)}.`;

  return {
    title: "Can I afford my upcoming bills?",
    lines: [
      `Cash in hand: ${fmt(cash)}; expected in the next 30 days: ${fmt(incoming)}.`,
      `Unpaid bills due by ${formatDate(end)}: ${fmt(billsDue)} (${dueBills.length} bill(s)).`,
      verdict,
      ...dueBills
        .slice(0, 3)
        .map((b) => `${b.name ?? "Bill"}: ${fmt(b.amount)} due ${formatDate(b.nextDueDate)}`),
    ],
    action: { label: "Open bills", target: "bills" },
  };
}

function feeHike(state) {
  const ref = state.settings.referenceDate;
  const effective = addMonths(`${ref.slice(0, 7)}-01`, 1);
  const notice = buildFeeHikeNotice({ settings: state.settings, effectiveDate: effective });
  return {
    title: "Fee hike notice draft",
    lines: notice.split("\n").filter((l) => l.trim()).slice(0, 6),
    action: { label: "Open settings", target: "settings" },
  };
}

function batchSeats(state) {
  const stats = batchStats(state).sort((a, b) => b.emptySeats - a.emptySeats);
  if (stats.length === 0) {
    return {
      title: "Batches with empty seats",
      lines: ["No batches are set up yet."],
      action: { label: "Open students", target: "students" },
    };
  }
  return {
    title: "Batches with empty seats",
    lines: stats
      .slice(0, 3)
      .map(
        (b) =>
          `${b.name}: ${b.emptySeats} of ${b.maxSeats} seats empty (potential ${fmt(b.potentialExtraIncome)}/month)`
      ),
    action: { label: "Open students", target: "students" },
  };
}

function extraFees(state) {
  const rows = (state.students ?? [])
    .map((s) => ({ name: s.name, ...pendingExtraFees(state, s.id) }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.amount - a.amount);
  const total = sum(rows.map((r) => r.amount));
  const classes = sum(rows.map((r) => r.count));
  return {
    title: "Pending extra-class fees",
    lines: [
      `${fmt(total)} of extra-class fees is pending to bill (${classes} class(es)).`,
      ...rows.slice(0, 5).map((r) => `${r.name}: ${r.count} class(es), ${fmt(r.amount)}`),
    ],
    action: { label: "Open attendance", target: "attendance" },
  };
}

function risk(state) {
  const map = reliabilityMap(state);
  const risky = (state.students ?? [])
    .filter((s) => map[s.id]?.label === "Late Risk")
    .map((s) => ({ name: s.name, ...map[s.id] }))
    .sort((a, b) => a.score - b.score);

  if (risky.length === 0) {
    return {
      title: "Late-payment risk",
      lines: ["No parents are currently flagged as a late-payment risk."],
      action: { label: "Open students", target: "students" },
    };
  }
  return {
    title: "Late-payment risk",
    lines: [
      `${risky.length} parent(s) flagged as a late-payment risk.`,
      ...risky
        .slice(0, 5)
        .map((r) => `${r.name}: ${r.overdue} overdue, ${r.paidLate} paid late, score ${r.score}/100`),
    ],
    action: { label: "Open students", target: "students" },
  };
}

export function answerPrompt(promptId, state) {
  switch (promptId) {
    case "top-overdue":
      return topOverdue(state);
    case "afford-bills":
      return affordBills(state);
    case "fee-hike":
      return feeHike(state);
    case "batch-seats":
      return batchSeats(state);
    case "extra-fees":
      return extraFees(state);
    case "risk":
      return risk(state);
    default:
      return {
        title: "Unknown question",
        lines: ["Pick one of the suggested questions."],
      };
  }
}
