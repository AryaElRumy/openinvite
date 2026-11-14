import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ApiError, api } from '../api'
import InvitationTemplate from '../components/InvitationTemplate'
import type { PublicGuest, PublicGuestInvitation, PublicInvitation } from '../types'

export default function PublicInvitationPage() {
  const { slug, code } = useParams<{ slug: string; code?: string }>()
  const [invitation, setInvitation] = useState<PublicInvitation | null>(null)
  const [guest, setGuest] = useState<PublicGuest | null>(null)
  const [loading, setLoading] = useState(slug !== undefined)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return

    let cancelled = false

    const path =
      code === undefined
        ? `/public/invitations/${encodeURIComponent(slug)}`
        : `/public/invitations/${encodeURIComponent(slug)}/guests/${encodeURIComponent(code)}`

    api
      .get<PublicGuestInvitation | PublicInvitation>(path)
      .then((data) => {
        if (cancelled) return
        setInvitation(data)
        setGuest('guest' in data ? data.guest : null)
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
  }, [slug, code])

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
            guest={guest}
          />
        )
      )}
    </main>
  )
}
