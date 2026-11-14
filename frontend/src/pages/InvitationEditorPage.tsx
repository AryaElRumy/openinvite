import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, api } from '../api'
import { useAuth } from '../auth'
import type { Invitation } from '../types'

type FormState = {
  headline: string
  message: string
  quote: string
  cover_image_url: string
  gallery: string
  closing_message: string
}

const emptyForm = (): FormState => ({
  headline: '',
  message: '',
  quote: '',
  cover_image_url: '',
  gallery: '',
  closing_message: '',
})

function toForm(invitation: Invitation): FormState {
  return {
    headline: invitation.headline,
    message: invitation.message,
    quote: invitation.quote ?? '',
    cover_image_url: invitation.cover_image_url ?? '',
    gallery: invitation.gallery_image_urls.join('\n'),
    closing_message: invitation.closing_message ?? '',
  }
}

function nullIfEmpty(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

export default function InvitationEditorPage() {
  const { logout } = useAuth()
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [needsWedding, setNeedsWedding] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false

    api
      .get<Invitation>('/invitation')
      .then((invitation) => {
        if (!cancelled) setForm(toForm(invitation))
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) {
          setNeedsWedding(true)
        } else {
          setError(
            err instanceof ApiError ? err.message : 'Unable to load invitation',
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

  function updateField(field: keyof FormState, value: string) {
    setSaved(false)
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSaved(false)
    setSaving(true)

    const payload = {
      template_id: 'classic',
      headline: form.headline.trim(),
      message: form.message,
      quote: nullIfEmpty(form.quote),
      cover_image_url: nullIfEmpty(form.cover_image_url),
      gallery_image_urls: form.gallery
        .split('\n')
        .map((url) => url.trim())
        .filter((url) => url !== ''),
      closing_message: nullIfEmpty(form.closing_message),
    }

    try {
      const invitation = await api.put<Invitation>('/invitation', payload)
      setForm(toForm(invitation))
      setSaved(true)
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Unable to save invitation',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="page">
      <header className="topbar">
        <strong>OpenInvite</strong>
        <nav className="topbar-actions">
          <Link className="link" to="/">
            Dashboard
          </Link>
          <Link className="link" to="/preview">
            Preview
          </Link>
          <button className="link" type="button" onClick={() => void logout()}>
            Sign out
          </button>
        </nav>
      </header>

      <section className="card">
        <h1>Invitation draft</h1>

        {loading ? (
          <p>Loading…</p>
        ) : needsWedding ? (
          <p>
            Set up your wedding first. <Link to="/">Go to dashboard</Link>
          </p>
        ) : (
          <form className="form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Template</span>
              <select value="classic" disabled>
                <option value="classic">Classic</option>
              </select>
            </label>

            <label className="field">
              <span>Headline</span>
              <input
                maxLength={120}
                placeholder="Ayu & Bima"
                value={form.headline}
                onChange={(event) =>
                  updateField('headline', event.target.value)
                }
              />
            </label>

            <label className="field">
              <span>Message</span>
              <textarea
                rows={6}
                maxLength={4000}
                placeholder="Share your story or a note for your guests."
                value={form.message}
                onChange={(event) => updateField('message', event.target.value)}
              />
            </label>

            <label className="field">
              <span>Quote</span>
              <input
                maxLength={500}
                value={form.quote}
                onChange={(event) => updateField('quote', event.target.value)}
              />
            </label>

            <label className="field">
              <span>Cover image URL</span>
              <input
                type="url"
                maxLength={500}
                placeholder="https://..."
                value={form.cover_image_url}
                onChange={(event) =>
                  updateField('cover_image_url', event.target.value)
                }
              />
            </label>

            <label className="field">
              <span>Gallery image URLs</span>
              <textarea
                rows={4}
                placeholder={'One URL per line\nhttps://...'}
                value={form.gallery}
                onChange={(event) => updateField('gallery', event.target.value)}
              />
              <small className="muted">One image URL per line.</small>
            </label>

            <label className="field">
              <span>Closing message</span>
              <input
                maxLength={500}
                placeholder="With love, Ayu & Bima"
                value={form.closing_message}
                onChange={(event) =>
                  updateField('closing_message', event.target.value)
                }
              />
            </label>

            {error !== '' && <p className="error">{error}</p>}
            {saved && <p className="success">Draft saved.</p>}

            <div className="actions">
              <button className="button" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save draft'}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  )
}
