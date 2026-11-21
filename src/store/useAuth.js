import { useCallback, useState } from 'react'

const ACCOUNTS_KEY = 'backoffice-ai-accounts'
const SESSION_KEY = 'backoffice-ai-session'

export const DEMO_ACCOUNT_EMAIL = 'priya@mehtatuition.in'
export const DEMO_ACCOUNT_PASSWORD = 'demo1234'

const DEMO_ACCOUNT = {
  id: 'demo-priya',
  name: 'Priya Mehta',
  centreName: 'Mehta Tuition Centre',
  email: DEMO_ACCOUNT_EMAIL,
  password: DEMO_ACCOUNT_PASSWORD,
  createdAt: '2025-06-15T09:00:00.000Z',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normaliseEmail(email) {
  return String(email ?? '').trim().toLowerCase()
}

function stripPassword(account) {
  if (!account) return null
  // eslint-disable-next-line no-unused-vars
  const { password, ...session } = account
  return session
}

function readAccountsRaw() {
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAccounts(list) {
  try {
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list))
  } catch {
    /* storage unavailable or full — ignore */
  }
}

function readSessionRaw() {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function writeSession(session) {
  try {
    if (session) {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    } else {
      window.localStorage.removeItem(SESSION_KEY)
    }
  } catch {
    /* storage unavailable — ignore */
  }
}

// Returns all accounts, seeding the demo account if it is missing.
function loadAccounts() {
  const accounts = readAccountsRaw()
  const hasDemo = accounts.some(
    (a) => a.id === DEMO_ACCOUNT.id || normaliseEmail(a.email) === normaliseEmail(DEMO_ACCOUNT.email)
  )
  if (!hasDemo) {
    accounts.push({ ...DEMO_ACCOUNT })
    writeAccounts(accounts)
  }
  return accounts
}

// Seed on module load so the demo login always works.
loadAccounts()

export function getSession() {
  return readSessionRaw()
}

export function signUp({ name, centreName, email, password } = {}) {
  const cleanName = String(name ?? '').trim()
  const cleanCentre = String(centreName ?? '').trim()
  const cleanEmail = String(email ?? '').trim()
  const pw = String(password ?? '')

  if (cleanName.length < 2) return { ok: false, error: 'Please enter your full name (at least 2 characters).' }
  if (cleanCentre.length < 2) return { ok: false, error: 'Please enter your tuition centre name (at least 2 characters).' }
  if (!EMAIL_RE.test(cleanEmail)) return { ok: false, error: 'Please enter a valid email address.' }
  if (pw.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' }

  const accounts = loadAccounts()
  const emailKey = normaliseEmail(cleanEmail)
  if (accounts.some((a) => normaliseEmail(a.email) === emailKey)) {
    return { ok: false, error: 'An account with this email already exists. Please sign in instead.' }
  }

  const account = {
    id: `acc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: cleanName,
    centreName: cleanCentre,
    email: cleanEmail,
    password: pw,
    createdAt: new Date().toISOString(),
  }

  accounts.push(account)
  writeAccounts(accounts)

  const session = stripPassword(account)
  writeSession(session)
  return { ok: true, session }
}

export function signIn({ email, password } = {}) {
  const emailKey = normaliseEmail(email)
  const account = loadAccounts().find((a) => normaliseEmail(a.email) === emailKey)

  if (!account || account.password !== String(password ?? '')) {
    return { ok: false, error: 'Incorrect email or password.' }
  }

  const session = stripPassword(account)
  writeSession(session)
  return { ok: true, session }
}

export function signInAsDemo() {
  return signIn({ email: DEMO_ACCOUNT_EMAIL, password: DEMO_ACCOUNT_PASSWORD })
}

export function signOut() {
  writeSession(null)
}

export function resetDemoAccount() {
  const accounts = readAccountsRaw().filter(
    (a) => a.id !== DEMO_ACCOUNT.id && normaliseEmail(a.email) !== normaliseEmail(DEMO_ACCOUNT.email)
  )
  accounts.push({ ...DEMO_ACCOUNT })
  writeAccounts(accounts)
}

export function useAuth() {
  const [session, setSession] = useState(() => getSession())

  const handleSignUp = useCallback((input) => {
    const result = signUp(input)
    if (result.ok) setSession(result.session)
    return result
  }, [])

  const handleSignIn = useCallback((input) => {
    const result = signIn(input)
    if (result.ok) setSession(result.session)
    return result
  }, [])

  const handleSignInAsDemo = useCallback(() => {
    const result = signInAsDemo()
    if (result.ok) setSession(result.session)
    return result
  }, [])

  const handleSignOut = useCallback(() => {
    signOut()
    setSession(null)
  }, [])

  return {
    session,
    signUp: handleSignUp,
    signIn: handleSignIn,
    signInAsDemo: handleSignInAsDemo,
    signOut: handleSignOut,
  }
}

export default useAuth
