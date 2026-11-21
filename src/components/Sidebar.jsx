import { LayoutDashboard, Users, CalendarCheck, Receipt, TrendingUp, CalendarClock, Settings, IndianRupee } from 'lucide-react'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
  { id: 'invoices', label: 'Invoices', icon: Receipt, badgeKey: 'overdue' },
  { id: 'forecast', label: 'Cash Forecast', icon: TrendingUp },
  { id: 'bills', label: 'Upcoming Bills', icon: CalendarClock },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ active, onNavigate, counts = {} }) {
  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 flex flex-col">
      <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-200">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
          <IndianRupee className="h-5 w-5" />
        </div>
        <div>
          <div className="font-semibold text-slate-900 leading-tight">BackOffice AI</div>
          <div className="text-xs text-slate-500">Tuition cash desk</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV.map(({ id, label, icon: Icon, badgeKey }) => {
          const isActive = active === id
          const badge = badgeKey ? counts[badgeKey] : 0
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{label}</span>
              {badge > 0 && (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-400">
        Mehta Tuition Centre · v0.1
      </div>
    </aside>
  )
}