import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'

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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ApiError, api } from '../api'
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
    <Page>
      <AppTopBar active="editor" />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="font-serif text-2xl">
                Invitation draft
              </CardTitle>
              <CardDescription>
                Save your content, then publish when it is ready.
              </CardDescription>
            </div>
            <Badge variant={meta.publishedAt ? 'default' : 'secondary'}>
              {meta.publishedAt
                ? `Published (v${meta.version})`
                : 'Draft'}
            </Badge>
          </div>
          {meta.publishedAt && meta.slug && (
            <p className="text-sm text-muted-foreground">
              Public link:{' '}
              <Link
                to={`/i/${meta.slug}`}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                /i/{meta.slug}
              </Link>
            </p>
          )}
        </CardHeader>

        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : needsWedding ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm">
                Set up your wedding first.
              </p>
              <Button asChild size="sm">
                <Link to="/">Go to dashboard</Link>
              </Button>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="template">Template</Label>
                <Select value="classic" disabled>
                  <SelectTrigger id="template" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="classic">Classic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="headline">Headline</Label>
                  <Input
                    id="headline"
                    maxLength={120}
                    placeholder="Ayu & Bima"
                    value={form.headline}
                    onChange={(event) =>
                      updateField('headline', event.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quote">Quote</Label>
                  <Input
                    id="quote"
                    maxLength={500}
                    value={form.quote}
                    onChange={(event) =>
                      updateField('quote', event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  rows={6}
                  maxLength={4000}
                  placeholder="Share your story or a note for your guests."
                  value={form.message}
                  onChange={(event) => updateField('message', event.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cover_image_url">Cover image URL</Label>
                  <Input
                    id="cover_image_url"
                    type="url"
                    maxLength={500}
                    placeholder="https://..."
                    value={form.cover_image_url}
                    onChange={(event) =>
                      updateField('cover_image_url', event.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="closing_message">Closing message</Label>
                  <Input
                    id="closing_message"
                    maxLength={500}
                    placeholder="With love, Ayu & Bima"
                    value={form.closing_message}
                    onChange={(event) =>
                      updateField('closing_message', event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gallery">Gallery image URLs</Label>
                <Textarea
                  id="gallery"
                  rows={4}
                  placeholder={'One URL per line\nhttps://...'}
                  value={form.gallery}
                  onChange={(event) => updateField('gallery', event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  One image URL per line.
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
              {notice !== '' && (
                <p
                  role="status"
                  className="rounded-md bg-accent/15 px-3 py-2 text-sm text-foreground"
                >
                  {notice}
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save draft'}
                </Button>
                {meta.publishedAt ? (
                  <Button
                    variant="outline"
                    type="button"
                    disabled={saving}
                    onClick={() => void handleUnpublish()}
                  >
                    Unpublish
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    type="button"
                    disabled={saving}
                    onClick={() => void handlePublish()}
                  >
                    Publish
                  </Button>
                )}
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </Page>
  )
}