import { useEffect, useState } from 'react'
import { BookOpen, Check, Copy, ExternalLink, ShieldCheck } from 'lucide-react'

import { AppTopBar, Page } from '@/components/Page'
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
import { ApiError, api } from '../api'
import type {
  ReceptionistTokenResponse,
  ReceptionistTokenStatus,
} from '../types'

export default function GuestbookPage() {
  const [status, setStatus] = useState<ReceptionistTokenStatus | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false

    api
      .get<ReceptionistTokenStatus>('/receptionist')
      .then((data) => {
        if (!cancelled) setStatus(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : 'Unable to load guestbook access.',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function createAccess() {
    if (
      status?.active &&
      !window.confirm(
        'Replace the current guestbook link? The old link will stop working.',
      )
    ) {
      return
    }

    setError('')
    setNotice('')
    setSaving(true)

    try {
      const response = await api.post<ReceptionistTokenResponse>('/receptionist')
      setToken(response.token)
      setStatus(response)
      setNotice('Guestbook link created. Copy it now; it will not be shown again.')
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Unable to create guestbook access.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function revokeAccess() {
    if (!window.confirm('Revoke guestbook access?')) return

    setError('')
    setNotice('')
    setSaving(true)

    try {
      await api.delete('/receptionist')
      setToken(null)
      setStatus(null)
      setNotice('Guestbook access revoked.')
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Unable to revoke guestbook access.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function copyLink() {
    if (!token) return

    try {
      await navigator.clipboard.writeText(`${window.location.origin}/reception/${token}`)
      setNotice('Guestbook link copied.')
    } catch {
      setError('Unable to copy the guestbook link.')
    }
  }

  const guestbookUrl = token ? `${window.location.origin}/reception/${token}` : ''

  return (
    <Page width="wide">
      <AppTopBar active="guestbook" />

      <section className="mb-8 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <p className="app-kicker mb-3">Event day</p>
          <h1 className="max-w-xl text-4xl sm:text-5xl">Guestbook access</h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            Give your reception team a private link to look up guests and record arrivals.
          </p>
        </div>
        <Badge variant={status?.active ? 'default' : 'secondary'}>
          {status?.active ? 'Active' : 'Not set up'}
        </Badge>
      </section>

      {error !== '' && (
        <p role="alert" className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {notice !== '' && (
        <p role="status" className="mb-4 rounded-md bg-accent/15 px-3 py-2 text-sm text-foreground">
          {notice}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
        <Card>
          <CardHeader>
            <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-secondary text-foreground">
              <BookOpen className="size-5" />
            </div>
            <CardTitle className="font-serif text-2xl">Reception guestbook</CardTitle>
            <CardDescription>
              The receptionist view is limited to guest lookup and check-in. It does not expose your wedding settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading access status…</p>
            ) : token ? (
              <div className="flex flex-col gap-3">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="guestbook-link">
                  Guestbook link
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input id="guestbook-link" readOnly value={guestbookUrl} className="min-w-0 flex-1" />
                  <Button variant="secondary" onClick={() => void copyLink()}>
                    <Copy data-icon="inline-start" />
                    Copy link
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This link is shown once when created. Store it somewhere safe before leaving this page.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed bg-muted/30 p-5">
                <p className="font-medium">No guestbook link yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create a private link for the person checking guests in at the door.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button disabled={saving || loading} onClick={() => void createAccess()}>
                {status?.active ? 'Regenerate link' : 'Create guestbook link'}
              </Button>
              {status?.active && (
                <Button variant="outline" disabled={saving} onClick={() => void revokeAccess()}>
                  Revoke access
                </Button>
              )}
              {token && (
                <Button variant="ghost" asChild>
                  <a href={guestbookUrl} target="_blank" rel="noreferrer">
                    Open guestbook
                    <ExternalLink data-icon="inline-end" />
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <ShieldCheck className="mb-2 size-5 text-muted-foreground" />
            <CardTitle className="font-serif text-xl">Access notes</CardTitle>
            <CardDescription>Keep the guestbook link with your reception team only.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <p className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-foreground" />Guest lookup by name or QR code</p>
            <p className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-foreground" />Check-in confirmation and duplicate warnings</p>
            <p className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-foreground" />No access to owner settings</p>
            {status?.last_used_at && (
              <p className="border-t pt-3 text-xs">Last used {new Date(status.last_used_at).toLocaleString()}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </Page>
  )
}
