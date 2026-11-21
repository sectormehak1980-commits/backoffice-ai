import { useMemo, useState } from "react";
import { AlertTriangle, Calendar, CalendarClock, Check, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import Modal from "./Modal.jsx";
import { buildForecast, daysBetween, parseISO } from "../utils/forecastEngine.js";

const CATEGORIES = ["Rent", "Utilities", "Printing", "Salary", "Other"];
const FILTERS = [
  { id: "all", label: "All" },
  { id: "due30", label: "Due in 30 days" },
  { id: "paid", label: "Paid" },
];
const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const fmt = (n) => inr.format(n);
const fmtDate = (iso) =>
  parseISO(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100";

const STATUS_STYLES = {
  Paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Due: "bg-amber-50 text-amber-700 ring-amber-200",
  Overdue: "bg-red-50 text-red-700 ring-red-200",
};

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

function Stat({ label, value, sub, icon: Icon, tone }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <Icon className={`h-4 w-4 ${tone}`} />
      </div>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export default function Bills({ state, actions, notify }) {
  const ref = state.settings.referenceDate;
  const refMonth = ref.slice(0, 7);

  const [filter, setFilter] = useState("all");
  const [editor, setEditor] = useState(null); // null | { mode: "add" } | { mode: "edit", id }
  const [form, setForm] = useState({ name: "", category: "Rent", amount: "", nextDueDate: ref });
  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);

  const rows = useMemo(
    () =>
      state.bills
        .map((bill) => {
          const days = daysBetween(ref, bill.nextDueDate);
          const status = bill.paid ? "Paid" : days < 0 ? "Overdue" : "Due";
          return { bill, days, status };
        })
        .sort((a, b) => a.bill.nextDueDate.localeCompare(b.bill.nextDueDate)),
    [state.bills, ref]
  );

  const outgoing30 = useMemo(
    () =>
      buildForecast({ state, horizonDays: 30, referenceDate: ref }).reduce((sum, row) => sum + row.outgoing, 0),
    [state, ref]
  );

  const dueThisMonth = useMemo(
    () => rows.filter((r) => !r.bill.paid && r.bill.nextDueDate.slice(0, 7) === refMonth).length,
    [rows, refMonth]
  );

  const paidThisMonth = useMemo(
    () =>
      state.bills
        .filter((b) => b.paid && b.paidDate && b.paidDate.slice(0, 7) === refMonth)
        .reduce((sum, b) => sum + (Number(b.amount) || 0), 0),
    [state.bills, refMonth]
  );

  const visible = useMemo(() => {
    if (filter === "paid") return rows.filter((r) => r.bill.paid);
    if (filter === "due30") return rows.filter((r) => !r.bill.paid && r.days <= 30);
    return rows;
  }, [rows, filter]);

  const openAdd = () => {
    setForm({ name: "", category: "Rent", amount: "", nextDueDate: ref });
    setErrors({});
    setEditor({ mode: "add" });
  };

  const openEdit = (bill) => {
    setForm({
      name: bill.name,
      category: bill.category,
      amount: String(bill.amount),
      nextDueDate: bill.nextDueDate,
    });
    setErrors({});
    setEditor({ mode: "edit", id: bill.id });
  };

  const save = () => {
    const next = {};
    const name = form.name.trim();
    const amount = Number(form.amount);
    if (!name) next.name = "Enter a bill name.";
    if (!(amount > 0)) next.amount = "Amount must be more than ₹0.";
    if (!form.nextDueDate) next.nextDueDate = "Pick a due date.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const data = { name, category: form.category, amount, nextDueDate: form.nextDueDate };
    if (editor.mode === "add") {
      actions.addBill({ ...data, frequency: "Monthly", paid: false, paidDate: null, lastPaidDate: null });
      notify?.(`Added bill “${name}”`);
    } else {
      actions.updateBill(editor.id, data);
      notify?.(`Updated bill “${name}”`);
    }
    setEditor(null);
  };

  const confirmRemove = () => {
    if (!confirmDelete) return;
    actions.deleteBill(confirmDelete.id);
    notify?.(`Deleted bill “${confirmDelete.name}”`);
    setConfirmDelete(null);
  };

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Upcoming Bills</h1>
          <p className="text-sm text-slate-500">Rent, utilities, printing and staff costs.</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Add Bill
        </button>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat
          label="Outgoing, next 30 days"
          value={fmt(outgoing30)}
          sub="Bill payments in the forecast window"
          icon={Wallet}
          tone="text-amber-500"
        />
        <Stat
          label="Bills due this month"
          value={dueThisMonth}
          sub="Not yet paid"
          icon={Calendar}
          tone="text-indigo-600"
        />
        <Stat
          label="Paid this month"
          value={fmt(paidThisMonth)}
          sub="Marked paid in the reference month"
          icon={CalendarClock}
          tone="text-emerald-500"
        />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  filter === f.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-500">{visible.length} of {rows.length} bills</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Bill</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3">Next due</th>
                <th className="px-5 py-3">Days</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map(({ bill, days, status }) => (
                <tr key={bill.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-900">{bill.name}</td>
                  <td className="px-5 py-3 text-slate-600">{bill.category}</td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-900">{fmt(bill.amount)}</td>
                  <td className="px-5 py-3 text-slate-600">{fmtDate(bill.nextDueDate)}</td>
                  <td className="px-5 py-3 text-slate-600">
                    {days < 0 ? (
                      <span className="font-medium text-red-600">{-days} days overdue</span>
                    ) : days === 0 ? (
                      "Today"
                    ) : (
                      `in ${days} days`
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status]}`}
                    >
                      {status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {bill.paid ? (
                        <button
                          type="button"
                          onClick={() => {
                            actions.markBillUnpaid(bill.id);
                            notify?.(`${bill.name} marked unpaid`);
                          }}
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Mark Unpaid
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            actions.markBillPaid(bill.id, state.settings.referenceDate);
                            notify?.(`${bill.name} marked paid`);
                          }}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-600"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Mark Paid
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEdit(bill)}
                        aria-label={`Edit ${bill.name}`}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete({ id: bill.id, name: bill.name })}
                        aria-label={`Delete ${bill.name}`}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-500">
                    No bills match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-slate-500">
        Marked-paid bills roll forward to next month and feed the cash forecast.
      </p>

      <Modal
        open={editor !== null}
        title={editor?.mode === "edit" ? "Edit Bill" : "Add Bill"}
        onClose={() => setEditor(null)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditor(null)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              {editor?.mode === "edit" ? "Save changes" : "Add bill"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Bill name" error={errors.name}>
            <input className={inputCls} value={form.name} onChange={setField("name")} placeholder="e.g. Room Rent" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <select className={inputCls} value={form.category} onChange={setField("category")}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Amount (₹)" error={errors.amount}>
              <input
                type="number"
                min="1"
                step="1"
                className={inputCls}
                value={form.amount}
                onChange={setField("amount")}
              />
            </Field>
          </div>
          <Field label="Next due date" error={errors.nextDueDate}>
            <input type="date" className={inputCls} value={form.nextDueDate} onChange={setField("nextDueDate")} />
          </Field>
          <p className="text-xs text-slate-500">Repeats monthly.</p>
        </div>
      </Modal>

      <Modal
        open={confirmDelete !== null}
        title="Delete bill?"
        onClose={() => setConfirmDelete(null)}
        widthClass="max-w-sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setConfirmDelete(null)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmRemove}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
            >
              Delete
            </button>
          </>
        }
      >
        <p className="flex items-start gap-2 text-sm text-slate-600">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          “{confirmDelete?.name}” will be removed from bills and the cash forecast. This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
