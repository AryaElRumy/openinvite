import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ApiError, api } from '../api'
import type { ReceptionistGuest, Wedding } from '../types'

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { dateStyle: 'long' })
}

export default function ReceptionPage() {
  const { token } = useParams<{ token: string }>()
  const [wedding, setWedding] = useState<Wedding | null>(null)
  const [guests, setGuests] = useState<ReceptionistGuest[]>([])
  const [loading, setLoading] = useState(token !== undefined)
  const [invalid, setInvalid] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!token) return

    let cancelled = false

    Promise.all([
      api.getWithToken<Wedding>('/reception/session', token),
      api.getWithToken<ReceptionistGuest[]>('/reception/guests', token),
    ])
      .then(([weddingData, guestData]) => {
        if (cancelled) return
        setWedding(weddingData)
        setGuests(guestData)
      })
      .catch((err) => {
        if (!cancelled && err instanceof ApiError && err.status === 401) {
          setInvalid(true)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token])

  if (!token) {
    return (
      <main className="page">
        <section className="card">
          <p>This reception link is invalid.</p>
        </section>
      </main>
    )
  }

  const query = search.trim().toLowerCase()
  const visibleGuests = guests.filter(
    (guest) =>
      query === '' ||
      guest.name.toLowerCase().includes(query) ||
      guest.invitation_code.toLowerCase().includes(query),
  )

  return (
    <main className="page">
      <header className="topbar">
        <strong>Guest Reception</strong>
      </header>

      <section className="card">
        {loading ? (
          <p>Loading…</p>
        ) : invalid || wedding === null ? (
          <p>
            This reception link is invalid or has been revoked. Ask the couple
            for a new link.
          </p>
        ) : (
          <>
            <h1>
              {wedding.partner_one_name} & {wedding.partner_two_name}
            </h1>
            <p className="muted">
              {formatDate(wedding.wedding_date)} · {wedding.venue_name}
            </p>

            <label className="field">
              <span>Find a guest</span>
              <input
                type="search"
                placeholder="Name or invitation code"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            {visibleGuests.length === 0 ? (
              <p className="muted">No guests match.</p>
            ) : (
              <ul className="guest-list">
                {visibleGuests.map((guest) => (
                  <li className="guest-row" key={guest.id}>
                    <div className="guest-row-info">
                      <strong>{guest.name}</strong>
                      <span className="muted">
                        Up to {guest.max_attendees}{' '}
                        {guest.max_attendees === 1 ? 'guest' : 'guests'} · Code{' '}
                        {guest.invitation_code}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </main>
  )
}