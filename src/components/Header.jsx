import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Plus, Bell, Sun, Moon } from 'lucide-react'
import ProfileMenu from './ProfileMenu.jsx'

const THEME_KEY = 'bo_theme'

const readInitialTheme = () => {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch (err) {
    // localStorage unavailable (e.g. privacy mode) — fall back to OS preference
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const isOverdue = (inv, referenceDate) =>
  inv.status !== 'paid' && inv.dueDate < referenceDate

const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

export default function Header({ state, onNavigate, onNewInvoice, query, onSearch, session, onLogout }) {
  const [bellOpen, setBellOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [theme, setTheme] = useState(readInitialTheme)
  const wrapRef = useRef(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch (err) {
      // ignore storage failures; theme still applies for this session
    }
  }, [theme])

  const students = state.students || []
  const invoices = state.invoices || []
  const referenceDate = state.settings?.referenceDate || ''

  const studentName = (id) => students.find((s) => s.id === id)?.name || 'Unknown'

  const matches = useMemo(() => {
    const q = (query || '').trim().toLowerCase()
    if (!q) return { students: [], invoices: [] }
    const st = students
      .filter(
        (s) =>
          (s.name || '').toLowerCase().includes(q) ||
          (s.parent || '').toLowerCase().includes(q) ||
          (s.subject || '').toLowerCase().includes(q),
      )
      .slice(0, 6)
    const inv = invoices
      .filter((i) => {
        const name = (students.find((s) => s.id === i.studentId)?.name || '').toLowerCase()
        return name.includes(q) || (i.period || '').toLowerCase().includes(q)
      })
      .slice(0, 6)
    return { students: st, invoices: inv }
  }, [query, students, invoices])

  const overdue = useMemo(
    () => invoices.filter((i) => isOverdue(i, referenceDate)),
    [invoices, referenceDate],
  )

  useEffect(() => {
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setBellOpen(false)
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const showSearch = searchOpen && (query || '').trim() !== ''
  const hasMatches = matches.students.length > 0 || matches.invoices.length > 0

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div ref={wrapRef} className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          placeholder="Search students, parents, invoices…"
          onChange={(e) => {
            onSearch(e.target.value)
            setSearchOpen(true)
          }}
          onFocus={() => setSearchOpen(true)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />

        {showSearch && (
          <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
            {!hasMatches && (
              <div className="px-3 py-3 text-sm text-slate-500">No matches found</div>
            )}
            {matches.students.length > 0 && (
              <div>
                <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Students
                </div>
                {matches.students.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSearchOpen(false)
                      onNavigate('students')
                    }}
                    className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <span className="text-sm font-medium text-slate-900">{s.name}</span>
                    <span className="text-xs text-slate-500">
                      {[s.parent, s.subject].filter(Boolean).join(' · ')}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {matches.invoices.length > 0 && (
              <div className="border-t border-slate-100">
                <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Invoices
                </div>
                {matches.invoices.map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => {
                      setSearchOpen(false)
                      onNavigate('invoices')
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <span className="text-sm text-slate-900">
                      {studentName(i.studentId)} · {i.period}
                    </span>
                    <span className="text-xs text-slate-500">{formatINR(i.amount)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => onNewInvoice()}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          New Invoice
        </button>

        <button
          type="button"
          onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          aria-label="Toggle light/dark theme"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setBellOpen((o) => !o)}
            aria-label="Overdue invoices"
            className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          >
            <Bell className="h-5 w-5" />
            {overdue.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                {overdue.length}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 top-full z-40 mt-2 w-80 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
              <div className="border-b border-slate-100 px-4 py-2 text-sm font-semibold text-slate-900">
                Overdue invoices
              </div>
              {overdue.length === 0 ? (
                <div className="px-4 py-4 text-sm text-slate-500">No overdue invoices</div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {overdue.slice(0, 5).map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <span className="truncate text-sm text-slate-700">
                        {studentName(i.studentId)} · {formatINR(i.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setBellOpen(false)
                          onNavigate('invoices')
                        }}
                        className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                      >
                        View
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
          <ProfileMenu session={session} onLogout={onLogout} onNavigate={onNavigate} />
        </div>
      </div>
    </header>
  )
}
