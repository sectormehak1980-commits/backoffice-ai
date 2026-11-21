import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, Users } from "lucide-react";
import Modal from "./Modal.jsx";
import { invoiceOutstanding } from "../utils/forecastEngine.js";
import { reliabilityMap } from "../utils/reliability.js";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const EMPTY_FORM = {
  name: "",
  parent: "",
  phone: "",
  subject: "",
  classLevel: "",
  batch: "",
  monthlyFee: "",
};

const FIELDS = [
  { key: "name", label: "Student name", type: "text", placeholder: "e.g. Aarav Sharma" },
  { key: "parent", label: "Parent / guardian", type: "text", placeholder: "e.g. Rakesh Sharma" },
  { key: "phone", label: "Parent phone", type: "tel", placeholder: "+91 98200 00000" },
  { key: "subject", label: "Subject", type: "text", placeholder: "e.g. Maths" },
  { key: "classLevel", label: "Class / level", type: "text", placeholder: "e.g. Class 10" },
  { key: "batch", label: "Batch timing", type: "text", placeholder: "e.g. Mon-Wed-Fri 6-7 PM" },
  { key: "monthlyFee", label: "Monthly fee (₹)", type: "number", placeholder: "500 – 20,000" },
];

const inputBase =
  "mt-1 block w-full rounded-lg border bg-white px-3 py-2 text-sm text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:ring-2";
const inputOk = `${inputBase} border-[#E2E8F0] focus:border-[#4F46E5] focus:ring-[#4F46E5]/20`;
const inputErr = `${inputBase} border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/20`;

const btnPrimary =
  "inline-flex items-center gap-2 rounded-lg bg-[#4F46E5] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50";
const btnSecondary =
  "inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50";
const btnDanger =
  "inline-flex items-center gap-2 rounded-lg bg-[#EF4444] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-600";
const iconBtn =
  "rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[#0F172A]";

// Badge colours per reliability tone (from utils/reliability.js). Dark variants live in index.css.
const RELIABILITY_BADGE = {
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  slate: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

function validate(form) {
  const errors = {};
  for (const f of FIELDS) {
    if (!String(form[f.key] ?? "").trim()) errors[f.key] = "Required";
  }
  if (!errors.monthlyFee) {
    const fee = Number(form.monthlyFee);
    if (!Number.isFinite(fee) || fee < 500 || fee > 20000) {
      errors.monthlyFee = "Enter a fee between ₹500 and ₹20,000";
    }
  }
  return errors;
}

function matchesTerm(student, term) {
  return [student.name, student.parent, student.subject, student.classLevel].some((v) =>
    String(v ?? "").toLowerCase().includes(term)
  );
}

function StudentModal({ open, initial, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(
      initial
        ? {
            name: initial.name ?? "",
            parent: initial.parent ?? "",
            phone: initial.phone ?? "",
            subject: initial.subject ?? "",
            classLevel: initial.classLevel ?? "",
            batch: initial.batch ?? "",
            monthlyFee: String(initial.monthlyFee ?? ""),
          }
        : EMPTY_FORM
    );
    setErrors({});
  }, [open, initial]);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  const submit = (event) => {
    event.preventDefault();
    const found = validate(form);
    if (Object.keys(found).some((k) => found[k])) {
      setErrors(found);
      return;
    }
    onSave({
      name: form.name.trim(),
      parent: form.parent.trim(),
      phone: form.phone.trim(),
      subject: form.subject.trim(),
      classLevel: form.classLevel.trim(),
      batch: form.batch.trim(),
      monthlyFee: Number(form.monthlyFee),
    });
  };

  const footer = (
    <>
      <button type="button" onClick={onClose} className={btnSecondary}>
        Cancel
      </button>
      <button type="submit" form="student-form" className={btnPrimary}>
        {initial ? "Save changes" : "Add student"}
      </button>
    </>
  );

  return (
    <Modal
      open={open}
      title={initial ? "Edit student" : "Add student"}
      onClose={onClose}
      footer={footer}
    >
      <form id="student-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <label
            key={f.key}
            className={`block text-sm font-medium text-slate-700 ${
              f.key === "name" || f.key === "batch" ? "sm:col-span-2" : ""
            }`}
          >
            {f.label}
            <input
              type={f.type}
              value={form[f.key]}
              placeholder={f.placeholder}
              min={f.key === "monthlyFee" ? 500 : undefined}
              max={f.key === "monthlyFee" ? 20000 : undefined}
              onChange={(e) => setField(f.key, e.target.value)}
              className={errors[f.key] ? inputErr : inputOk}
            />
            {errors[f.key] && (
              <span className="mt-1 block text-xs text-[#EF4444]">{errors[f.key]}</span>
            )}
          </label>
        ))}
      </form>
    </Modal>
  );
}

function SummaryChip({ label, value, tone }) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

export default function Students({ state, actions, notify, query }) {
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const students = state.students;
  const invoices = state.invoices;

  // Per-student paid and due totals, derived from invoices.
  const totals = useMemo(() => {
    const map = {};
    for (const inv of invoices) {
      if (!inv.studentId) continue;
      const entry = map[inv.studentId] ?? { paid: 0, due: 0 };
      if (inv.status === "Paid") entry.paid += Number(inv.amount) || 0;
      else entry.due += invoiceOutstanding(inv);
      map[inv.studentId] = entry;
    }
    return map;
  }, [invoices]);

  // Payment reliability per student (On-Time / Occasional Delay / Late Risk / New).
  const reliability = useMemo(() => reliabilityMap(state), [state]);

  const grandTotals = useMemo(
    () =>
      Object.values(totals).reduce(
        (acc, t) => ({ paid: acc.paid + t.paid, due: acc.due + t.due }),
        { paid: 0, due: 0 }
      ),
    [totals]
  );

  const subjects = useMemo(
    () => [...new Set(students.map((s) => s.subject).filter(Boolean))].sort(),
    [students]
  );

  const visible = useMemo(() => {
    const local = search.trim().toLowerCase();
    const global = (query ?? "").trim().toLowerCase();
    return students.filter(
      (s) =>
        (!local || matchesTerm(s, local)) &&
        (!global || matchesTerm(s, global)) &&
        (subjectFilter === "All" || s.subject === subjectFilter)
    );
  }, [students, search, query, subjectFilter]);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (student) => {
    setEditing(student);
    setFormOpen(true);
  };

  const closeForm = () => setFormOpen(false);

  const handleSave = (data) => {
    if (editing) {
      actions.updateStudent(editing.id, data);
      notify(`${data.name} updated`);
    } else {
      actions.addStudent(data);
      notify(`${data.name} added`);
    }
    setFormOpen(false);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    actions.deleteStudent(deleteTarget.id);
    notify(`${deleteTarget.name} deleted`);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F172A]">Students</h1>
          <p className="text-sm text-slate-500">Manage your students, batches and fees.</p>
        </div>
        <button type="button" onClick={openAdd} className={btnPrimary}>
          <Plus className="h-4 w-4" />
          Add Student
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryChip label="Total students" value={students.length} tone="text-[#0F172A]" />
        <SummaryChip
          label="Total collected"
          value={inr.format(grandTotals.paid)}
          tone="text-[#10B981]"
        />
        <SummaryChip
          label="Total outstanding"
          value={inr.format(grandTotals.due)}
          tone="text-[#F59E0B]"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, parent, subject, class…"
            className="w-full rounded-lg border border-[#E2E8F0] bg-white py-2 pl-9 pr-3 text-sm text-[#0F172A] placeholder:text-slate-400 focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
          />
        </div>
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
        >
          <option value="All">All subjects</option>
          {subjects.map((sub) => (
            <option key={sub} value={sub}>
              {sub}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-3 rounded-full bg-slate-100 p-3 text-slate-400">
              <Users className="h-6 w-6" />
            </div>
            <p className="font-medium text-[#0F172A]">No students match your search</p>
            <p className="mt-1 text-sm text-slate-500">
              Try a different keyword or subject, or add a new student.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E2E8F0] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Parent &amp; phone</th>
                  <th className="px-4 py-3">Subject &amp; batch</th>
                  <th className="px-4 py-3 text-right">Monthly fee</th>
                  <th className="px-4 py-3 text-right">Total paid</th>
                  <th className="px-4 py-3 text-right">Total due</th>
                  <th className="px-4 py-3 text-right print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {visible.map((s) => {
                  const t = totals[s.id] ?? { paid: 0, due: 0 };
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#0F172A]">{s.name}</p>
                        <p className="text-xs text-slate-500">{s.classLevel}</p>
                        {reliability[s.id] && (
                          <span
                            className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                              RELIABILITY_BADGE[reliability[s.id].tone] ?? RELIABILITY_BADGE.slate
                            }`}
                            title={`Reliability score ${reliability[s.id].score}/100`}
                          >
                            {reliability[s.id].label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[#0F172A]">{s.parent}</p>
                        <p className="text-xs text-slate-500">{s.phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[#0F172A]">{s.subject}</p>
                        <p className="text-xs text-slate-500">{s.batch}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-[#0F172A]">
                        {inr.format(Number(s.monthlyFee) || 0)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-[#10B981]">
                        {inr.format(t.paid)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-medium ${
                          t.due > 0 ? "text-[#F59E0B]" : "text-slate-500"
                        }`}
                      >
                        {inr.format(t.due)}
                      </td>
                      <td className="px-4 py-3 print:hidden">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(s)}
                            className={iconBtn}
                            title="Edit student"
                            aria-label={`Edit ${s.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(s)}
                            className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-[#EF4444]"
                            title="Delete student"
                            aria-label={`Delete ${s.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <StudentModal
        open={formOpen}
        initial={editing}
        onClose={closeForm}
        onSave={handleSave}
      />

      <Modal
        open={!!deleteTarget}
        title="Delete student?"
        onClose={() => setDeleteTarget(null)}
        widthClass="max-w-md"
        footer={
          <>
            <button type="button" onClick={() => setDeleteTarget(null)} className={btnSecondary}>
              Cancel
            </button>
            <button type="button" onClick={confirmDelete} className={btnDanger}>
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          {deleteTarget
            ? `This removes ${deleteTarget.name} and all of their invoices (${
                invoices.filter((i) => i.studentId === deleteTarget.id).length
              } in total). This cannot be undone.`
            : ""}
        </p>
      </Modal>
    </div>
  );
}
