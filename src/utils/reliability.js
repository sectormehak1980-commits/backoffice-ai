// Payment reliability per student. Pure helpers: no React, no localStorage.
import { effectiveStatus } from "./forecastEngine.js";

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

export function computeReliability(state, studentId) {
  const ref = state.settings.referenceDate;
  const invoices = state.invoices.filter(
    (i) => i.studentId === studentId && i.issueDate <= ref
  );
  const total = invoices.length;
  const paid = invoices.filter((i) => i.status === "Paid").length;
  const paidLate = invoices.filter(
    (i) => i.status === "Paid" && i.paidDate && i.dueDate && i.paidDate > i.dueDate
  ).length;
  const overdue = invoices.filter((i) => effectiveStatus(i, ref) === "Overdue").length;

  const score = clamp(
    Math.round((100 * (paid - paidLate - 2 * overdue)) / Math.max(total, 1)),
    0,
    100
  );

  let label;
  let tone;
  if (total < 2) {
    label = "New";
    tone = "slate";
  } else if (overdue >= 2 || (overdue + paidLate) / total >= 0.4) {
    label = "Late Risk";
    tone = "red";
  } else if (overdue >= 1 || paidLate >= 1) {
    label = "Occasional Delay";
    tone = "amber";
  } else {
    label = "On-Time";
    tone = "emerald";
  }

  return { label, tone, paid, overdue, paidLate, score };
}

export function reliabilityMap(state) {
  const map = {};
  for (const student of state.students) {
    map[student.id] = computeReliability(state, student.id);
  }
  return map;
}
