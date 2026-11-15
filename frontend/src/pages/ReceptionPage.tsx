import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { Page } from '@/components/Page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
            : 'Gagal memeriksa kode QR. Coba lagi.',
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
        err instanceof ApiError ? err.message : 'Gagal mencatat kehadiran tamu. Coba lagi.',
      )
    } finally {
      setCheckingIn(false)
    }
  }, [token, scannedCode])

  if (!token) {
    return (
      <Page>
        <Card>
          <CardHeader>
            <CardTitle>Resepsi tamu</CardTitle>
            <CardDescription>Tautan resepsi ini tidak valid.</CardDescription>
          </CardHeader>
        </Card>
      </Page>
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
    <Page>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <span className="font-semibold tracking-tight">Resepsi tamu</span>
        <span className="text-sm text-muted-foreground">
          Akses terbatas untuk hari acara
        </span>
      </header>

      <Card>
        {loading ? (
          <CardContent>
            <p className="text-muted-foreground">Memuat…</p>
          </CardContent>
        ) : invalid || wedding === null ? (
          <CardHeader>
            <CardTitle>Akses tidak tersedia</CardTitle>
            <CardDescription>
              Tautan resepsi ini tidak valid atau sudah dicabut. Minta tautan baru ke kedua mempelai.
            </CardDescription>
          </CardHeader>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="font-serif text-2xl">
                {wedding.partner_one_name} & {wedding.partner_two_name}
              </CardTitle>
              <CardDescription>
                {formatDate(wedding.wedding_date)} · {wedding.venue_name}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  disabled={scanning}
                  onClick={() => {
                    setScanning(true)
                    setScanError('')
                    setScanResult(null)
                  }}
                >
                  Pindai QR
                </Button>
              </div>

              {scanning && (
                <div className="space-y-3">
                  <Suspense
                    fallback={
                      <p className="text-sm text-muted-foreground">
                        Membuka kamera…
                      </p>
                    }
                  >
                    <QrScanner onScan={handleScan} />
                  </Suspense>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setScanning(false)}
                  >
                    Tutup pemindai
                  </Button>
                </div>
              )}

              {scanResult && (
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-sm font-medium">{scanResult.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Maksimal {scanResult.max_attendees} tamu
                    {scanResult.checked_in_at
                      ? ` · tercatat hadir ${new Date(scanResult.checked_in_at).toLocaleString()}`
                      : ''}
                  </p>

                  {scanResult.checked_in_at === null && checkInResult === null && (
                    <Button
                      className="mt-3"
                      type="button"
                      disabled={checkingIn}
                      onClick={() => void handleCheckIn()}
                    >
                      {checkingIn ? 'Mencatat…' : 'Catat kehadiran'}
                    </Button>
                  )}

                  {checkInResult !== null && (
                    <p className="mt-3 text-sm text-foreground">
                      {checkInResult.already_checked_in
                        ? 'Sudah tercatat hadir'
                        : 'Tercatat hadir'}{' '}
                      pada {new Date(checkInResult.checked_in_at).toLocaleString()}.
                    </p>
                  )}
                </div>
              )}

              {scanError !== '' && (
                <p
                  role="alert"
                  className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {scanError}
                </p>
              )}
              {checkInError !== '' && (
                <p
                  role="alert"
                  className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {checkInError}
                </p>
              )}

              <div className="space-y-2">
                <Label htmlFor="reception-search">Cari tamu</Label>
                <Input
                  id="reception-search"
                  type="search"
                  placeholder="Nama atau kode undangan"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              {visibleGuests.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Tidak ada tamu yang cocok.
                </p>
              ) : (
                <ul className="space-y-3">
                  {visibleGuests.map((guest) => (
                    <li
                      key={guest.id}
                      className="flex flex-col gap-2 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="font-semibold break-words">{guest.name}</p>
                        <p className="text-sm break-words text-muted-foreground">
                          Maksimal {guest.max_attendees} tamu ·
                          Kode {guest.invitation_code}
                        </p>
                      </div>
                      <Badge
                        variant={guest.checked_in_at ? 'default' : 'outline'}
                      >
                        {guest.checked_in_at ? 'Sudah hadir' : 'Belum hadir'}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </>
        )}
      </Card>
    </Page>
  )
}