import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ApiError, api } from '../api'
import InvitationTemplate from '../components/InvitationTemplate'
import type { PublicInvitation } from '../types'

export default function PublicInvitationPage() {
  const { slug } = useParams<{ slug: string }>()
  const [invitation, setInvitation] = useState<PublicInvitation | null>(null)
  const [loading, setLoading] = useState(slug !== undefined)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return

    let cancelled = false

    api
      .get<PublicInvitation>(
        `/public/invitations/${encodeURIComponent(slug)}`,
      )
      .then((data) => {
        if (!cancelled) setInvitation(data)
      })
      .catch((err) => {
        if (!cancelled && err instanceof ApiError && err.status === 404) {
          setNotFound(true)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  if (!slug) {
    return (
      <main className="public-page">
        <div className="public-empty">
          <h1>Invitation not found</h1>
          <p className="muted">The link is missing an invitation slug.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="public-page">
      {loading ? (
        <p className="muted">Loading…</p>
      ) : notFound ? (
        <div className="public-empty">
          <h1>Invitation not found</h1>
          <p className="muted">
            This invitation may be unpublished, or the link is wrong.
          </p>
        </div>
      ) : (
        invitation && (
          <InvitationTemplate
            wedding={invitation.wedding}
            invitation={invitation.invitation}
          />
        )
      )}
    </main>
  )
}
