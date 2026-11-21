import { useMemo, useState } from "react";
import { Sparkles, X, Send, Bot } from "lucide-react";
import { daysOverdue, effectiveStatus, invoiceOutstanding } from "../utils/forecastEngine.js";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const QUICK_PROMPTS = [
  "Who owes me the most?",
  "How much is overdue right now?",
  "How much have I collected?",
  "Which students need a reminder today?",
];

export default function AiCopilot({ state }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "Hi! I'm your BackOffice AI Copilot. Ask me about overdue fees, top pending students, or your cashflow.",
    },
  ]);

  const ref = state?.settings?.referenceDate;
  const students = state?.students ?? [];
  const invoices = state?.invoices ?? [];

  const insights = useMemo(() => {
    const studentMap = Object.fromEntries(students.map((s) => [s.id, s]));
    let totalCollected = 0;
    let totalPending = 0;
    let totalOverdue = 0;
    const overdueList = [];
    const owedByStudent = {};

    for (const inv of invoices) {
      const status = effectiveStatus(inv, ref);
      const amt = Number(inv.amount) || 0;
      const out = invoiceOutstanding(inv) || amt;

      if (status === "Paid") {
        totalCollected += amt;
      } else {
        totalPending += out;
        owedByStudent[inv.studentId] = (owedByStudent[inv.studentId] || 0) + out;
        if (status === "Overdue") {
          totalOverdue += out;
          overdueList.push({
            student: studentMap[inv.studentId]?.name ?? "Unknown",
            parent: studentMap[inv.studentId]?.parent ?? "Parent",
            amount: out,
            days: daysOverdue(inv, ref),
          });
        }
      }
    }

    overdueList.sort((a, b) => b.days - a.days);

    const topOwed = Object.entries(owedByStudent)
      .map(([id, amount]) => ({ name: studentMap[id]?.name ?? "Unknown", amount }))
      .sort((a, b) => b.amount - a.amount);

    return { totalCollected, totalPending, totalOverdue, overdueList, topOwed };
  }, [students, invoices, ref]);

  const answerQuestion = (question) => {
    const q = question.toLowerCase();

    if (q.includes("most") || q.includes("top") || q.includes("owes")) {
      if (!insights.topOwed.length) return "Great news! Nobody currently owes you any pending fees.";
      const top3 = insights.topOwed
        .slice(0, 3)
        .map((s, i) => `${i + 1}. ${s.name} — ${inr.format(s.amount)}`)
        .join("\n");
      return `Here are the top pending balances right now:\n${top3}`;
    }

    if (q.includes("overdue") || q.includes("late")) {
      if (!insights.overdueList.length) return "You have ₹0 in overdue invoices right now.";
      return `You have ${insights.overdueList.length} overdue invoice(s) totaling ${inr.format(
        insights.totalOverdue
      )}. Most urgent: ${insights.overdueList[0].student} (${inr.format(
        insights.overdueList[0].amount
      )}, ${insights.overdueList[0].days} days overdue).`;
    }

    if (q.includes("collect") || q.includes("paid") || q.includes("earned")) {
      return `You have collected ${inr.format(
        insights.totalCollected
      )} so far, with ${inr.format(insights.totalPending)} still pending across active invoices.`;
    }

    if (q.includes("reminder") || q.includes("chase") || q.includes("today")) {
      if (!insights.overdueList.length) return "No urgent reminders needed today—all invoices are on track!";
      const names = insights.overdueList
        .slice(0, 3)
        .map((o) => `• ${o.student} (${inr.format(o.amount)} · ${o.days}d late)`)
        .join("\n");
      return `Send WhatsApp reminders to these students first:\n${names}`;
    }

    return `Snapshot: ${inr.format(insights.totalCollected)} collected, ${inr.format(
      insights.totalPending
    )} total owed (${inr.format(insights.totalOverdue)} overdue across ${
      insights.overdueList.length
    } invoice(s)). Try asking "Who owes me the most?" or "Which students need a reminder today?"`;
  };

  const handleSend = (text) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed) return;
    const reply = answerQuestion(trimmed);
    setMessages((prev) => [...prev, { role: "user", text: trimmed }, { role: "ai", text: reply }]);
    setInput("");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-12 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-[#4F46E5] px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-indigo-700"
      >
        <Sparkles className="h-4 w-4" />
        Ask BackOffice AI
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex w-80 max-w-[92vw] flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl sm:w-96">
          <div className="flex items-center justify-between bg-[#4F46E5] px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <div>
                <p className="text-sm font-semibold">BackOffice AI Copilot</p>
                <p className="text-[11px] text-indigo-100">Live cashflow assistant</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-indigo-100 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-72 space-y-3 overflow-y-auto p-4 text-sm">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`whitespace-pre-line rounded-xl px-3 py-2 ${
                  m.role === "user"
                    ? "ml-8 bg-[#4F46E5] text-white"
                    : "mr-6 border border-[#E2E8F0] bg-slate-50 text-[#0F172A]"
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5 border-t border-[#E2E8F0] px-3 py-2">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handleSend(p)}
                className="rounded-full border border-[#E2E8F0] bg-white px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100"
              >
                {p}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 border-t border-[#E2E8F0] p-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about fees or cashflow..."
              className="flex-1 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm text-[#0F172A] focus:border-[#4F46E5] focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-[#4F46E5] p-2 text-white hover:bg-indigo-700"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}