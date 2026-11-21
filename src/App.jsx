import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppState } from "./store/useAppState.js";
import { useAuth } from "./store/useAuth.js";
import { computeSummary, effectiveStatus } from "./utils/forecastEngine.js";
import Sidebar from "./components/Sidebar.jsx";
import Header from "./components/Header.jsx";
import Dashboard from "./components/Dashboard.jsx";
import Students from "./components/Students.jsx";
import Attendance from "./components/Attendance.jsx";
import Invoices from "./components/Invoices.jsx";
import Forecast from "./components/Forecast.jsx";
import Bills from "./components/Bills.jsx";
import Settings from "./components/Settings.jsx";
import AuthScreen from "./components/AuthScreen.jsx";
import AiCopilot from "./components/AiCopilot.jsx";

function App() {
  const auth = useAuth();
  const [state, actions] = useAppState();
  const [tab, setTab] = useState("dashboard");
  const [query, setQuery] = useState("");
  const [createSignal, setCreateSignal] = useState(0);
  const [reminderInvoice, setReminderInvoice] = useState(null);
  const [toast, setToast] = useState(null);

  const notify = useCallback((msg) => setToast(msg), []);

  // Auto-hide the toast after 2.5s.
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const summary = useMemo(
    () => computeSummary(state, state.settings.referenceDate),
    [state]
  );

  const overdueCount = useMemo(
    () =>
      state.invoices.filter(
        (inv) => effectiveStatus(inv, state.settings.referenceDate) === "Overdue"
      ).length,
    [state.invoices, state.settings.referenceDate]
  );

  const handleLogout = useCallback(() => {
    auth.signOut();
    setTab("dashboard");
    setQuery("");
  }, [auth]);

  // All hooks are above this line. Without a session, show the sign-in screen.
  if (!auth.session) {
    return <AuthScreen auth={auth} onAuthenticated={() => {}} />;
  }

  const navigate = (t) => {
    setTab(t);
    setQuery("");
  };

  const onNewInvoice = () => {
    setTab("invoices");
    setCreateSignal((n) => n + 1);
  };

  let module = null;
  switch (tab) {
    case "dashboard":
      module = (
        <Dashboard
          state={state}
          actions={actions}
          summary={summary}
          onNavigate={navigate}
          onOpenReminder={setReminderInvoice}
          notify={notify}
        />
      );
      break;
    case "students":
      module = <Students state={state} actions={actions} notify={notify} query={query} />;
      break;
    case "attendance":
      module = <Attendance state={state} actions={actions} notify={notify} />;
      break;
    case "invoices":
      module = (
        <Invoices
          state={state}
          actions={actions}
          notify={notify}
          query={query}
          createSignal={createSignal}
          reminderInvoice={reminderInvoice}
          onCloseReminder={() => setReminderInvoice(null)}
          onOpenReminder={setReminderInvoice}
        />
      );
      break;
    case "forecast":
      module = <Forecast state={state} actions={actions} notify={notify} />;
      break;
    case "bills":
      module = <Bills state={state} actions={actions} notify={notify} />;
      break;
    case "settings":
      module = <Settings state={state} actions={actions} notify={notify} />;
      break;
    default:
      module = null;
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 text-ink relative"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(99, 102, 241, 0.08) 1px, transparent 0)",
        backgroundSize: "24px 24px",
      }}
    >
      {/* Subtle background watermark */}
      <div className="pointer-events-none fixed inset-0 ml-64 flex items-center justify-center overflow-hidden select-none z-0">
        <span className="text-7xl font-black tracking-widest text-indigo-900/[0.03] -rotate-12">
          BACKOFFICE AI
        </span>
      </div>

      <Sidebar active={tab} onNavigate={navigate} counts={{ overdue: overdueCount }} />
      <div className="ml-64 min-h-screen flex flex-col relative z-10">
        <Header
          state={state}
          onNavigate={navigate}
          onNewInvoice={onNewInvoice}
          query={query}
          onSearch={setQuery}
          session={auth.session}
          onLogout={handleLogout}
        />
        <main className="p-6">{module}</main>
      </div>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
      <AiCopilot state={state} />
      <div className="pointer-events-none fixed bottom-2 right-3 z-20 select-none text-[11px] font-medium text-slate-500 opacity-30">
        BackOffice AI • Verified
      </div>
    </div>
  );
}

export default App;