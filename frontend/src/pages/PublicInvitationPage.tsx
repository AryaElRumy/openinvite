import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  const [error, setError] = useState('')

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
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true)
        } else {
          setError(err instanceof ApiError ? err.message : 'Unable to load invitation')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [slug, code])

  async function handleRsvpSubmit(event: FormEvent) {
    event.preventDefault()
    if (slug === undefined || code === undefined || guest === null) return

    const count = rsvpStatus === 'declined' ? 0 : Number(attendeeCount)
    if (
      rsvpStatus === 'attending' &&
      (!Number.isInteger(count) || count < 1 || count > guest.max_attendees)
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

  if (!slug) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-2xl items-center justify-center px-4">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Invitation not found</CardTitle>
            <CardDescription>
              The link is missing an invitation slug.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : notFound ? (
        <Card>
          <CardHeader>
            <CardTitle>Invitation not found</CardTitle>
            <CardDescription>
              This invitation may be unpublished, or the link is wrong.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : error !== '' ? (
        <Card>
          <CardHeader>
            <CardTitle>Unable to load invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        invitation && (
          <>
            <InvitationTemplate
              wedding={invitation.wedding}
              invitation={invitation.invitation}
              guest={guest}
            />

            {guest && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="font-serif text-xl">
                    Your check-in QR
                  </CardTitle>
                  <CardDescription>Show this at reception.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <div
                    className="rounded-2xl bg-white p-4 shadow-sm"
                    role="img"
                    aria-label="Invitation check-in QR code"
                  >
                    <QRCodeSVG value={window.location.href} size={180} />
                  </div>
                </CardContent>
              </Card>
            )}

            {guest && (
              <Card className="mt-6">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="font-serif text-xl">RSVP</CardTitle>
                    {guest.rsvp && (
                      <Badge
                        variant={
                          guest.rsvp.status === 'attending'
                            ? 'default'
                            : 'outline'
                        }
                      >
                        {guest.rsvp.status === 'attending'
                          ? `Attending (${guest.rsvp.attendee_count})`
                          : 'Declined'}
                      </Badge>
                    )}
                  </div>
                  <CardDescription>
                    {guest.rsvp
                      ? `Last response ${new Date(guest.rsvp.responded_at).toLocaleString()}.`
                      : 'Let the couple know if you can make it.'}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <form className="space-y-4" onSubmit={handleRsvpSubmit}>
                    <div className="space-y-2">
                      <Label htmlFor="rsvp-status">Will you attend?</Label>
                      <Select
                        value={rsvpStatus}
                        onValueChange={(value) =>
                          setRsvpStatus(value as RsvpStatus)
                        }
                      >
                        <SelectTrigger id="rsvp-status" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="attending">Attending</SelectItem>
                          <SelectItem value="declined">Declined</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {rsvpStatus === 'attending' && (
                      <div className="space-y-2">
                        <Label htmlFor="rsvp-count">Number of attendees</Label>
                        <Input
                          id="rsvp-count"
                          type="number"
                          min={1}
                          max={guest.max_attendees}
                          inputMode="numeric"
                          value={attendeeCount}
                          onChange={(event) =>
                            setAttendeeCount(event.target.value)
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Up to {guest.max_attendees}{' '}
                          {guest.max_attendees === 1 ? 'guest' : 'guests'}.
                        </p>
                      </div>
                    )}

                    {rsvpError !== '' && (
                      <p
                        role="alert"
                        className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
                      >
                        {rsvpError}
                      </p>
                    )}
                    {rsvpNotice !== '' && (
                      <p
                        role="status"
                        className="rounded-md bg-accent/15 px-3 py-2 text-sm text-foreground"
                      >
                        {rsvpNotice}
                      </p>
                    )}

                    <Button type="submit" disabled={rsvpSaving}>
                      {rsvpSaving
                        ? 'Saving…'
                        : guest.rsvp
                          ? 'Update response'
                          : 'Send RSVP'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </>
        )
      )}
    </main>
  )
}