import { useEffect, useMemo, useReducer, useRef } from "react";
import { SEED_BATCHES, SEED_VERSION, buildSeed } from "../data/mockData.js";
import { addDays, addMonths } from "../utils/forecastEngine.js";

export const STORAGE_KEY = "backoffice-ai-state-v1";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Fills fields added after version 1 without touching existing data.
export function migrateState(state) {
  const batches = Array.isArray(state.batches)
    ? state.batches
    : SEED_BATCHES.map((b) => ({ ...b }));

  const students = state.students.map((s) =>
    s.batchId === undefined
      ? { ...s, batchId: batches.find((b) => b.subject === s.subject)?.id ?? "b3" }
      : s
  );

  const invoices = state.invoices.map((i) => ({
    ...i,
    extraAmount: i.extraAmount ?? 0,
    billedMonth: i.billedMonth ?? String(i.issueDate ?? "").slice(0, 7),
  }));

  return {
    ...state,
    students,
    invoices,
    batches,
    attendance: Array.isArray(state.attendance) ? state.attendance : [],
    settings: { ...state.settings, extraClassFee: state.settings.extraClassFee ?? 300 },
  };
}

// Falls back to seed data on missing key, invalid JSON, or version mismatch.
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildSeed();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== SEED_VERSION) return buildSeed();
    return migrateState(parsed);
  } catch {
    return buildSeed();
  }
}

// Copies only the batch fields that are present in data, coercing maxSeats to an integer >= 1.
function batchFields(data) {
  const out = {};
  for (const key of ["name", "subject", "schedule"]) {
    if (data[key] !== undefined) out[key] = data[key];
  }
  if (data.maxSeats !== undefined) {
    out.maxSeats = Math.max(1, Math.round(Number(data.maxSeats)) || 1);
  }
  return out;
}

// Pure: works out the invoices a monthly run would create from `state`.
// generateMonthlyInvoices computes this once, returns the counts, and dispatches the same plan.
function planMonthlyInvoices(state, monthIso) {
  const fee = Number(state.settings.extraClassFee) || 0;
  const invoices = [];
  const billedAttendance = {}; // attendance id -> new invoice id
  let skipped = 0;

  for (const student of state.students) {
    if (student.status !== "Active") continue;
    const alreadyBilled = state.invoices.some(
      (i) => i.studentId === student.id && i.billedMonth === monthIso
    );
    if (alreadyBilled) {
      skipped += 1;
      continue;
    }

    // Unbilled "Extra Class" rows in this month; each costs settings.extraClassFee.
    const extra = state.attendance.filter(
      (a) =>
        a.studentId === student.id &&
        a.status === "Extra Class" &&
        a.billedInvoiceId == null &&
        a.date.startsWith(monthIso)
    );
    const extraCount = extra.length;
    const extraFee = extraCount * fee;
    const tuitionAmount = Number(student.monthlyFee) || 0;
    const issueDate = `${monthIso}-01`;
    const id = `inv-${Date.now()}-${invoices.length}`;

    invoices.push({
      id,
      studentId: student.id,
      amount: tuitionAmount + extraFee,
      tuitionAmount,
      extraAmount: extraFee,
      extraNote: extraCount ? `${extraCount} extra class${extraCount === 1 ? "" : "es"} @ ₹${fee}` : "",
      issueDate,
      dueDate: addDays(issueDate, 7),
      period: `${MONTH_NAMES[Number(monthIso.slice(5, 7)) - 1]} ${monthIso.slice(0, 4)}`,
      status: "Pending",
      paidDate: null,
      billedMonth: monthIso,
    });
    for (const a of extra) billedAttendance[a.id] = id;
  }

  return {
    invoices,
    billedAttendance,
    result: {
      created: invoices.length,
      skipped,
      extraClasses: Object.keys(billedAttendance).length,
    },
  };
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage may be unavailable or full; the in-memory state still works.
  }
}

export function resetState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
  return buildSeed();
}

function reducer(state, action) {
  switch (action.type) {
    case "addStudent":
      return {
        ...state,
        students: [...state.students, { status: "Active", ...action.data, id: `s${Date.now()}` }],
      };

    case "updateStudent":
      return {
        ...state,
        students: state.students.map((s) =>
          s.id === action.id ? { ...s, ...action.data, id: s.id } : s
        ),
      };

    case "deleteStudent":
      return {
        ...state,
        students: state.students.filter((s) => s.id !== action.id),
        invoices: state.invoices.filter((i) => i.studentId !== action.id),
      };

    case "addInvoice":
      return {
        ...state,
        invoices: [
          ...state.invoices,
          { ...action.data, id: `inv-${Date.now()}`, status: "Pending", paidDate: null },
        ],
      };

    case "updateInvoice":
      return {
        ...state,
        invoices: state.invoices.map((i) =>
          i.id === action.id ? { ...i, ...action.data, id: i.id } : i
        ),
      };

    case "deleteInvoice":
      return { ...state, invoices: state.invoices.filter((i) => i.id !== action.id) };

    case "markInvoicePaid": {
      const paidDate = action.paidDate ?? state.settings.referenceDate;
      return {
        ...state,
        invoices: state.invoices.map((i) =>
          i.id === action.id ? { ...i, status: "Paid", paidDate } : i
        ),
      };
    }

    case "markInvoiceUnpaid": {
      const ref = state.settings.referenceDate;
      return {
        ...state,
        invoices: state.invoices.map((i) =>
          i.id === action.id
            ? { ...i, status: i.dueDate < ref ? "Overdue" : "Pending", paidDate: null }
            : i
        ),
      };
    }

    case "addBill":
      return {
        ...state,
        bills: [
          ...state.bills,
          {
            frequency: "Monthly",
            ...action.data,
            id: `bill-${Date.now()}`,
            paid: false,
            paidDate: null,
            lastPaidDate: null,
          },
        ],
      };

    case "updateBill":
      return {
        ...state,
        bills: state.bills.map((b) => (b.id === action.id ? { ...b, ...action.data, id: b.id } : b)),
      };

    case "deleteBill":
      return { ...state, bills: state.bills.filter((b) => b.id !== action.id) };

    case "markBillPaid": {
      const paidDate = action.paidDate ?? state.settings.referenceDate;
      return {
        ...state,
        bills: state.bills.map((b) =>
          b.id === action.id
            ? {
                ...b,
                paid: true,
                paidDate,
                lastPaidDate: paidDate,
                nextDueDate: addMonths(b.nextDueDate, 1),
              }
            : b
        ),
      };
    }

    case "markBillUnpaid":
      return {
        ...state,
        bills: state.bills.map((b) =>
          b.id === action.id ? { ...b, paid: false, paidDate: null } : b
        ),
      };

    case "addBatch":
      return {
        ...state,
        batches: [...state.batches, { id: `b-${Date.now()}`, ...batchFields(action.data) }],
      };

    case "updateBatch":
      return {
        ...state,
        batches: state.batches.map((b) =>
          b.id === action.id ? { ...b, ...batchFields(action.patch), id: b.id } : b
        ),
      };

    case "deleteBatch":
      return {
        ...state,
        batches: state.batches.filter((b) => b.id !== action.id),
        students: state.students.map((s) => (s.batchId === action.id ? { ...s, batchId: null } : s)),
      };

    case "setAttendance": {
      const id = `att-${action.studentId}-${action.date}`;
      if (action.status == null) {
        return { ...state, attendance: state.attendance.filter((a) => a.id !== id) };
      }
      const existing = state.attendance.find((a) => a.id === id);
      const record = {
        id,
        studentId: action.studentId,
        date: action.date,
        status: action.status,
        billedInvoiceId: existing?.billedInvoiceId ?? null,
      };
      return {
        ...state,
        attendance: existing
          ? state.attendance.map((a) => (a.id === id ? record : a))
          : [...state.attendance, record],
      };
    }

    case "generateMonthlyInvoices": {
      const { invoices, billedAttendance } = action.plan;
      if (invoices.length === 0) return state;
      return {
        ...state,
        invoices: [...state.invoices, ...invoices],
        attendance: state.attendance.map((a) =>
          billedAttendance[a.id] ? { ...a, billedInvoiceId: billedAttendance[a.id] } : a
        ),
      };
    }

    case "updateSettings":
      return { ...state, settings: { ...state.settings, ...action.patch } };

    case "resetDemoData":
      return buildSeed();

    default:
      return state;
  }
}

export function useAppState() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  // Latest committed state, read by generateMonthlyInvoices (which must return a value synchronously).
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    saveState(state);
  }, [state]);

  const actions = useMemo(
    () => ({
      addBatch: (data) => dispatch({ type: "addBatch", data }),
      updateBatch: (id, patch) => dispatch({ type: "updateBatch", id, patch }),
      deleteBatch: (id) => dispatch({ type: "deleteBatch", id }),
      setAttendance: (studentId, date, status) =>
        dispatch({ type: "setAttendance", studentId, date, status }),
      // Plan is computed here from the current state so the caller gets {created, skipped, extraClasses}
      // immediately. Calling it twice before a re-render would see the same state and could double-bill.
      generateMonthlyInvoices: (monthIso) => {
        const current = stateRef.current;
        const month = monthIso || current.settings.referenceDate.slice(0, 7);
        const { invoices, billedAttendance, result } = planMonthlyInvoices(current, month);
        dispatch({ type: "generateMonthlyInvoices", plan: { invoices, billedAttendance } });
        return result;
      },
      addStudent: (data) => dispatch({ type: "addStudent", data }),
      updateStudent: (id, data) => dispatch({ type: "updateStudent", id, data }),
      deleteStudent: (id) => dispatch({ type: "deleteStudent", id }),
      addInvoice: (data) => dispatch({ type: "addInvoice", data }),
      updateInvoice: (id, data) => dispatch({ type: "updateInvoice", id, data }),
      deleteInvoice: (id) => dispatch({ type: "deleteInvoice", id }),
      markInvoicePaid: (id, paidDate) => dispatch({ type: "markInvoicePaid", id, paidDate }),
      markInvoiceUnpaid: (id) => dispatch({ type: "markInvoiceUnpaid", id }),
      addBill: (data) => dispatch({ type: "addBill", data }),
      updateBill: (id, data) => dispatch({ type: "updateBill", id, data }),
      deleteBill: (id) => dispatch({ type: "deleteBill", id }),
      markBillPaid: (id, paidDate) => dispatch({ type: "markBillPaid", id, paidDate }),
      markBillUnpaid: (id) => dispatch({ type: "markBillUnpaid", id }),
      updateSettings: (patch) => dispatch({ type: "updateSettings", patch }),
      resetDemoData: () => dispatch({ type: "resetDemoData" }),
    }),
    []
  );

  return [state, actions];
}
