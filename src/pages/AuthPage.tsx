import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import codelMLogo from '../assets/CodeLM-logo-white.png'
import './AuthPage.css'

type Mode = 'login' | 'register'

export default function AuthPage() {
  const { login, register } = useAuth()

  const [mode,     setMode]     = useState<Mode>('login')
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [busy,     setBusy]     = useState(false)

  const switchMode = (m: Mode) => {
    setMode(m)
    setError(null)
    setName('')
    setEmail('')
    setPassword('')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(email, password, name)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      {/* Background grid */}
      <div className="auth-bg-grid" aria-hidden="true" />

      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo-wrap">
          <img src={codelMLogo} alt="CodeLM" className="auth-logo" />
        </div>

        <p className="auth-tagline">AI-powered code quality reviewer</p>

        {/* Tab switcher */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => switchMode('login')}
            type="button"
          >
            Sign In
          </button>
          <button
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => switchMode('register')}
            type="button"
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={(e) => void handleSubmit(e)} noValidate>
          {mode === 'register' && (
            <div className="auth-field">
              <label htmlFor="auth-name" className="auth-label">Full name</label>
              <input
                id="auth-name"
                type="text"
                className="auth-input"
                placeholder="Jan Kowalski"
                value={name}
                onChange={e => setName(e.target.value)}
                autoComplete="name"
                required
                disabled={busy}
              />
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="auth-email" className="auth-label">Email</label>
            <input
              id="auth-email"
              type="email"
              className="auth-input"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={busy}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="auth-password" className="auth-label">Password</label>
            <input
              id="auth-password"
              type="password"
              className="auth-input"
              placeholder={mode === 'register' ? 'At least 6 characters' : '••••••••'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              disabled={busy}
            />
          </div>

          {error && (
            <div className="auth-error" role="alert">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            className={`auth-submit ${busy ? 'loading' : ''}`}
            disabled={busy}
          >
            <span className="btn-shimmer" />
            {busy
              ? <><AuthSpinner /> {mode === 'login' ? 'Signing in…' : 'Creating account…'}</>
              : mode === 'login' ? 'Sign In' : 'Create Account'
            }
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            className="auth-switch-btn"
            onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
            type="button"
          >
            {mode === 'login' ? 'Create one' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}

function AuthSpinner() {
  return (
    <svg className="spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M21 12a9 9 0 11-6.219-8.56" />
    </svg>
  )
}
