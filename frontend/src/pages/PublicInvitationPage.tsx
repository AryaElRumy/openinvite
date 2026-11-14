import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { ApiError, api } from '../api'
import InvitationTemplate from '../components/InvitationTemplate'
import type {
  PublicGuest,
  PublicGuestInvitation,
  PublicInvitation,
  Rsvp,
  RsvpStatus,
} from '../types'

export default function PublicInvitationPage() {
  const { slug, code } = useParams<{ slug: string; code?: string }>()
  const [invitation, setInvitation] = useState<PublicInvitation | null>(null)
  const [guest, setGuest] = useState<PublicGuest | null>(null)
  const [loading, setLoading] = useState(slug !== undefined)
  const [notFound, setNotFound] = useState(false)

  const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus>('attending')
  const [attendeeCount, setAttendeeCount] = useState('1')
  const [rsvpSaving, setRsvpSaving] = useState(false)
  const [rsvpError, setRsvpError] = useState('')
  const [rsvpNotice, setRsvpNotice] = useState('')

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
        const guestData = 'guest' in data ? data.guest : null
        setGuest(guestData)
        if (guestData !== null) {
          setRsvpStatus(guestData.rsvp?.status ?? 'attending')
          setAttendeeCount(String(guestData.rsvp?.attendee_count ?? 1))
        }
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

  async function handleRsvpSubmit(event: FormEvent) {
    event.preventDefault()
    if (slug === undefined || code === undefined || guest === null) return

    const count = rsvpStatus === 'declined' ? 0 : Number(attendeeCount)
    if (
      rsvpStatus === 'attending' &&
      (!Number.isInteger(count) ||
        count < 1 ||
        count > guest.max_attendees)
    ) {
      setRsvpError(
        `Attendee count must be between 1 and ${guest.max_attendees}.`,
      )
      return
    }

    setRsvpError('')
    setRsvpNotice('')
    setRsvpSaving(true)

    try {
      const rsvp = await api.post<Rsvp>(
        `/public/invitations/${encodeURIComponent(slug)}/guests/${encodeURIComponent(code)}/rsvp`,
        { status: rsvpStatus, attendee_count: count },
      )
      setGuest({ ...guest, rsvp })
      setRsvpNotice(
        rsvp.status === 'declined'
          ? 'Response saved. You declined.'
          : `Response saved. ${rsvp.attendee_count} attending.`,
      )
    } catch (err) {
      setRsvpError(
        err instanceof ApiError ? err.message : 'Unable to save RSVP.',
      )
    } finally {
      setRsvpSaving(false)
    }
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
          <>
            <InvitationTemplate
              wedding={invitation.wedding}
              invitation={invitation.invitation}
              guest={guest}
            />

            {guest && (
              <section className="card rsvp-card">
                <h2>RSVP</h2>
                {guest.rsvp ? (
                  <p className="muted">
                    Last response:{' '}
                    {guest.rsvp.status === 'attending'
                      ? `Attending (${guest.rsvp.attendee_count})`
                      : 'Declined'}{' '}
                    ·{' '}
                    {new Date(guest.rsvp.responded_at).toLocaleString()}
                  </p>
                ) : (
                  <p className="muted">
                    Let the couple know if you can make it.
                  </p>
                )}

                <form className="form" onSubmit={handleRsvpSubmit}>
                  <label className="field">
                    <span>Will you attend?</span>
                    <select
                      value={rsvpStatus}
                      onChange={(event) =>
                        setRsvpStatus(event.target.value as RsvpStatus)
                      }
                    >
                      <option value="attending">Attending</option>
                      <option value="declined">Declined</option>
                    </select>
                  </label>

                  {rsvpStatus === 'attending' && (
                    <label className="field">
                      <span>Number of attendees</span>
                      <input
                        type="number"
                        min={1}
                        max={guest.max_attendees}
                        inputMode="numeric"
                        value={attendeeCount}
                        onChange={(event) =>
                          setAttendeeCount(event.target.value)
                        }
                      />
                      <small className="muted">
                        Up to {guest.max_attendees}{' '}
                        {guest.max_attendees === 1 ? 'guest' : 'guests'}.
                      </small>
                    </label>
                  )}

                  {rsvpError !== '' && <p className="error">{rsvpError}</p>}
                  {rsvpNotice !== '' && (
                    <p className="success">{rsvpNotice}</p>
                  )}

                  <div className="actions">
                    <button
                      className="button"
                      type="submit"
                      disabled={rsvpSaving}
                    >
                      {rsvpSaving
                        ? 'Saving…'
                        : guest.rsvp
                          ? 'Update response'
                          : 'Send RSVP'}
                    </button>
                  </div>
                </form>
              </section>
            )}
          </>
        )
      )}
    </main>
  )
}
