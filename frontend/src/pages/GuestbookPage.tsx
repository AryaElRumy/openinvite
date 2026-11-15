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
              : 'Gagal memuat akses buku tamu. Coba lagi.',
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
        'Ganti tautan buku tamu saat ini? Tautan lama tidak akan bisa dipakai lagi.',
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
      setNotice('Tautan buku tamu sudah dibuat. Salin sekarang karena tidak akan ditampilkan lagi.')
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Gagal membuat akses buku tamu. Coba lagi.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function revokeAccess() {
    if (!window.confirm('Cabut akses buku tamu?')) return

    setError('')
    setNotice('')
    setSaving(true)

    try {
      await api.delete('/receptionist')
      setToken(null)
      setStatus(null)
      setNotice('Akses buku tamu sudah dicabut.')
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Gagal mencabut akses buku tamu. Coba lagi.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function copyLink() {
    if (!token) return

    try {
      await navigator.clipboard.writeText(`${window.location.origin}/reception/${token}`)
      setNotice('Tautan buku tamu disalin.')
    } catch {
      setError('Gagal menyalin tautan buku tamu.')
    }
  }

  const guestbookUrl = token ? `${window.location.origin}/reception/${token}` : ''

  return (
    <Page width="wide">
      <AppTopBar active="guestbook" />

      <section className="mb-8 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <p className="app-kicker mb-3">Hari acara</p>
          <h1 className="max-w-xl text-4xl sm:text-5xl">Akses buku tamu</h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            Beri tim resepsi tautan privat untuk mencari tamu dan mencatat kedatangan.
          </p>
        </div>
        <Badge variant={status?.active ? 'default' : 'secondary'}>
          {status?.active ? 'Aktif' : 'Belum diatur'}
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
            <CardTitle className="font-serif text-2xl">Buku tamu resepsi</CardTitle>
            <CardDescription>
              Tampilan petugas resepsi hanya untuk mencari tamu dan mencatat kehadiran. Pengaturan pernikahanmu tidak terlihat di sana.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {loading ? (
              <p className="text-sm text-muted-foreground">Memuat status akses…</p>
            ) : token ? (
              <div className="flex flex-col gap-3">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="guestbook-link">
                  Tautan buku tamu
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input id="guestbook-link" readOnly value={guestbookUrl} className="min-w-0 flex-1" />
                  <Button variant="secondary" onClick={() => void copyLink()}>
                    <Copy data-icon="inline-start" />
                    Salin tautan
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tautan ini hanya tampil sekali saat dibuat. Simpan di tempat aman sebelum meninggalkan halaman ini.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed bg-muted/30 p-5">
                <p className="font-medium">Belum ada tautan buku tamu</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Buat tautan privat untuk orang yang memeriksa tamu di pintu masuk.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button disabled={saving || loading} onClick={() => void createAccess()}>
                {status?.active ? 'Buat ulang tautan' : 'Buat tautan buku tamu'}
              </Button>
              {status?.active && (
                <Button variant="outline" disabled={saving} onClick={() => void revokeAccess()}>
                  Cabut akses
                </Button>
              )}
              {token && (
                <Button variant="ghost" asChild>
                  <a href={guestbookUrl} target="_blank" rel="noreferrer">
                    Buka buku tamu
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
            <CardTitle className="font-serif text-xl">Catatan akses</CardTitle>
            <CardDescription>Bagikan tautan buku tamu hanya ke tim resepsimu.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <p className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-foreground" />Pencarian tamu lewat nama atau kode QR</p>
            <p className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-foreground" />Konfirmasi kehadiran dan peringatan tamu ganda</p>
            <p className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-foreground" />Tidak bisa mengakses pengaturan pemilik</p>
            {status?.last_used_at && (
              <p className="border-t pt-3 text-xs">Terakhir dipakai {new Date(status.last_used_at).toLocaleString()}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </Page>
  )
}
