import { useMemo, useState } from "react";
import {
  Wallet,
  Receipt,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Send,
  Check,
  X,
  Bell,
  CalendarClock,
  Eye,
  Inbox,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  buildForecast,
  daysBetween,
  daysOverdue,
  effectiveStatus,
  invoiceOutstanding,
  parseISO,
} from "../utils/forecastEngine.js";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const fmtShortDate = (iso) =>
  parseISO(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

const card = "rounded-xl border border-[#E2E8F0] bg-white shadow-sm";
const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-lg bg-[#4F46E5] px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700";
const btnGhost =
  "inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50";
const btnGreen =
  "inline-flex items-center gap-1.5 rounded-lg bg-[#10B981] px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-600";

const URGENCY = {
  Critical: "bg-red-50 text-red-700 ring-red-600/20",
  Overdue: "bg-amber-50 text-amber-700 ring-amber-600/20",
  Upcoming: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

function KpiCard({ label, value, sub, icon: Icon, tone, iconBg }) {
  return (
    <div className={`${card} p-5`}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <div className={`rounded-lg p-2 ${iconBg}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className={`mt-3 text-2xl font-semibold ${tone}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export default function Dashboard({ state, actions, summary, onNavigate, onOpenReminder, notify }) {
  const ref = state.settings.referenceDate;
  const [dismissed, setDismissed] = useState(() => new Set());

  const studentById = useMemo(
    () => Object.fromEntries(state.students.map((s) => [s.id, s])),
    [state.students]
  );

  // Unpaid invoices (Overdue or Pending), most overdue first, then earliest due date.
  const owed = useMemo(
    () =>
      state.invoices
        .filter((inv) => effectiveStatus(inv, ref) !== "Paid")
        .map((inv) => ({
          inv,
          status: effectiveStatus(inv, ref),
          days: daysOverdue(inv, ref),
          student: studentById[inv.studentId],
        }))
        .sort((a, b) => b.days - a.days || a.inv.dueDate.localeCompare(b.inv.dueDate)),
    [state.invoices, studentById, ref]
  );

  const alerts = useMemo(() => {
    const list = [];
    for (const row of owed) {
      if (row.status === "Overdue" && row.days >= 7) {
        list.push({ key: `inv:${row.inv.id}`, kind: "invoice", row });
      }
    }
    for (const bill of state.bills) {
      if (bill.paid) continue;
      const n = daysBetween(ref, bill.nextDueDate);
      if (n >= 0 && n <= 10) {
        list.push({ key: `bill:${bill.id}`, kind: "bill", bill, days: n });
      }
    }
    return list.filter((a) => !dismissed.has(a.key));
  }, [owed, state.bills, ref, dismissed]);

  const forecast = useMemo(
    () =>
      buildForecast({
        state,
        horizonDays: 30,
        referenceDate: ref,
        overrides: {},
      }).map((d) => ({
        ...d,
        label: fmtShortDate(d.date),
      })),
    [state, ref]
  );

  const dismiss = (key) => setDismissed((prev) => new Set(prev).add(key));

  const markInvoice = (inv) => {
    actions.markInvoicePaid(inv.id, ref);
    notify("Marked as paid");
  };

  const markBill = (bill) => {
    actions.markBillPaid(bill.id, ref);
    notify(`${bill.name} marked as paid`);
  };

  const net = summary.next30NetCash;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#0F172A]">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Cash position and collections as of {fmtShortDate(ref)}.
        </p>
      </div>

      {/* a) KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Cash in Hand"
          value={inr.format(summary.cashInHand)}
          sub="Opening cash + collected − bills paid"
          icon={Wallet}
          tone="text-[#0F172A]"
          iconBg="bg-indigo-50 text-[#4F46E5]"
        />
        <KpiCard
          label="Total Owed"
          value={inr.format(summary.totalOwed)}
          sub={`${inr.format(summary.overdueTotal)} overdue`}
          icon={Receipt}
          tone="text-[#F59E0B]"
          iconBg="bg-amber-50 text-[#F59E0B]"
        />
        <KpiCard
          label="Collected This Month"
          value={inr.format(summary.collectedThisMonth)}
          sub="Paid invoices this month"
          icon={CheckCircle2}
          tone="text-[#10B981]"
          iconBg="bg-emerald-50 text-[#10B981]"
        />
        <KpiCard
          label="Next 30-Day Net Cash"
          value={`${net >= 0 ? "+" : "−"}${inr.format(Math.abs(net))}`}
          sub="Expected in minus bills out"
          icon={net >= 0 ? TrendingUp : TrendingDown}
          tone={net >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}
          iconBg={net >= 0 ? "bg-emerald-50 text-[#10B981]" : "bg-red-50 text-[#EF4444]"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* b) Who owes me */}
        <div className={`${card} xl:col-span-2 overflow-hidden`}>
          <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
            <h2 className="font-semibold text-[#0F172A]">Who Owes Me</h2>
            <button
              type="button"
              onClick={() => onNavigate("invoices")}
              className="text-xs font-medium text-[#4F46E5] hover:underline"
            >
              View all invoices
            </button>
          </div>

          {owed.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <div className="mb-3 rounded-full bg-emerald-50 p-3 text-[#10B981]">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="font-medium text-[#0F172A]">Nothing outstanding</p>
              <p className="mt-1 text-sm text-slate-500">Every invoice is paid up.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#E2E8F0] text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Student / Parent</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Since</th>
                    <th className="px-4 py-3">Urgency</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {owed.map(({ inv, status, days, student }) => {
                    const urgency =
                      status !== "Overdue" ? "Upcoming" : days > 14 ? "Critical" : "Overdue";
                    const since =
                      status === "Overdue"
                        ? `${days} day${days === 1 ? "" : "s"} overdue`
                        : (() => {
                            const n = daysBetween(ref, inv.dueDate);
                            return n === 0 ? "Due today" : `Due in ${n} day${n === 1 ? "" : "s"}`;
                          })();
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-[#0F172A]">{student?.name ?? "Unknown"}</p>
                          <p className="text-xs text-slate-500">{student?.parent ?? "—"}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-[#0F172A]">
                          {inr.format(invoiceOutstanding(inv) || Number(inv.amount) || 0)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{since}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${URGENCY[urgency]}`}
                          >
                            {urgency}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => onOpenReminder(inv)}
                              className={btnGhost}
                            >
                              <Send className="h-3.5 w-3.5" />
                              Send Reminder
                            </button>
                            <button type="button" onClick={() => markInvoice(inv)} className={btnGreen}>
                              <Check className="h-3.5 w-3.5" />
                              Mark Paid
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

        {/* c) Alert feed */}
        <div className={`${card} p-5`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-[#0F172A]">Action Alerts</h2>
            <Bell className="h-4 w-4 text-slate-400" />
          </div>

          {alerts.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <div className="mb-3 rounded-full bg-emerald-50 p-3 text-[#10B981]">
                <Inbox className="h-6 w-6" />
              </div>
              <p className="font-medium text-[#0F172A]">All clear</p>
              <p className="mt-1 text-sm text-slate-500">No urgent follow-ups right now.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {alerts.map((alert) => (
                <li
                  key={alert.key}
                  className={`relative rounded-lg border p-4 ${
                    alert.kind === "invoice"
                      ? "border-red-100 bg-red-50/40"
                      : "border-amber-100 bg-amber-50/40"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => dismiss(alert.key)}
                    className="absolute right-2 top-2 rounded p-1 text-slate-400 hover:bg-white hover:text-slate-600"
                    aria-label="Dismiss alert"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>

                  {alert.kind === "invoice" ? (
                    <>
                      <p className="pr-6 text-sm text-[#0F172A]">
                        Chase{" "}
                        <span className="font-semibold">{alert.row.student?.name ?? "Unknown"}</span>
                        's {inr.format(invoiceOutstanding(alert.row.inv) || Number(alert.row.inv.amount) || 0)}{" "}
                        invoice today — {alert.row.days} days overdue
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenReminder(alert.row.inv)}
                          className={btnPrimary}
                        >
                          <Send className="h-3.5 w-3.5" />
                          Send Reminder
                        </button>
                        <button
                          type="button"
                          onClick={() => markInvoice(alert.row.inv)}
                          className={btnGhost}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Mark Paid
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="pr-6 text-sm text-[#0F172A]">
                        <span className="font-semibold">{alert.bill.name}</span> of{" "}
                        {inr.format(Number(alert.bill.amount) || 0)} due in {alert.days}{" "}
                        day{alert.days === 1 ? "" : "s"}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <button type="button" onClick={() => markBill(alert.bill)} className={btnGreen}>
                          <Check className="h-3.5 w-3.5" />
                          Mark Paid
                        </button>
                        <button type="button" onClick={() => onNavigate("bills")} className={btnGhost}>
                          <Eye className="h-3.5 w-3.5" />
                          View Bills
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* d) 30-day cash balance */}
      <div className={`${card} p-5`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold text-[#0F172A]">30-day cash balance</h2>
            <p className="text-xs text-slate-500">
              <CalendarClock className="mr-1 inline h-3.5 w-3.5" />
              Projected from {fmtShortDate(ref)} using expected collections and bill dates
            </p>
          </div>
        </div>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={forecast} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} minTickGap={24} />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748B" }}
                tickFormatter={(v) => inr.format(v)}
                width={90}
              />
              <Tooltip
                formatter={(v) => [inr.format(v), "30-day cash balance"]}
                labelStyle={{ color: "#0F172A" }}
              />
              <Area
                type="monotone"
                dataKey="balance"
                name="30-day cash balance"
                stroke="#4F46E5"
                strokeWidth={2}
                fill="url(#balanceFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
