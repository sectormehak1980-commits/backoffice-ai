import { useState } from 'react'
import {
  Wallet,
  LogIn,
  UserPlus,
  Mail,
  Sparkles,
  TrendingUp,
  CalendarCheck,
  QrCode,
  ShieldCheck,
  IndianRupee,
} from 'lucide-react'

const inputClass =
  'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white'

function Field({ label, id, ...inputProps }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <input id={id} className={inputClass} {...inputProps} />
    </div>
  )
}

const FEATURES = [
  {
    icon: QrCode,
    title: 'UPI QR & WhatsApp Reminders',
    desc: 'Generate instant fee invoices with scannable UPI QR codes and 1-click parent reminders.',
  },
  {
    icon: Sparkles,
    title: 'AI Cashflow Copilot',
    desc: 'Ask who owes fees, draft polite parent messages, and get daily collection priorities.',
  },
  {
    icon: CalendarCheck,
    title: 'Attendance & Extra-Class Billing',
    desc: 'Track daily attendance and convert extra classes into billable invoices in one click.',
  },
  {
    icon: TrendingUp,
    title: '30-Day Cash Forecast',
    desc: 'See upcoming rent, Wi-Fi, and expected fee collections before a cash crunch hits.',
  },
]

export default function AuthScreen({ onAuthenticated, auth }) {
  const [mode, setMode] = useState('signin')
  const [name, setName] = useState('')
  const [centreName, setCentreName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const isSignUp = mode === 'signup'

  const switchMode = (next) => {
    setMode(next)
    setError('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    const result = isSignUp
      ? auth.signUp({ name, centreName, email, password })
      : auth.signIn({ email, password })
    if (!result.ok) {
      setError(result.error)
      return
    }
    onAuthenticated(result.session)
  }

  const handleDemo = () => {
    setError('')
    const result = auth.signInAsDemo()
    if (!result.ok) {
      setError(result.error)
      return
    }
    onAuthenticated(result.session)
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-slate-50">
      {/* Left Hero / Welcome Panel */}
      <div className="relative hidden lg:flex lg:col-span-7 flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-12 text-white">
        {/* Subtle decorative glow & grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.35) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />

        {/* Watermark icon in background */}
        <IndianRupee className="pointer-events-none absolute right-8 bottom-12 h-64 w-64 text-white/[0.04]" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <IndianRupee className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-lg font-semibold tracking-tight">BackOffice AI</div>
            <div className="text-xs text-indigo-200/80">Smart Tuition Cash Desk</div>
          </div>
        </div>

        {/* Main Pitch & Features */}
        <div className="relative z-10 my-auto py-8 max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3 py-1 text-xs font-medium text-indigo-200 mb-5">
            <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
            Built for Indian Home Tutors & Coaching Centres
          </div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Run your tuition centre without chasing fees.
          </h1>
          <p className="mt-3 text-sm text-slate-300 leading-relaxed">
            Track students, mark daily attendance, bill extra classes, and collect overdue fees faster with UPI QR codes, WhatsApp reminders, and an AI cashflow copilot.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-cyan-300 mb-2.5">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="text-sm font-semibold text-white">{title}</div>
                <div className="mt-1 text-xs text-slate-300 leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Trust / Live Preview Strip */}
        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-5 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>100% browser-based · Instant demo data included</span>
          </div>
          <span className="text-indigo-200 font-medium">₹ INR · UPI · WhatsApp Ready</span>
        </div>
      </div>

      {/* Right Sign-In / Sign-Up Panel */}
      <div className="lg:col-span-5 flex items-center justify-center p-6 sm:p-10 bg-gradient-to-b from-slate-50 to-indigo-50/40">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-6 lg:items-start">
            <div className="h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm lg:hidden">
              <Wallet className="h-6 w-6 text-white" />
            </div>
            <h2 className="mt-4 lg:mt-0 text-2xl font-bold text-slate-900">
              {isSignUp ? 'Create your tuition desk' : 'Welcome back'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isSignUp
                ? 'Set up your centre in under 30 seconds.'
                : 'Sign in or explore instantly with the demo account.'}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-200/50 w-full p-7">
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 mb-6" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={!isSignUp}
                onClick={() => switchMode('signin')}
                className={`rounded-md py-2 text-sm font-medium transition-colors ${
                  !isSignUp ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isSignUp}
                onClick={() => switchMode('signup')}
                className={`rounded-md py-2 text-sm font-medium transition-colors ${
                  isSignUp ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {isSignUp && (
                <>
                  <Field
                    label="Full name"
                    id="auth-name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Priya Mehta"
                  />
                  <Field
                    label="Tuition centre name"
                    id="auth-centre"
                    type="text"
                    autoComplete="organization"
                    value={centreName}
                    onChange={(e) => setCentreName(e.target.value)}
                    placeholder="e.g. Mehta Tuition Centre"
                  />
                </>
              )}

              <Field
                label="Email"
                id="auth-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
              <Field
                label={isSignUp ? 'Password (min 6)' : 'Password'}
                id="auth-password"
                type="password"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />

              {error && (
                <p role="alert" className="text-sm text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2.5 font-medium flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                {isSignUp ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                {isSignUp ? 'Create account' : 'Sign in'}
              </button>
            </form>

            <div className="flex items-center gap-3 my-5">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs uppercase tracking-wide text-slate-400">or try live demo</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <button
              type="button"
              onClick={handleDemo}
              className="w-full border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/80 text-indigo-700 rounded-lg py-2.5 font-medium transition-colors"
            >
              Continue as Demo Tutor (Priya Mehta)
            </button>

            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500">
              <Mail className="h-3.5 w-3.5" />
              Demo login: priya@mehtatuition.in / demo1234
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}