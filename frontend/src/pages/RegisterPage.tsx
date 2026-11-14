import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ApiError } from '../api'
import { useAuth } from '../auth'

export default function RegisterPage() {
  const { user, register } = useAuth()
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
      await register(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to register')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="auth-page">
      <form className="card" onSubmit={handleSubmit}>
        <h1>Create account</h1>
        <p className="muted">Start preparing your wedding invitation.</p>

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
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <small className="muted">At least 8 characters.</small>
        </label>

        {error !== '' && <p className="error">{error}</p>}

        <button className="button" type="submit" disabled={saving}>
          {saving ? 'Creating…' : 'Create account'}
        </button>

        <p className="muted">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </main>
  )
}
