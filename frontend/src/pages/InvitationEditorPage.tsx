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

type Meta = {
  slug: string | null
  version: number
  publishedAt: string | null
}

const emptyMeta: Meta = { slug: null, version: 0, publishedAt: null }

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

function toMeta(invitation: Invitation): Meta {
  return {
    slug: invitation.slug,
    version: invitation.version,
    publishedAt: invitation.published_at,
  }
}

export default function InvitationEditorPage() {
  const { logout } = useAuth()
  const [form, setForm] = useState<FormState>(emptyForm)
  const [meta, setMeta] = useState<Meta>(emptyMeta)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [needsWedding, setNeedsWedding] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false

    api
      .get<Invitation>('/invitation')
      .then((invitation) => {
        if (cancelled) return
        setForm(toForm(invitation))
        setMeta(toMeta(invitation))
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
    setNotice('')
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function saveDraft(): Promise<Invitation> {
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

    const invitation = await api.put<Invitation>('/invitation', payload)
    setForm(toForm(invitation))
    setMeta(toMeta(invitation))
    return invitation
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setNotice('')
    setSaving(true)

    try {
      const invitation = await saveDraft()
      setNotice(
        invitation.published_at
          ? 'Draft saved. Publish again to update the public page.'
          : 'Draft saved.',
      )
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Unable to save invitation',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handlePublish() {
    if (
      !window.confirm(
        'Publish this invitation? Your public page will go live with the saved draft.',
      )
    ) {
      return
    }

    setError('')
    setNotice('')
    setSaving(true)

    try {
      await saveDraft()
      const invitation = await api.post<Invitation>('/invitation/publish')
      setForm(toForm(invitation))
      setMeta(toMeta(invitation))
      setNotice('Invitation published.')
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Unable to publish invitation',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleUnpublish() {
    if (
      !window.confirm(
        'Unpublish this invitation? The public page will stop working.',
      )
    ) {
      return
    }

    setError('')
    setNotice('')
    setSaving(true)

    try {
      const invitation = await api.post<Invitation>('/invitation/unpublish')
      setForm(toForm(invitation))
      setMeta(toMeta(invitation))
      setNotice('Invitation unpublished.')
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Unable to unpublish invitation',
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
            <p className={meta.publishedAt ? 'success' : 'muted'}>
              {meta.publishedAt
                ? `Published (v${meta.version}).`
                : 'Draft — not visible to guests.'}
            </p>
            {meta.publishedAt && meta.slug && (
              <p className="muted">
                Public link:{' '}
                <Link
                  to={`/i/${meta.slug}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  /i/{meta.slug}
                </Link>
              </p>
            )}

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
            {notice !== '' && <p className="success">{notice}</p>}

            <div className="actions">
              <button className="button" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save draft'}
              </button>
              {meta.publishedAt ? (
                <button
                  className="button secondary"
                  type="button"
                  disabled={saving}
                  onClick={() => void handleUnpublish()}
                >
                  Unpublish
                </button>
              ) : (
                <button
                  className="button secondary"
                  type="button"
                  disabled={saving}
                  onClick={() => void handlePublish()}
                >
                  Publish
                </button>
              )}
            </div>
          </form>
        )}
      </section>
    </main>
  )
}
