import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, CalendarDays, MapPin, Pencil, Sparkles } from 'lucide-react'

import { AppTopBar, Page } from '@/components/Page'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError, api } from '../api'
import type { Wedding, WeddingPayload } from '../types'

type EventForm = {
  name: string
  start: string
  end: string
  venue: string
  address: string
}

type FormState = {
  partner_one_name: string
  partner_two_name: string
  wedding_date: string
  venue_name: string
  venue_address: string
  maps_url: string
  slug: string
  events: EventForm[]
}

const emptyEvent = (): EventForm => ({
  name: '',
  start: '',
  end: '',
  venue: '',
  address: '',
})

const emptyForm = (): FormState => ({
  partner_one_name: '',
  partner_two_name: '',
  wedding_date: '',
  venue_name: '',
  venue_address: '',
  maps_url: '',
  slug: '',
  events: [emptyEvent()],
})

function toForm(wedding: Wedding): FormState {
  return {
    partner_one_name: wedding.partner_one_name,
    partner_two_name: wedding.partner_two_name,
    wedding_date: wedding.wedding_date,
    venue_name: wedding.venue_name,
    venue_address: wedding.venue_address ?? '',
    maps_url: wedding.maps_url ?? '',
    slug: wedding.slug,
    events: wedding.events.map((event) => ({
      name: event.name,
      start: event.start ?? '',
      end: event.end ?? '',
      venue: event.venue ?? '',
      address: event.address ?? '',
    })),
  }
}

function nullIfEmpty(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function formatDate(value: string) {
  if (!value) return 'Not set yet'
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

export default function DashboardPage() {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [slugLocked, setSlugLocked] = useState(false)
  const [exists, setExists] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const completedSteps = [
    form.partner_one_name.trim() !== '' && form.partner_two_name.trim() !== '',
    form.wedding_date !== '',
    form.venue_name.trim() !== '',
    form.events.some((event) => event.name.trim() !== ''),
  ].filter(Boolean).length

  useEffect(() => {
    let cancelled = false

    api
      .get<Wedding>('/wedding')
      .then((wedding) => {
        if (cancelled) return
        setForm(toForm(wedding))
        setSlugLocked(wedding.slug_locked)
        setExists(true)
      })
      .catch((err) => {
        if (cancelled) return
        if (!(err instanceof ApiError && err.status === 404)) {
          setError(err instanceof ApiError ? err.message : 'Unable to load wedding')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  function updateField(field: keyof FormState, value: string) {
    setSaved(false)
    setForm((current) => ({ ...current, [field]: value }))
  }

  function updateEvent(index: number, field: keyof EventForm, value: string) {
    setSaved(false)
    setForm((current) => ({
      ...current,
      events: current.events.map((event, eventIndex) =>
        eventIndex === index ? { ...event, [field]: value } : event,
      ),
    }))
  }

  function addEvent() {
    setForm((current) => ({
      ...current,
      events: [...current.events, emptyEvent()],
    }))
  }

  function removeEvent(index: number) {
    setForm((current) => ({
      ...current,
      events: current.events.filter((_, eventIndex) => eventIndex !== index),
    }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSaved(false)
    setSaving(true)

    const payload: WeddingPayload = {
      partner_one_name: form.partner_one_name.trim(),
      partner_two_name: form.partner_two_name.trim(),
      wedding_date: form.wedding_date,
      venue_name: form.venue_name.trim(),
      venue_address: nullIfEmpty(form.venue_address),
      maps_url: nullIfEmpty(form.maps_url),
      events: form.events
        .filter((item) => item.name.trim() !== '')
        .map((item) => ({
          name: item.name.trim(),
          start: nullIfEmpty(item.start),
          end: nullIfEmpty(item.end),
          venue: nullIfEmpty(item.venue),
          address: nullIfEmpty(item.address),
        })),
      slug: slugLocked ? null : nullIfEmpty(form.slug),
    }

    try {
      const wedding = await api.put<Wedding>('/wedding', payload)
      setForm(toForm(wedding))
      setSlugLocked(wedding.slug_locked)
      setExists(true)
      setSaved(true)
      setEditOpen(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save wedding')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Page width="wide">
      <AppTopBar active="dashboard" />

      <section className="mb-8 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <p className="app-kicker mb-3">Overview</p>
          <h1 className="max-w-xl text-4xl sm:text-5xl">
            A clear view of your day.
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            Keep the important details close, and share the rest beautifully.
          </p>
        </div>
        {exists && (
          <Button variant="outline" asChild>
            <Link to="/preview">
              View invitation
              <ArrowUpRight data-icon="inline-end" />
            </Link>
          </Button>
        )}
      </section>

      <Card className="mb-8" aria-label="Wedding overview">
        <CardHeader className="gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="font-serif text-2xl">Wedding overview</CardTitle>
              <CardDescription className="mt-2">
                {exists ? 'The details guests will see first.' : 'Add the details guests need most.'}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} disabled={loading}>
              <Pencil data-icon="inline-start" />
              {exists ? 'Edit details' : 'Add details'}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : exists ? (
            <div className="grid gap-6 border-t pt-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 size-4 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="mt-1 font-medium">{formatDate(form.wedding_date)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Venue</p>
                  <p className="mt-1 truncate font-medium">{form.venue_name || 'Not set yet'}</p>
                  <p className="truncate text-xs text-muted-foreground">{form.venue_address || 'Add an address'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Readiness</p>
                  <p className="mt-1 font-medium">{completedSteps}/4 ready</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Invitation</p>
                <Badge className="mt-2" variant={slugLocked ? 'default' : 'secondary'}>
                  {slugLocked ? 'Published' : 'Draft'}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="border-t pt-6 text-sm text-muted-foreground">
              Your wedding details will appear here once you add them.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{exists ? 'Edit wedding details' : 'Set up your wedding'}</DialogTitle>
            <DialogDescription>
              Add the details that shape your invitation and help guests arrive prepared.
            </DialogDescription>
          </DialogHeader>

          <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="partner_one_name">Partner one</Label>
                  <Input
                    id="partner_one_name"
                    required
                    maxLength={120}
                    value={form.partner_one_name}
                    onChange={(event) =>
                      updateField('partner_one_name', event.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="partner_two_name">Partner two</Label>
                  <Input
                    id="partner_two_name"
                    required
                    maxLength={120}
                    value={form.partner_two_name}
                    onChange={(event) =>
                      updateField('partner_two_name', event.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wedding_date">Wedding date</Label>
                  <Input
                    id="wedding_date"
                    type="date"
                    required
                    value={form.wedding_date}
                    onChange={(event) =>
                      updateField('wedding_date', event.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="venue_name">Venue</Label>
                  <Input
                    id="venue_name"
                    required
                    maxLength={200}
                    value={form.venue_name}
                    onChange={(event) =>
                      updateField('venue_name', event.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="venue_address">Venue address</Label>
                  <Input
                    id="venue_address"
                    maxLength={300}
                    value={form.venue_address}
                    onChange={(event) =>
                      updateField('venue_address', event.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maps_url">Maps link</Label>
                  <Input
                    id="maps_url"
                    type="url"
                    maxLength={500}
                    placeholder="https://maps.google.com/..."
                    value={form.maps_url}
                    onChange={(event) => updateField('maps_url', event.target.value)}
                  />
                </div>
              </div>

              <fieldset className="space-y-3">
                <legend className="mb-2 font-semibold">Events</legend>
                {form.events.map((item, index) => (
                  <div key={index} className="space-y-3 rounded-xl border border-dashed p-4">
                    <div className="space-y-2">
                      <Label htmlFor={`event-name-${index}`}>Event name</Label>
                      <Input
                        id={`event-name-${index}`}
                        maxLength={120}
                        placeholder="Akad Nikah"
                        value={item.name}
                        onChange={(event) =>
                          updateEvent(index, 'name', event.target.value)
                        }
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`event-start-${index}`}>Starts</Label>
                        <Input
                          id={`event-start-${index}`}
                          maxLength={40}
                          placeholder="08:00"
                          value={item.start}
                          onChange={(event) =>
                            updateEvent(index, 'start', event.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`event-end-${index}`}>Ends</Label>
                        <Input
                          id={`event-end-${index}`}
                          maxLength={40}
                          placeholder="10:00"
                          value={item.end}
                          onChange={(event) =>
                            updateEvent(index, 'end', event.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`event-venue-${index}`}>Event venue</Label>
                        <Input
                          id={`event-venue-${index}`}
                          maxLength={200}
                          value={item.venue}
                          onChange={(event) =>
                            updateEvent(index, 'venue', event.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`event-address-${index}`}>
                          Event address
                        </Label>
                        <Input
                          id={`event-address-${index}`}
                          maxLength={300}
                          value={item.address}
                          onChange={(event) =>
                            updateEvent(index, 'address', event.target.value)
                          }
                        />
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => removeEvent(index)}
                    >
                      Remove event
                    </Button>
                  </div>
                ))}

                <Button variant="secondary" type="button" onClick={addEvent}>
                  Add event
                </Button>
              </fieldset>

              <div className="space-y-2">
                <Label htmlFor="slug">Invitation link</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/i/</span>
                  <Input
                    id="slug"
                    minLength={3}
                    maxLength={80}
                    disabled={slugLocked}
                    value={form.slug}
                    onChange={(event) => updateField('slug', event.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {slugLocked
                    ? 'The link is locked after publishing.'
                    : 'Lowercase letters, numbers, and hyphens.'}
                </p>
              </div>

              {error !== '' && (
                <p
                  role="alert"
                  className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {error}
                </p>
              )}
              {saved && (
                <p
                  role="status"
                  className="rounded-md bg-accent/15 px-3 py-2 text-sm text-foreground"
                >
                  Saved.
                </p>
              )}

              <DialogFooter>
                <Button variant="ghost" type="button" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save wedding'}
                </Button>
              </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>

      {exists && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Ready to edit your invitation?{' '}
          <Link
            to="/editor"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Open editor
          </Link>
        </p>
      )}
    </Page>
  )
}
