import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import App      from './App'
import AuthPage from './pages/AuthPage'

function Loader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100dvh', background: '#060612',
    }}>
      <div style={{
        width: 32, height: 32,
        border: '2px solid rgba(129,140,248,0.12)',
        borderTopColor: '#818CF8',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function Root() {
  const { user, loading } = useAuth()

  if (loading) return <Loader />

  if (!user) return <AuthPage />

  return (
    <Routes>
      <Route path="/"              element={<App />} />
      <Route path="/chat/:chatId"  element={<App />} />
      <Route path="*"              element={<Navigate to="/" replace />} />
    </Routes>
  )
}
