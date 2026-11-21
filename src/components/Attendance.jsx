import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, PlusCircle, UserCheck, UserX, Sparkles } from "lucide-react";
import { addDays } from "../utils/forecastEngine.js";

const STORAGE_KEY = "backoffice_attendance_v1";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const STATUS_OPTIONS = [
  { id: "Present", label: "Present", active: "bg-emerald-600 text-white border-emerald-600" },
  { id: "Absent", label: "Absent", active: "bg-red-500 text-white border-red-500" },
  { id: "Extra", label: "Extra Class", active: "bg-[#4F46E5] text-white border-[#4F46E5]" },
];

export default function Attendance({ state, actions, notify }) {
  const refDate = state?.settings?.referenceDate || new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(refDate);
  const [extraFee, setExtraFee] = useState(350);
  const [records, setRecords] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {
      // ignore storage errors
    }
  }, [records]);

  const students = state?.students ?? [];
  const dayMap = records[date] || {};

  const markStatus = (studentId, status) => {
    setRecords((prev) => ({
      ...prev,
      [date]: {
        ...(prev[date] || {}),
        [studentId]: status,
      },
    }));
  };

  const markAllPresent = () => {
    const nextDay = {};
    for (const s of students) nextDay[s.id] = "Present";
    setRecords((prev) => ({ ...prev, [date]: nextDay }));
    notify("Marked all students Present");
  };

  const billExtraClass = (student) => {
    const amount = Number(extraFee) || 350;
    actions.addInvoice({
      studentId: student.id,
      amount,
      issueDate: date,
      dueDate: addDays(date, 7),
      period: `Extra Class (${date})`,
    });
    notify(`Added ${inr.format(amount)} extra-class invoice for ${student.name}`);
  };

  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let extra = 0;
    for (const s of students) {
      const st = dayMap[s.id];
      if (st === "Present") present += 1;
      else if (st === "Absent") absent += 1;
      else if (st === "Extra") extra += 1;
    }
    return {
      present,
      absent,
      extra,
      extraRevenue: extra * (Number(extraFee) || 0),
    };
  }, [students, dayMap, extraFee]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F172A]">Attendance & Extra Classes</h1>
          <p className="text-sm text-slate-500">
            Track daily attendance and bill extra-class sessions in one click.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Date:
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm text-[#0F172A]"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Extra Fee (₹):
            <input
              type="number"
              min={50}
              step={50}
              value={extraFee}
              onChange={(e) => setExtraFee(e.target.value)}
              className="w-24 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm text-[#0F172A]"
            />
          </label>
          <button
            type="button"
            onClick={markAllPresent}
            className="inline-flex items-center gap-2 rounded-lg bg-[#4F46E5] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            <CalendarCheck className="h-4 w-4" />
            Mark All Present
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium uppercase text-slate-500">
            Present <UserCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#0F172A]">{stats.present}</p>
        </div>
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium uppercase text-slate-500">
            Absent <UserX className="h-4 w-4 text-red-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#0F172A]">{stats.absent}</p>
        </div>
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium uppercase text-slate-500">
            Extra Classes <Sparkles className="h-4 w-4 text-[#4F46E5]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#0F172A]">{stats.extra}</p>
        </div>
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase text-slate-500">Extra Fees Earned</div>
          <p className="mt-2 text-2xl font-bold text-[#4F46E5]">{inr.format(stats.extraRevenue)}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#E2E8F0] bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Class / Subject</th>
              <th className="px-4 py-3">Status ({date})</th>
              <th className="px-4 py-3 text-right">Extra-Class Billing</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {students.map((s) => {
              const current = dayMap[s.id] || "";
              return (
                <tr key={s.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-medium text-[#0F172A]">
                    {s.name}
                    <div className="text-xs font-normal text-slate-500">{s.parent}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {s.classLevel} · {s.subject}
                  </td>
                  <td className="px-4 py-3">
                    <div className="inline-flex gap-1.5">
                      {STATUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => markStatus(s.id, opt.id)}
                          className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                            current === opt.id
                              ? opt.active
                              : "border-[#E2E8F0] bg-white text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {current === "Extra" ? (
                      <button
                        type="button"
                        onClick={() => billExtraClass(s)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        Bill {inr.format(Number(extraFee) || 350)}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">Mark Extra Class to bill</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}