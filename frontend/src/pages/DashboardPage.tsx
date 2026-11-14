import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, api } from '../api'
import { useAuth } from '../auth'
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

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const [form, setForm] = useState<FormState>(emptyForm)
  const [slugLocked, setSlugLocked] = useState(false)
  const [exists, setExists] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

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
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save wedding')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="page">
      <header className="topbar">
        <strong>OpenInvite</strong>
        <nav className="topbar-actions">
          <Link className="link" to="/editor">
            Edit invitation
          </Link>
          <button className="link" type="button" onClick={() => void logout()}>
            Sign out
          </button>
        </nav>
      </header>

      <section className="card">
        <h1>{exists ? 'Wedding details' : 'Set up your wedding'}</h1>
        <p className="muted">{user?.email}</p>

        {loading ? (
          <p>Loading…</p>
        ) : (
          <form className="form" onSubmit={handleSubmit}>
            <div className="grid">
              <label className="field">
                <span>Partner one</span>
                <input
                  required
                  maxLength={120}
                  value={form.partner_one_name}
                  onChange={(event) =>
                    updateField('partner_one_name', event.target.value)
                  }
                />
              </label>

              <label className="field">
                <span>Partner two</span>
                <input
                  required
                  maxLength={120}
                  value={form.partner_two_name}
                  onChange={(event) =>
                    updateField('partner_two_name', event.target.value)
                  }
                />
              </label>

              <label className="field">
                <span>Wedding date</span>
                <input
                  type="date"
                  required
                  value={form.wedding_date}
                  onChange={(event) =>
                    updateField('wedding_date', event.target.value)
                  }
                />
              </label>

              <label className="field">
                <span>Venue</span>
                <input
                  required
                  maxLength={200}
                  value={form.venue_name}
                  onChange={(event) =>
                    updateField('venue_name', event.target.value)
                  }
                />
              </label>

              <label className="field">
                <span>Venue address</span>
                <input
                  maxLength={300}
                  value={form.venue_address}
                  onChange={(event) =>
                    updateField('venue_address', event.target.value)
                  }
                />
              </label>

              <label className="field">
                <span>Maps link</span>
                <input
                  type="url"
                  maxLength={500}
                  placeholder="https://maps.google.com/..."
                  value={form.maps_url}
                  onChange={(event) =>
                    updateField('maps_url', event.target.value)
                  }
                />
              </label>
            </div>

            <fieldset className="events">
              <legend>Events</legend>
              {form.events.map((item, index) => (
                <div className="event-card" key={index}>
                  <label className="field">
                    <span>Event name</span>
                    <input
                      maxLength={120}
                      placeholder="Akad Nikah"
                      value={item.name}
                      onChange={(event) =>
                        updateEvent(index, 'name', event.target.value)
                      }
                    />
                  </label>

                  <div className="grid">
                    <label className="field">
                      <span>Starts</span>
                      <input
                        maxLength={40}
                        placeholder="08:00"
                        value={item.start}
                        onChange={(event) =>
                          updateEvent(index, 'start', event.target.value)
                        }
                      />
                    </label>

                    <label className="field">
                      <span>Ends</span>
                      <input
                        maxLength={40}
                        placeholder="10:00"
                        value={item.end}
                        onChange={(event) =>
                          updateEvent(index, 'end', event.target.value)
                        }
                      />
                    </label>

                    <label className="field">
                      <span>Event venue</span>
                      <input
                        maxLength={200}
                        value={item.venue}
                        onChange={(event) =>
                          updateEvent(index, 'venue', event.target.value)
                        }
                      />
                    </label>

                    <label className="field">
                      <span>Event address</span>
                      <input
                        maxLength={300}
                        value={item.address}
                        onChange={(event) =>
                          updateEvent(index, 'address', event.target.value)
                        }
                      />
                    </label>
                  </div>

                  <button
                    className="link"
                    type="button"
                    onClick={() => removeEvent(index)}
                  >
                    Remove event
                  </button>
                </div>
              ))}

              <button className="button secondary" type="button" onClick={addEvent}>
                Add event
              </button>
            </fieldset>

            <label className="field">
              <span>Invitation link</span>
              <div className="slug-row">
                <span className="muted">/i/</span>
                <input
                  minLength={3}
                  maxLength={80}
                  disabled={slugLocked}
                  value={form.slug}
                  onChange={(event) => updateField('slug', event.target.value)}
                />
              </div>
              <small className="muted">
                {slugLocked
                  ? 'The link is locked after publishing.'
                  : 'Lowercase letters, numbers, and hyphens.'}
              </small>
            </label>

            {error !== '' && <p className="error">{error}</p>}
            {saved && <p className="success">Saved.</p>}

            <div className="actions">
              <button className="button" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save wedding'}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  )
}
