import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ApiError, api } from '../api'
import type {
  CheckInResponse,
  ReceptionistGuest,
  Wedding,
} from '../types'

const QrScanner = lazy(() => import('../components/QrScanner'))

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { dateStyle: 'long' })
}

function extractCode(text: string): string {
  const match = text.trim().match(/\/i\/[^/]+\/([^/?#]+)/)
  return match ? match[1] : text.trim()
}

export default function ReceptionPage() {
  const { token } = useParams<{ token: string }>()
  const [wedding, setWedding] = useState<Wedding | null>(null)
  const [guests, setGuests] = useState<ReceptionistGuest[]>([])
  const [loading, setLoading] = useState(token !== undefined)
  const [invalid, setInvalid] = useState(false)
  const [search, setSearch] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ReceptionistGuest | null>(null)
  const [scanError, setScanError] = useState('')
  const [scannedCode, setScannedCode] = useState('')
  const [checkInResult, setCheckInResult] = useState<CheckInResponse | null>(
    null,
  )
  const [checkingIn, setCheckingIn] = useState(false)
  const [checkInError, setCheckInError] = useState('')

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

  const handleScan = useCallback(
    async (text: string) => {
      if (!token) return

      const code = extractCode(text)
      setScanning(false)
      setScanResult(null)
      setScanError('')
      setScannedCode(code)
      setCheckInResult(null)
      setCheckInError('')

      try {
        const guest = await api.postWithToken<ReceptionistGuest>(
          '/reception/validate',
          token,
          { code },
        )
        setScanResult(guest)
      } catch (err) {
        setScanError(
          err instanceof ApiError
            ? err.message
            : 'Unable to validate the QR code.',
        )
      }
    },
    [token],
  )

  const handleCheckIn = useCallback(async () => {
    if (!token || scannedCode === '') return

    setCheckingIn(true)
    setCheckInError('')

    try {
      const result = await api.postWithToken<CheckInResponse>(
        '/reception/check-in',
        token,
        { code: scannedCode },
      )
      setCheckInResult(result)
      setScanResult(result.guest)
    } catch (err) {
      setCheckInError(
        err instanceof ApiError ? err.message : 'Unable to check in the guest.',
      )
    } finally {
      setCheckingIn(false)
    }
  }, [token, scannedCode])

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

            <div className="actions">
              <button
                className="button"
                type="button"
                disabled={scanning}
                onClick={() => {
                  setScanning(true)
                  setScanError('')
                  setScanResult(null)
                }}
              >
                Scan QR
              </button>
            </div>

            {scanning && (
              <>
                <Suspense fallback={<p className="muted">Starting camera…</p>}>
                  <QrScanner onScan={handleScan} />
                </Suspense>
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => setScanning(false)}
                >
                  Close scanner
                </button>
              </>
            )}

            {scanResult && (
              <p
                className={
                  scanResult.checked_in_at !== null ? 'muted' : 'success'
                }
              >
                {scanResult.checked_in_at !== null
                  ? `Already checked in at ${new Date(
                      scanResult.checked_in_at,
                    ).toLocaleString()}.`
                  : `${scanResult.name} · up to ${scanResult.max_attendees} ${
                      scanResult.max_attendees === 1 ? 'guest' : 'guests'
                    }.`}
              </p>
            )}

            {scanResult !== null &&
              scanResult.checked_in_at === null &&
              checkInResult === null && (
                <div className="actions">
                  <button
                    className="button"
                    type="button"
                    disabled={checkingIn}
                    onClick={() => void handleCheckIn()}
                  >
                    {checkingIn ? 'Checking in…' : 'Check in'}
                  </button>
                </div>
              )}

            {checkInResult !== null && (
              <p className="success">
                {checkInResult.already_checked_in
                  ? 'Already checked in'
                  : 'Checked in'}{' '}
                at {new Date(checkInResult.checked_in_at).toLocaleString()}.
              </p>
            )}

            {checkInError !== '' && <p className="error">{checkInError}</p>}
            {scanError !== '' && <p className="error">{scanError}</p>}

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
                      <span className="muted">
                        {guest.checked_in_at !== null
                          ? `Checked in ${new Date(
                              guest.checked_in_at,
                            ).toLocaleString()}`
                          : 'Not checked in'}
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