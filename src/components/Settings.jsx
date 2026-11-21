import { useEffect, useState } from "react";
import { AlertTriangle, Calendar, Download, RotateCcw, Save, Wallet } from "lucide-react";
import Modal from "./Modal.jsx";

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100";

const PROFILE_KEYS = [
  "tutorName",
  "businessName",
  "email",
  "phone",
  "address",
  "upiId",
  "reminderSignature",
];

const pick = (source, keys) => Object.fromEntries(keys.map((k) => [k, source[k] ?? ""]));

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

function SectionCard({ title, description, icon: Icon, children, footer }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
        {Icon && (
          <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
        </div>
      </div>
      <div className="px-5 py-5">{children}</div>
      {footer && <div className="flex justify-end border-t border-slate-200 px-5 py-3">{footer}</div>}
    </section>
  );
}

const saveBtn =
  "inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700";

export default function Settings({ state, actions, notify }) {
  const settings = state.settings;

  const [profile, setProfile] = useState(() => pick(settings, PROFILE_KEYS));
  const [cash, setCash] = useState(() => ({
    startingCash: String(settings.startingCash ?? ""),
    referenceDate: settings.referenceDate ?? "",
  }));
  const [cashErrors, setCashErrors] = useState({});
  const [confirmReset, setConfirmReset] = useState(false);

  // Keep the forms in sync when settings change elsewhere (e.g. after a reset).
  useEffect(() => {
    setProfile(pick(settings, PROFILE_KEYS));
    setCash({
      startingCash: String(settings.startingCash ?? ""),
      referenceDate: settings.referenceDate ?? "",
    });
  }, [settings]);

  const saveProfile = () => {
    actions.updateSettings({ ...profile });
    notify?.("Settings saved");
  };

  const saveCash = () => {
    const next = {};
    const startingCash = Number(cash.startingCash);
    if (cash.startingCash === "" || !Number.isFinite(startingCash)) {
      next.startingCash = "Enter a valid amount.";
    }
    if (!cash.referenceDate) next.referenceDate = "Pick a reference date.";
    setCashErrors(next);
    if (Object.keys(next).length > 0) return;

    actions.updateSettings({ startingCash, referenceDate: cash.referenceDate });
    notify?.("Settings saved");
  };

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `backoffice-ai-backup-${settings.referenceDate}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    notify?.("Backup downloaded");
  };

  const confirmResetDemo = () => {
    actions.resetDemoData();
    setConfirmReset(false);
    notify?.("Demo data restored");
  };

  const setProfileField = (key) => (e) => setProfile((p) => ({ ...p, [key]: e.target.value }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Business details, cash baseline and data management.</p>
      </header>

      <SectionCard
        title="Business Profile"
        description="Shown on invoices and reminder messages."
        footer={
          <button type="button" onClick={saveProfile} className={saveBtn}>
            <Save className="h-4 w-4" />
            Save profile
          </button>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Tutor name">
            <input className={inputCls} value={profile.tutorName} onChange={setProfileField("tutorName")} />
          </Field>
          <Field label="Business name">
            <input className={inputCls} value={profile.businessName} onChange={setProfileField("businessName")} />
          </Field>
          <Field label="Email">
            <input type="email" className={inputCls} value={profile.email} onChange={setProfileField("email")} />
          </Field>
          <Field label="Phone">
            <input type="tel" className={inputCls} value={profile.phone} onChange={setProfileField("phone")} />
          </Field>
          <Field label="UPI ID">
            <input className={inputCls} value={profile.upiId} onChange={setProfileField("upiId")} />
          </Field>
          <Field label="Address">
            <input className={inputCls} value={profile.address} onChange={setProfileField("address")} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Reminder signature" hint="Appended to payment reminder messages.">
              <textarea
                rows={2}
                className={inputCls}
                value={profile.reminderSignature}
                onChange={setProfileField("reminderSignature")}
              />
            </Field>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Cash & Dates"
        description="Opening cash and the date the app treats as today."
        icon={Wallet}
        footer={
          <button type="button" onClick={saveCash} className={saveBtn}>
            <Save className="h-4 w-4" />
            Save cash & dates
          </button>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Starting cash (₹)">
            <input
              type="number"
              step="1"
              className={inputCls}
              value={cash.startingCash}
              onChange={(e) => setCash((c) => ({ ...c, startingCash: e.target.value }))}
            />
            {cashErrors.startingCash && (
              <span className="mt-1 block text-xs text-red-600">{cashErrors.startingCash}</span>
            )}
          </Field>
          <Field label="Reference date">
            <input
              type="date"
              className={inputCls}
              value={cash.referenceDate}
              onChange={(e) => setCash((c) => ({ ...c, referenceDate: e.target.value }))}
            />
            {cashErrors.referenceDate ? (
              <span className="mt-1 block text-xs text-red-600">{cashErrors.referenceDate}</span>
            ) : (
              <span className="mt-1 block text-xs text-slate-500">
                Reference date is the &lsquo;today&rsquo; used for overdue and forecast calculations.
              </span>
            )}
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        title="Data"
        description="Back up your records or restore the demo dataset."
        icon={Calendar}
      >
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={exportBackup}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Export backup
          </button>
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Demo Data
          </button>
        </div>
      </SectionCard>

      <Modal
        open={confirmReset}
        title="Reset demo data?"
        onClose={() => setConfirmReset(false)}
        widthClass="max-w-sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmResetDemo}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
            >
              Reset data
            </button>
          </>
        }
      >
        <p className="flex items-start gap-2 text-sm text-slate-600">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          All students, invoices, bills and settings will be replaced with the demo data. This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
