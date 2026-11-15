import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Eye, PenLine } from 'lucide-react'

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
import InvitationTemplate from '../components/InvitationTemplate'
import type { Invitation, InvitationPreview } from '../types'

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

export default function InvitationEditorPage({
  initialView = 'edit',
}: {
  initialView?: 'edit' | 'preview'
}) {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [meta, setMeta] = useState<Meta>(emptyMeta)
  const [view, setView] = useState<'edit' | 'preview'>(initialView)
  const [preview, setPreview] = useState<InvitationPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [needsWedding, setNeedsWedding] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function loadPreview() {
    setPreviewLoading(true)
    try {
      setPreview(await api.get<InvitationPreview>('/invitation/preview'))
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Gagal memuat pratinjau undangan. Coba lagi.',
      )
    } finally {
      setPreviewLoading(false)
    }
  }

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
            err instanceof ApiError ? err.message : 'Gagal memuat undangan. Coba lagi.',
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

  useEffect(() => {
    if (view === 'preview') void loadPreview()
  }, [view])

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
          ? 'Draf tersimpan. Terbitkan lagi untuk memperbarui halaman publik.'
          : 'Draf tersimpan.',
      )
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Gagal menyimpan undangan. Coba lagi.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handlePublish() {
    if (
      !window.confirm(
        'Terbitkan undangan ini? Halaman publik akan tampil dengan draf yang tersimpan.',
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
      setNotice('Undangan sudah terbit.')
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Gagal menerbitkan undangan. Coba lagi.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleUnpublish() {
    if (
      !window.confirm(
        'Tarik undangan ini? Halaman publik tidak akan bisa diakses lagi.',
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
      setNotice('Undangan sudah ditarik.')
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Gagal menarik undangan. Coba lagi.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Page width="wide">
      <AppTopBar active="studio" />

      <section className="mb-8 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <p className="app-kicker mb-3">Studio undangan</p>
          <h1 className="font-serif text-4xl sm:text-5xl">Bentuk undangan yang akan diingat tamu.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Ubah ceritamu, periksa detailnya, dan lihat hasil undangan di satu tempat.
          </p>
        </div>
        <div className="flex rounded-lg border bg-card p-1" role="tablist" aria-label="Tampilan studio undangan">
          <Button
            type="button"
            size="sm"
            variant={view === 'edit' ? 'secondary' : 'ghost'}
            role="tab"
            aria-selected={view === 'edit'}
            onClick={() => setView('edit')}
          >
            <PenLine data-icon="inline-start" />
            Ubah
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === 'preview' ? 'secondary' : 'ghost'}
            role="tab"
            aria-selected={view === 'preview'}
            onClick={() => setView('preview')}
          >
            <Eye data-icon="inline-start" />
            Pratinjau
          </Button>
        </div>
      </section>

      {view === 'edit' ? (
        <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="font-serif text-2xl">
                Draf undangan
              </CardTitle>
              <CardDescription>
                Simpan isinya, lalu terbitkan saat sudah siap.
              </CardDescription>
            </div>
            <Badge variant={meta.publishedAt ? 'default' : 'secondary'}>
              {meta.publishedAt
                ? `Published (v${meta.version})`
                : 'Draf'}
            </Badge>
          </div>
          {meta.publishedAt && meta.slug && (
            <p className="text-sm text-muted-foreground">
              Tautan publik:{' '}
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
            <p className="text-muted-foreground">Memuat…</p>
          ) : needsWedding ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm">
                Atur data pernikahanmu dulu.
              </p>
              <Button asChild size="sm">
                <Link to="/">Ke ringkasan</Link>
              </Button>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="template">Templat</Label>
                <Select value="classic" disabled>
                  <SelectTrigger id="template" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="classic">Klasik</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="headline">Judul</Label>
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
                  <Label htmlFor="quote">Kutipan</Label>
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
                <Label htmlFor="message">Pesan</Label>
                <Textarea
                  id="message"
                  rows={6}
                  maxLength={4000}
                  placeholder="Ceritakan kisahmu atau tulis pesan untuk tamu."
                  value={form.message}
                  onChange={(event) => updateField('message', event.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cover_image_url">URL gambar sampul</Label>
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
                  <Label htmlFor="closing_message">Pesan penutup</Label>
                  <Input
                    id="closing_message"
                    maxLength={500}
                    placeholder="Dengan cinta, Ayu & Bima"
                    value={form.closing_message}
                    onChange={(event) =>
                      updateField('closing_message', event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gallery">URL gambar galeri</Label>
                <Textarea
                  id="gallery"
                  rows={4}
                  placeholder={'Satu URL per baris\nhttps://...'}
                  value={form.gallery}
                  onChange={(event) => updateField('gallery', event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Satu URL gambar per baris.
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
                  {saving ? 'Menyimpan…' : 'Simpan draf'}
                </Button>
                {meta.publishedAt ? (
                  <Button
                    variant="outline"
                    type="button"
                    disabled={saving}
                    onClick={() => void handleUnpublish()}
                  >
                    Tarik undangan
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    type="button"
                    disabled={saving}
                    onClick={() => void handlePublish()}
                  >
                    Terbitkan
                  </Button>
                )}
              </div>
            </form>
          )}
        </CardContent>
        </Card>
      ) : (
        <section aria-label="Pratinjau undangan">
          <Card className="mb-6">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="font-serif text-2xl">Pratinjau tamu</CardTitle>
                  <CardDescription>Draf tersimpan, persis seperti yang dilihat tamu.</CardDescription>
                </div>
                <Badge variant={meta.publishedAt ? 'default' : 'secondary'}>
                  {meta.publishedAt ? 'Terbit' : 'Draf'}
                </Badge>
              </div>
            </CardHeader>
          </Card>
          {previewLoading ? (
            <p className="text-muted-foreground">Memuat pratinjau…</p>
          ) : preview ? (
            <InvitationTemplate wedding={preview.wedding} invitation={preview.invitation} />
          ) : (
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm">Atur data pernikahanmu sebelum melihat pratinjau undangan.</p>
                <Button asChild size="sm">
                  <Link to="/">Ke ringkasan</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </section>
      )}
    </Page>
  )
}
