import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

export interface AuthUser {
  id:    string
  email: string
  name:  string
}

interface AuthContextValue {
  user:     AuthUser | null
  token:    string | null
  loading:  boolean
  login:    (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout:   () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<AuthUser | null>(null)
  const [token,   setToken]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Restore session from localStorage on first load
  useEffect(() => {
    const stored = localStorage.getItem('codelm_token')
    if (!stored) { setLoading(false); return }

    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${stored}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: { user: AuthUser }) => {
        setToken(stored)
        setUser(data.user)
      })
      .catch(() => localStorage.removeItem('codelm_token'))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const body = await res.json() as { error?: string }
      throw new Error(body.error ?? 'Login failed')
    }
    const data = await res.json() as { token: string; user: AuthUser }
    localStorage.setItem('codelm_token', data.token)
    setToken(data.token)
    setUser(data.user)
  }, [])

  const register = useCallback(async (email: string, password: string, name: string) => {
    const res = await fetch('/api/auth/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password, name }),
    })
    if (!res.ok) {
      const body = await res.json() as { error?: string }
      throw new Error(body.error ?? 'Registration failed')
    }
    const data = await res.json() as { token: string; user: AuthUser }
    localStorage.setItem('codelm_token', data.token)
    setToken(data.token)
    setUser(data.user)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('codelm_token')
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
