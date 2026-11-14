import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ApiError } from '../api'
import { useAuth } from '../auth'

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  if (user !== null) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to sign in')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="auth-page">
      <form className="card" onSubmit={handleSubmit}>
        <h1>Sign in</h1>
        <p className="muted">Manage your wedding invitation.</p>

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {error !== '' && <p className="error">{error}</p>}

        <button className="button" type="submit" disabled={saving}>
          {saving ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="muted">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </main>
  )
}
