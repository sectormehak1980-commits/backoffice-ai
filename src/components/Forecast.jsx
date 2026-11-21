import { useMemo, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Check, RotateCcw, TrendingUp, Wallet } from "lucide-react";
import {
  buildForecast,
  cashInHand,
  chaseRecommendations,
  findCashCrunch,
  parseISO,
  presetBadDay,
  presetLatePayment,
} from "../utils/forecastEngine.js";

const HORIZONS = [30, 60, 90];
const LATE_DAYS = 15;
const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const fmt = (n) => inr.format(n);
const fmtDate = (iso) =>
  parseISO(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const fmtShort = (iso) => parseISO(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
        checked ? "bg-indigo-600" : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function Chip({ label, value, sub, icon: Icon, tone }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <Icon className={`h-4 w-4 ${tone}`} />
      </div>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export default function Forecast({ state, actions, notify }) {
  const ref = state.settings.referenceDate;

  const [horizon, setHorizon] = useState(30);
  const [lateOn, setLateOn] = useState(false);
  const [lateStudentId, setLateStudentId] = useState(null);

  const [badOn, setBadOn] = useState(false);
  const [badCount, setBadCount] = useState(3);
  const [badDays, setBadDays] = useState(20);

  // Student with the largest unpaid amount is the default for Preset 1.
  const defaultStudentId = useMemo(() => {
    const totals = {};
    for (const invoice of state.invoices) {
      if (invoice.status === "Paid") continue;
      totals[invoice.studentId] = (totals[invoice.studentId] || 0) + (Number(invoice.amount) || 0);
    }
    let best = null;
    let bestAmount = -1;
    for (const [id, amount] of Object.entries(totals)) {
      if (amount > bestAmount) {
        best = id;
        bestAmount = amount;
      }
    }
    return best ?? state.students[0]?.id ?? null;
  }, [state.invoices, state.students]);

  const selectedStudentId = lateStudentId ?? defaultStudentId;
  const stressActive = lateOn || badOn;

  // Merge both presets; add delays when the same invoice is hit by both.
  const overrides = useMemo(() => {
    const parts = [];
    if (lateOn && selectedStudentId) {
      parts.push(presetLatePayment({ state, studentId: selectedStudentId, days: LATE_DAYS }));
    }
    if (badOn) {
      parts.push(presetBadDay({ state, count: badCount, days: badDays }));
    }
    const delayByInvoiceId = {};
    for (const part of parts) {
      for (const [invoiceId, days] of Object.entries(part.delayByInvoiceId)) {
        delayByInvoiceId[invoiceId] = (delayByInvoiceId[invoiceId] || 0) + days;
      }
    }
    return { delayByInvoiceId };
  }, [state, lateOn, selectedStudentId, badOn, badCount, badDays]);

  const baseForecast = useMemo(
    () => buildForecast({ state, horizonDays: horizon, referenceDate: ref }),
    [state, horizon, ref]
  );

  const forecast = useMemo(
    () => buildForecast({ state, horizonDays: horizon, referenceDate: ref, overrides }),
    [state, horizon, ref, overrides]
  );

  const chartData = useMemo(
    () =>
      forecast.map((row, i) => ({
        label: fmtShort(row.date),
        date: row.date,
        incoming: row.incoming,
        outgoing: row.outgoing,
        balance: row.balance,
        baseBalance: baseForecast[i].balance,
      })),
    [forecast, baseForecast]
  );

  const crunch = useMemo(() => findCashCrunch(forecast), [forecast]);

  const lowest = useMemo(
    () => forecast.reduce((min, row) => (row.balance < min.balance ? row : min), forecast[0]),
    [forecast]
  );

  const totals = useMemo(
    () =>
      forecast.reduce(
        (t, row) => ({ incoming: t.incoming + row.incoming, outgoing: t.outgoing + row.outgoing }),
        { incoming: 0, outgoing: 0 }
      ),
    [forecast]
  );

  const recs = useMemo(
    () => chaseRecommendations({ state, referenceDate: ref, horizonDays: horizon }),
    [state, ref, horizon]
  );

  const startingCash = cashInHand(state);

  const resetStress = () => {
    setLateOn(false);
    setBadOn(false);
  };

  const recommendationText = !crunch
    ? "Your cash stays above ₹0 — no chasing needed."
    : recs.invoicesToChase.length > 0
      ? `Chase these first to cover ${fmt(recs.shortfallAmount)} shortfall`
      : "No overdue or pending invoices to chase at current balances; the shortfall comes from the delays above.";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Cash Forecast</h1>
          <p className="text-sm text-slate-500">Projected balance from expected receipts and recurring bills.</p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          {HORIZONS.map((days) => (
            <button
              key={days}
              type="button"
              aria-pressed={horizon === days}
              onClick={() => setHorizon(days)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                horizon === days ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {days} days
            </button>
          ))}
        </div>
      </header>

      {crunch && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">
            Cash drops below ₹0 on {fmtDate(crunch.date)} — shortfall {fmt(crunch.shortfall)}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Chip label="Starting balance" value={fmt(startingCash)} icon={Wallet} tone="text-indigo-600" />
        <Chip
          label="Total incoming"
          value={fmt(totals.incoming)}
          sub={`Next ${horizon} days`}
          icon={TrendingUp}
          tone="text-emerald-500"
        />
        <Chip
          label="Total outgoing"
          value={fmt(totals.outgoing)}
          sub={`Next ${horizon} days`}
          icon={AlertTriangle}
          tone="text-amber-500"
        />
        <Chip
          label="Lowest balance"
          value={lowest ? fmt(lowest.balance) : "—"}
          sub={lowest ? `on ${fmtDate(lowest.date)}` : undefined}
          icon={AlertTriangle}
          tone={lowest && lowest.balance < 0 ? "text-red-500" : "text-slate-400"}
        />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Projected balance</h2>
          {stressActive && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              Stress test active
            </span>
          )}
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} minTickGap={24} />
            <YAxis
              tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
              tick={{ fontSize: 11, fill: "#64748B" }}
              width={56}
            />
            <Tooltip
              formatter={(value, name) => [fmt(value), name]}
              labelFormatter={(_, payload) => (payload?.[0]?.payload ? fmtDate(payload[0].payload.date) : "")}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={0} stroke="#EF4444" strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="balance"
              name="Balance"
              stroke="#4F46E5"
              fill="#4F46E5"
              fillOpacity={0.12}
              strokeWidth={2}
            />
            {stressActive && (
              <Line
                type="monotone"
                dataKey="baseBalance"
                name="Base balance"
                stroke="#94A3B8"
                strokeDasharray="4 4"
                dot={false}
                strokeWidth={1.5}
              />
            )}
            <Bar dataKey="incoming" name="Incoming" fill="#10B981" barSize={6} />
            <Line type="monotone" dataKey="outgoing" name="Outgoing" stroke="#F59E0B" dot={false} strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">What-If & Bad Day Stress Test</h2>
          <p className="text-sm text-slate-500">Turn on a scenario to see how the forecast changes.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Key Customer Pays 15 Days Late</h3>
                <p className="mt-1 text-xs text-slate-500">All unpaid invoices of one student slip by 15 days.</p>
              </div>
              <Switch
                checked={lateOn}
                onChange={setLateOn}
                label="Toggle key customer pays late"
              />
            </div>
            <label className="mt-4 block text-xs font-medium text-slate-600" htmlFor="late-student">
              Student
            </label>
            <select
              id="late-student"
              value={selectedStudentId ?? ""}
              disabled={!lateOn}
              onChange={(e) => setLateStudentId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400"
            >
              {state.students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Bad Day Mode: Customers Pay Late</h3>
                <p className="mt-1 text-xs text-slate-500">The largest unpaid invoices are paid late.</p>
              </div>
              <Switch checked={badOn} onChange={setBadOn} label="Toggle bad day mode" />
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-600">
                  <label htmlFor="bad-count">Top invoices affected</label>
                  <span className="text-slate-900">{badCount}</span>
                </div>
                <input
                  id="bad-count"
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={badCount}
                  disabled={!badOn}
                  onChange={(e) => setBadCount(Number(e.target.value))}
                  className="mt-1 w-full accent-indigo-600 disabled:opacity-50"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-600">
                  <label htmlFor="bad-days">Days late</label>
                  <span className="text-slate-900">{badDays} days</span>
                </div>
                <input
                  id="bad-days"
                  type="range"
                  min={10}
                  max={30}
                  step={1}
                  value={badDays}
                  disabled={!badOn}
                  onChange={(e) => setBadDays(Number(e.target.value))}
                  className="mt-1 w-full accent-indigo-600 disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Result</h3>
            {crunch ? (
              <p className="mt-2 flex items-start gap-2 text-sm text-red-600">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Cash crunch on {fmtDate(crunch.date)} — shortfall {fmt(crunch.shortfall)}
              </p>
            ) : (
              <p className="mt-2 flex items-start gap-2 text-sm text-emerald-600">
                <Check className="mt-0.5 h-4 w-4 shrink-0" />
                No cash crunch in this window
              </p>
            )}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={resetStress}
                disabled={!stressActive}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Stress Test
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Recommendation</h3>
            <p className="mt-2 text-sm text-slate-700">{recommendationText}</p>
            {crunch && recs.invoicesToChase.length > 0 && (
              <ul className="mt-3 divide-y divide-slate-100">
                {recs.invoicesToChase.map(({ invoice, studentName, amount, daysOverdue, cumulative }) => (
                  <li key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{studentName}</p>
                      <p className="text-xs text-slate-500">
                        {daysOverdue > 0 ? (
                          <span className="text-red-600">{daysOverdue} days overdue</span>
                        ) : (
                          <span>Due {fmtDate(invoice.dueDate)}</span>
                        )}
                        {" · "}Running total {fmt(cumulative)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-slate-900">{fmt(amount)}</span>
                      <button
                        type="button"
                        onClick={() => {
                          actions.markInvoicePaid(invoice.id, state.settings.referenceDate);
                          notify?.(`Marked ${studentName}'s invoice as paid`);
                        }}
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-600"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Mark Paid
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <p className="text-xs text-slate-500">
        Overdue invoices are assumed to be paid on the reference date (or after any stress-test delay); pending invoices on their due date. Rent and bills recur monthly.
      </p>
    </div>
  );
}
