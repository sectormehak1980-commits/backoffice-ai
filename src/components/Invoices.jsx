import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Eye, Trash2, Check, X, Printer, Download, Copy, MessageCircle, Mail, ExternalLink, Receipt } from "lucide-react";
import Modal from "./Modal.jsx";
import { addDays, daysOverdue, effectiveStatus, invoiceOutstanding, parseISO } from "../utils/forecastEngine.js";
import { TONES, buildReminder, buildUpiQrUrl, buildWhatsAppLink } from "../utils/messages.js";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const fmtDate = (iso) =>
  iso
    ? parseISO(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "—";

const periodLabel = (iso) =>
  parseISO(iso).toLocaleDateString("en-IN", { month: "short", year: "numeric" });

const TABS = ["All", "Paid", "Pending", "Overdue"];

// Modal labels for the reminder tone selector. Tone ids come from messages.js TONES.
const TONE_LABELS = {
  polite: "Polite English",
  firm: "Firm",
  hinglish: "Friendly Hinglish",
};

// HTML-escape any text written into the receipt window.
const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]
  );

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
const btnGreen =
  "inline-flex items-center gap-2 rounded-lg bg-[#10B981] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-600";
const iconBtn =
  "rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[#0F172A]";

const BADGE = {
  Paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  Overdue: "bg-red-50 text-red-700 ring-red-600/20",
};

function StatusBadge({ status, days }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${BADGE[status]}`}
    >
      {status}
      {status === "Overdue" && days > 0 ? ` · ${days}d` : ""}
    </span>
  );
}

function invoiceAsText({ invoice, student, settings, status, days }) {
  const lines = [
    settings.businessName,
    settings.address,
    `Phone: ${settings.phone}  |  Email: ${settings.email}`,
    "",
    `INVOICE ${invoice.id.toUpperCase()}`,
    `Status: ${status}${status === "Overdue" ? ` (${days} days overdue)` : ""}`,
    "",
    `Bill to: ${student?.name ?? "Unknown"}`,
    `Parent/Guardian: ${student?.parent ?? "-"}`,
    `Parent phone: ${student?.phone ?? "-"}`,
    "",
    `Period: ${invoice.period}`,
    `Issued: ${fmtDate(invoice.issueDate)}`,
    `Due: ${fmtDate(invoice.dueDate)}`,
    invoice.paidDate ? `Paid on: ${fmtDate(invoice.paidDate)}` : null,
    "",
    `Monthly tuition – ${student?.subject ?? "-"}, ${student?.classLevel ?? "-"}  ${inr.format(
      Number(invoice.amount) || 0
    )}`,
    `Total: ${inr.format(Number(invoice.amount) || 0)}`,
    "",
    `Pay via UPI: ${settings.upiId}`,
  ];
  return lines.filter((l) => l !== null).join("\n");
}

function InvoiceFormModal({ open, students, referenceDate, onClose, onSave }) {
  const emptyForm = () => ({
    studentId: "",
    amount: "",
    issueDate: referenceDate,
    dueDate: addDays(referenceDate, 7),
    period: periodLabel(referenceDate),
  });
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm());
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, referenceDate]);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  const pickStudent = (studentId) => {
    const student = students.find((s) => s.id === studentId);
    setForm((f) => ({
      ...f,
      studentId,
      amount: student ? String(student.monthlyFee) : f.amount,
    }));
    setErrors((e) => ({ ...e, studentId: undefined }));
  };

  const submit = (event) => {
    event.preventDefault();
    const found = {};
    if (!form.studentId) found.studentId = "Select a student";
    const amount = Number(form.amount);
    if (!form.amount || !Number.isFinite(amount) || amount <= 0) {
      found.amount = "Enter an amount greater than 0";
    }
    if (!form.issueDate) found.issueDate = "Required";
    if (!form.dueDate) found.dueDate = "Required";
    else if (form.issueDate && form.dueDate < form.issueDate) {
      found.dueDate = "Due date cannot be before issue date";
    }
    if (!form.period.trim()) found.period = "Required";
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }
    onSave({
      studentId: form.studentId,
      amount,
      issueDate: form.issueDate,
      dueDate: form.dueDate,
      period: form.period.trim(),
    });
  };

  const footer = (
    <>
      <button type="button" onClick={onClose} className={btnSecondary}>
        Cancel
      </button>
      <button type="submit" form="invoice-form" className={btnPrimary}>
        Create invoice
      </button>
    </>
  );

  const cls = (key) => (errors[key] ? inputErr : inputOk);

  return (
    <Modal open={open} title="Create invoice" onClose={onClose} footer={footer}>
      <form id="invoice-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
          Student
          <select
            value={form.studentId}
            onChange={(e) => pickStudent(e.target.value)}
            className={cls("studentId")}
          >
            <option value="">Select a student…</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.classLevel}
              </option>
            ))}
          </select>
          {errors.studentId && (
            <span className="mt-1 block text-xs text-[#EF4444]">{errors.studentId}</span>
          )}
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Amount (₹)
          <input
            type="number"
            min={1}
            value={form.amount}
            onChange={(e) => setField("amount", e.target.value)}
            className={cls("amount")}
          />
          {errors.amount && <span className="mt-1 block text-xs text-[#EF4444]">{errors.amount}</span>}
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Period
          <input
            type="text"
            value={form.period}
            placeholder="e.g. Jun 2025"
            onChange={(e) => setField("period", e.target.value)}
            className={cls("period")}
          />
          {errors.period && <span className="mt-1 block text-xs text-[#EF4444]">{errors.period}</span>}
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Issue date
          <input
            type="date"
            value={form.issueDate}
            onChange={(e) => setField("issueDate", e.target.value)}
            className={cls("issueDate")}
          />
          {errors.issueDate && (
            <span className="mt-1 block text-xs text-[#EF4444]">{errors.issueDate}</span>
          )}
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Due date
          <input
            type="date"
            value={form.dueDate}
            onChange={(e) => setField("dueDate", e.target.value)}
            className={cls("dueDate")}
          />
          {errors.dueDate && <span className="mt-1 block text-xs text-[#EF4444]">{errors.dueDate}</span>}
        </label>
      </form>
    </Modal>
  );
}

export default function Invoices({
  state,
  actions,
  notify,
  query,
  createSignal,
  reminderInvoice,
  onCloseReminder,
  onOpenReminder,
}) {
  const [tab, setTab] = useState("All");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [tone, setTone] = useState("polite");
  const [draft, setDraft] = useState(null);

  const ref = state.settings.referenceDate;
  const settings = state.settings;

  const studentById = useMemo(
    () => Object.fromEntries(state.students.map((s) => [s.id, s])),
    [state.students]
  );

  // Open the create modal when the parent bumps createSignal (skip the initial 0).
  useEffect(() => {
    if (createSignal) setCreateOpen(true);
  }, [createSignal]);

  // Reset the reminder drafter whenever a different invoice is selected.
  useEffect(() => {
    setTone("polite");
    setDraft(null);
  }, [reminderInvoice?.id]);

  const rows = useMemo(
    () =>
      state.invoices
        .map((inv) => ({
          inv,
          status: effectiveStatus(inv, ref),
          days: daysOverdue(inv, ref),
          student: studentById[inv.studentId],
        }))
        .sort((a, b) => b.inv.issueDate.localeCompare(a.inv.issueDate)),
    [state.invoices, studentById, ref]
  );

  const counts = useMemo(() => {
    const c = { All: rows.length, Paid: 0, Pending: 0, Overdue: 0 };
    for (const r of rows) c[r.status] += 1;
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const local = search.trim().toLowerCase();
    const global = (query ?? "").trim().toLowerCase();
    const matches = (r, term) =>
      (r.student?.name ?? "").toLowerCase().includes(term) ||
      (r.inv.period ?? "").toLowerCase().includes(term);
    return rows.filter(
      (r) =>
        (tab === "All" || r.status === tab) &&
        (!local || matches(r, local)) &&
        (!global || matches(r, global))
    );
  }, [rows, tab, search, query]);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    actions.deleteInvoice(deleteTarget.id);
    notify(`Invoice ${deleteTarget.id.toUpperCase()} deleted`);
    setDeleteTarget(null);
  };

  const togglePaid = (inv) => {
    if (inv.status === "Paid") {
      actions.markInvoiceUnpaid(inv.id);
      notify(`Invoice ${inv.id.toUpperCase()} marked unpaid`);
    } else {
      actions.markInvoicePaid(inv.id, ref);
      notify(`Invoice ${inv.id.toUpperCase()} marked paid`);
    }
  };

  const handleCreate = (data) => {
    actions.addInvoice(data);
    notify("Invoice created");
    setCreateOpen(false);
  };

  // Bills every active student for the reference month. The store skips students already billed that month.
  const generateMonthly = () => {
    const result = actions.generateMonthlyInvoices(ref.slice(0, 7));
    const plural = result.created === 1 ? "" : "s";
    notify(`Generated ${result.created} invoice${plural}, skipped ${result.skipped} already billed`);
  };

  // ---- Printable receipt for Paid invoices ----
  const openReceipt = (inv) => {
    const student = studentById[inv.studentId];
    const win = window.open("", "_blank");
    if (!win) {
      notify("Pop-up blocked. Allow pop-ups for this site to print the receipt.");
      return;
    }
    const e = escapeHtml;
    const amount = inr.format(Number(inv.amount) || 0);
    const paidLine = inv.paidDate ? `<p class="muted">Paid on: ${e(fmtDate(inv.paidDate))}</p>` : "";
    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Receipt ${e(inv.id.toUpperCase())}</title>
<style>
  body { position: relative; min-height: 100vh; margin: 0; padding: 32px; font-family: Arial, Helvetica, sans-serif; color: #0F172A; }
  .watermark { position: absolute; top: 45%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 64px; font-weight: 700; white-space: nowrap; opacity: 0.08; pointer-events: none; color: #0F172A; }
  .sheet { position: relative; max-width: 680px; margin: 0 auto; }
  .head { display: flex; justify-content: space-between; gap: 16px; border-bottom: 1px solid #E2E8F0; padding-bottom: 16px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0; font-size: 14px; }
  .right { text-align: right; }
  .title { font-size: 18px; font-weight: 600; margin: 2px 0; }
  .label { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #64748B; margin: 0; }
  .muted { font-size: 13px; color: #64748B; margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { padding: 10px 0; border-bottom: 1px solid #E2E8F0; text-align: left; }
  .total { font-size: 16px; font-weight: 700; }
  .paid { display: inline-block; margin: 6px 0 0; border: 2px solid #10B981; color: #047857; padding: 3px 12px; border-radius: 999px; font-weight: 700; letter-spacing: 0.08em; }
</style>
</head>
<body>
<div class="watermark">BackOffice AI • Verified</div>
<div class="sheet">
  <div class="head">
    <div>
      <p class="title">${e(settings.businessName)}</p>
      <p class="muted">${e(settings.address)}</p>
      <p class="muted">${e(settings.phone)} · ${e(settings.email)}</p>
    </div>
    <div class="right">
      <p class="label">Receipt</p>
      <p class="title">${e(inv.id.toUpperCase())}</p>
      <p class="paid">PAID</p>
    </div>
  </div>
  <div class="grid">
    <div>
      <p class="label">Received from</p>
      <p><strong>${e(student?.name ?? "Unknown")}</strong></p>
      <p class="muted">Parent: ${e(student?.parent ?? "-")}</p>
      <p class="muted">${e(student?.phone ?? "-")}</p>
    </div>
    <div class="right">
      <p class="muted">Period: ${e(inv.period)}</p>
      <p class="muted">Issued: ${e(fmtDate(inv.issueDate))}</p>
      <p class="muted">Due: ${e(fmtDate(inv.dueDate))}</p>
      ${paidLine}
    </div>
  </div>
  <table>
    <thead><tr><th>Description</th><th class="right">Amount</th></tr></thead>
    <tbody>
      <tr><td>Monthly tuition – ${e(student?.subject ?? "-")}, ${e(student?.classLevel ?? "-")}</td><td class="right">${e(amount)}</td></tr>
    </tbody>
    <tfoot>
      <tr><td class="right total">Total paid</td><td class="right total">${e(amount)}</td></tr>
    </tfoot>
  </table>
  <p class="muted" style="margin-top: 24px;">Pay via UPI: ${e(settings.upiId)}</p>
</div>
<script>window.onload = function () { window.print(); };</script>
</body>
</html>`;
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  // ---- Preview / download ----
  const previewStudent = previewInvoice ? studentById[previewInvoice.studentId] : null;
  const previewStatus = previewInvoice ? effectiveStatus(previewInvoice, ref) : null;
  const previewDays = previewInvoice ? daysOverdue(previewInvoice, ref) : 0;

  const downloadTxt = () => {
    if (!previewInvoice) return;
    const text = invoiceAsText({
      invoice: previewInvoice,
      student: previewStudent,
      settings,
      status: previewStatus,
      days: previewDays,
    });
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${previewInvoice.id}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    notify("Invoice downloaded");
  };

  // ---- Reminder drafter ----
  const reminderStudent = reminderInvoice ? studentById[reminderInvoice.studentId] : null;
  const reminderCtx = reminderInvoice
    ? {
        parent: reminderStudent?.parent ?? "Parent",
        student: reminderStudent?.name ?? "your child",
        amount: inr.format(invoiceOutstanding(reminderInvoice) || Number(reminderInvoice.amount) || 0),
        due: fmtDate(reminderInvoice.dueDate),
        period: reminderInvoice.period,
        upi: settings.upiId,
        signature: settings.reminderSignature,
        days: daysOverdue(reminderInvoice, ref),
      }
    : null;
  // Outstanding amount for the reminder and the UPI QR (falls back to the invoice amount).
  const reminderAmount = reminderInvoice
    ? invoiceOutstanding(reminderInvoice) || Number(reminderInvoice.amount) || 0
    : 0;
  const upiReady = String(settings.upiId ?? "").trim() !== "";
  const message = reminderInvoice
    ? (draft ??
      buildReminder({
        tone,
        invoice: { ...reminderInvoice, amount: reminderAmount },
        // messages.js reads parentName; student records store the guardian as parent.
        student: reminderStudent ? { ...reminderStudent, parentName: reminderStudent.parent } : null,
        settings,
        referenceDate: ref,
      }))
    : "";

  const chooseTone = (key) => {
    setTone(key);
    setDraft(null);
  };

  const closeReminder = () => {
    setDraft(null);
    setTone("polite");
    onCloseReminder?.();
  };

  const copyMessage = () => {
    navigator.clipboard
      .writeText(message)
      .then(() => notify("Copied to clipboard"))
      .catch(() => notify("Could not copy. Select the text and copy manually."));
  };

  const openWhatsApp = () => {
    if (!String(reminderStudent?.phone ?? "").replace(/\D/g, "")) return;
    const url = buildWhatsAppLink(reminderStudent?.phone, message);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const sendEmail = () => {
    const subject = `Fee reminder: ${reminderStudent?.name ?? "tuition"} (${reminderInvoice?.period ?? ""})`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      message
    )}`;
  };

  const markReminderPaid = () => {
    if (!reminderInvoice) return;
    actions.markInvoicePaid(reminderInvoice.id, ref);
    notify(`Invoice ${reminderInvoice.id.toUpperCase()} marked as paid`);
    closeReminder();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F172A]">Invoices</h1>
          <p className="text-sm text-slate-500">Track fees billed, collected and overdue.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={generateMonthly} className={btnSecondary}>
            <Receipt className="h-4 w-4" />
            Generate Monthly Invoices
          </button>
          <button type="button" onClick={() => setCreateOpen(true)} className={btnPrimary}>
            <Plus className="h-4 w-4" />
            Create Invoice
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-white p-1 shadow-sm">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                tab === t
                  ? "bg-[#4F46E5] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t}
              <span
                className={`ml-1.5 rounded-full px-1.5 text-xs ${
                  tab === t ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {counts[t]}
              </span>
            </button>
          ))}
        </div>
        <div className="relative min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student or period…"
            className="w-full rounded-lg border border-[#E2E8F0] bg-white py-2 pl-9 pr-3 text-sm text-[#0F172A] placeholder:text-slate-400 focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-3 rounded-full bg-slate-100 p-3 text-slate-400">
              <Receipt className="h-6 w-6" />
            </div>
            <p className="font-medium text-[#0F172A]">No invoices found</p>
            <p className="mt-1 text-sm text-slate-500">
              Adjust the filter or search, or create a new invoice.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E2E8F0] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Issued</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {visible.map(({ inv, status, days, student }) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-[#0F172A]">{inv.id.toUpperCase()}</td>
                    <td className="px-4 py-3 text-[#0F172A]">{student?.name ?? "Unknown"}</td>
                    <td className="px-4 py-3 text-slate-600">{inv.period}</td>
                    <td className="px-4 py-3 text-right font-medium text-[#0F172A]">
                      {inr.format(Number(inv.amount) || 0)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{fmtDate(inv.issueDate)}</td>
                    <td className="px-4 py-3 text-slate-600">{fmtDate(inv.dueDate)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={status} days={days} />
                    </td>
                    <td className="px-4 py-3 print:hidden">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => togglePaid(inv)}
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
                            status === "Paid"
                              ? "text-slate-600 hover:bg-slate-100"
                              : "text-emerald-700 hover:bg-emerald-50"
                          }`}
                          title={status === "Paid" ? "Mark unpaid" : "Mark paid"}
                        >
                          {status === "Paid" ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                          {status === "Paid" ? "Unpaid" : "Mark Paid"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewInvoice(inv)}
                          className={iconBtn}
                          title="View invoice"
                          aria-label={`View ${inv.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {status === "Paid" && (
                          <button
                            type="button"
                            onClick={() => openReceipt(inv)}
                            className={iconBtn}
                            title="Print / Save PDF Receipt"
                            aria-label={`Print receipt for ${inv.id}`}
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                        )}
                        {status !== "Paid" && (
                          <button
                            type="button"
                            onClick={() => onOpenReminder?.(inv)}
                            className="rounded-md p-1.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                            title="Send reminder"
                            aria-label={`Remind for ${inv.id}`}
                          >
                            <MessageCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(inv)}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-[#EF4444]"
                          title="Delete invoice"
                          aria-label={`Delete ${inv.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create invoice */}
      <InvoiceFormModal
        open={createOpen}
        students={state.students}
        referenceDate={ref}
        onClose={() => setCreateOpen(false)}
        onSave={handleCreate}
      />

      {/* Invoice preview */}
      <Modal
        open={!!previewInvoice}
        title="Invoice preview"
        onClose={() => setPreviewInvoice(null)}
        widthClass="max-w-2xl"
        footer={
          previewInvoice && (
            <>
              <button type="button" onClick={downloadTxt} className={btnSecondary}>
                <Download className="h-4 w-4" />
                Download
              </button>
              <button type="button" onClick={() => window.print()} className={btnPrimary}>
                <Printer className="h-4 w-4" />
                Print
              </button>
            </>
          )
        }
      >
        {previewInvoice && (
          <>
            <style>{`@media print {
              body * { visibility: hidden !important; }
              #invoice-print-area, #invoice-print-area * { visibility: visible !important; }
              #invoice-print-area { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; }
            }`}</style>
            <div
              id="invoice-print-area"
              className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm print:shadow-none"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                <div>
                  <p className="text-lg font-semibold text-[#0F172A]">{settings.businessName}</p>
                  <p className="text-sm text-slate-500">{settings.address}</p>
                  <p className="text-sm text-slate-500">
                    {settings.phone} · {settings.email}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Invoice</p>
                  <p className="text-lg font-semibold text-[#0F172A]">{previewInvoice.id.toUpperCase()}</p>
                  <div className="mt-1 flex justify-end">
                    <StatusBadge status={previewStatus} days={previewDays} />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 py-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bill to</p>
                  <p className="font-medium text-[#0F172A]">{previewStudent?.name ?? "Unknown"}</p>
                  <p className="text-slate-600">Parent: {previewStudent?.parent ?? "-"}</p>
                  <p className="text-slate-600">{previewStudent?.phone ?? "-"}</p>
                </div>
                <div className="sm:text-right">
                  <p className="text-slate-600">Period: <span className="text-[#0F172A]">{previewInvoice.period}</span></p>
                  <p className="text-slate-600">Issued: <span className="text-[#0F172A]">{fmtDate(previewInvoice.issueDate)}</span></p>
                  <p className="text-slate-600">Due: <span className="text-[#0F172A]">{fmtDate(previewInvoice.dueDate)}</span></p>
                  {previewInvoice.paidDate && (
                    <p className="text-slate-600">Paid on: <span className="text-[#10B981]">{fmtDate(previewInvoice.paidDate)}</span></p>
                  )}
                </div>
              </div>

              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-y border-[#E2E8F0] text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2">Description</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-3 text-[#0F172A]">
                      Monthly tuition – {previewStudent?.subject ?? "-"}, {previewStudent?.classLevel ?? "-"}
                    </td>
                    <td className="py-3 text-right text-[#0F172A]">
                      {inr.format(Number(previewInvoice.amount) || 0)}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="border-t border-[#E2E8F0]">
                    <td className="py-3 text-right font-semibold text-[#0F172A]">Total</td>
                    <td className="py-3 text-right text-lg font-semibold text-[#0F172A]">
                      {inr.format(Number(previewInvoice.amount) || 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              <p className="mt-6 text-sm text-slate-600">
                Pay via UPI: <span className="font-medium text-[#0F172A]">{settings.upiId}</span>
              </p>
            </div>
          </>
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!deleteTarget}
        title="Delete invoice?"
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
            ? `Invoice ${deleteTarget.id.toUpperCase()} for ${
                studentById[deleteTarget.studentId]?.name ?? "this student"
              } (${deleteTarget.period}) will be permanently removed.`
            : ""}
        </p>
      </Modal>

      {/* Reminder drafter */}
      <Modal
        open={!!reminderInvoice}
        title="Payment reminder"
        onClose={closeReminder}
        widthClass="max-w-2xl"
        footer={
          reminderInvoice && (
            <>
              <button type="button" onClick={markReminderPaid} className={btnGreen}>
                <Check className="h-4 w-4" />
                Mark as Paid
              </button>
              <button type="button" onClick={copyMessage} className={btnSecondary}>
                <Copy className="h-4 w-4" />
                Copy Message
              </button>
              <button
                type="button"
                onClick={openWhatsApp}
                disabled={!String(reminderStudent?.phone ?? "").replace(/\D/g, "")}
                title={
                  String(reminderStudent?.phone ?? "").replace(/\D/g, "")
                    ? "Open this message in WhatsApp"
                    : "No phone number on this student"
                }
                className={`${btnSecondary} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <ExternalLink className="h-4 w-4" />
                Open in WhatsApp
              </button>
              <button type="button" onClick={sendEmail} className={btnPrimary}>
                <Mail className="h-4 w-4" />
                Send Email
              </button>
            </>
          )
        }
      >
        {reminderInvoice && reminderCtx && (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Student</p>
                <p className="font-medium text-[#0F172A]">{reminderStudent?.name ?? "Unknown"}</p>
                <p className="text-slate-500">Parent: {reminderCtx.parent}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Amount due</p>
                <p className="font-medium text-[#0F172A]">{reminderCtx.amount}</p>
                <p className="text-slate-500">Due {reminderCtx.due}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
                <div className="mt-1">
                  <StatusBadge
                    status={effectiveStatus(reminderInvoice, ref)}
                    days={reminderCtx.days}
                  />
                </div>
              </div>
            </div>

            <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-white p-1">
              {TONES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => chooseTone(t.id)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    tone === t.id
                      ? "bg-[#4F46E5] text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {TONE_LABELS[t.id]}
                </button>
              ))}
            </div>

            <label className="block text-sm font-medium text-slate-700">
              Message (editable)
              <textarea
                rows={10}
                value={message}
                onChange={(e) => setDraft(e.target.value)}
                className={`${inputOk} font-sans leading-relaxed`}
              />
            </label>

            <div className="flex flex-wrap items-center gap-4 rounded-lg bg-slate-50 p-4">
              {upiReady ? (
                <>
                  <img
                    src={buildUpiQrUrl({
                      upiId: settings.upiId,
                      payeeName: settings.businessName || settings.tutorName,
                      amount: reminderAmount,
                      note: reminderInvoice.id.toUpperCase(),
                    })}
                    alt="UPI QR"
                    width={160}
                    height={160}
                    className="h-40 w-40 rounded-md"
                  />
                  <div className="text-sm">
                    <p className="text-slate-600">
                      Scan to pay{" "}
                      <span className="font-medium text-[#0F172A]">{reminderCtx.amount}</span>
                    </p>
                    <p className="text-slate-500">UPI: {settings.upiId}</p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500">
                  No UPI ID set. Add your UPI ID in Settings to show a live payment QR code here.
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
