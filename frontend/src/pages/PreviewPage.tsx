import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, api } from '../api'
import { useAuth } from '../auth'
import InvitationTemplate from '../components/InvitationTemplate'
import type { InvitationPreview } from '../types'

export default function PreviewPage() {
  const { logout } = useAuth()
  const [preview, setPreview] = useState<InvitationPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsWedding, setNeedsWedding] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    api
      .get<InvitationPreview>('/invitation/preview')
      .then((data) => {
        if (!cancelled) setPreview(data)
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) {
          setNeedsWedding(true)
        } else {
          setError(err instanceof ApiError ? err.message : 'Unable to load preview')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="preview-page">
      <header className="topbar">
        <strong>Preview</strong>
        <nav className="topbar-actions">
          <Link className="link" to="/editor">
            Edit
          </Link>
          <Link className="link" to="/">
            Dashboard
          </Link>
          <button className="link" type="button" onClick={() => void logout()}>
            Sign out
          </button>
        </nav>
      </header>

      {loading ? (
        <p>Loading…</p>
      ) : needsWedding ? (
        <p>
          Set up your wedding first. <Link to="/">Go to dashboard</Link>
        </p>
      ) : error !== '' ? (
        <p className="error">{error}</p>
      ) : (
        preview && (
          <InvitationTemplate
            wedding={preview.wedding}
            invitation={preview.invitation}
          />
        )
      )}
    </main>
  )
}
