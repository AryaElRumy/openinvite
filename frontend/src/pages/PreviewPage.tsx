import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { AppTopBar, Page } from '@/components/Page'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ApiError, api } from '../api'
import InvitationTemplate from '../components/InvitationTemplate'
import type { InvitationPreview } from '../types'

export default function PreviewPage() {
  const [preview, setPreview] = useState<InvitationPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsWedding, setNeedsWedding] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    api
      .get<InvitationPreview>('/invitation/preview')
      .then((data) => {
        if (!cancelled) setPreview(data)
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) {
          setNeedsWedding(true)
        } else {
          setError(err instanceof ApiError ? err.message : 'Gagal memuat pratinjau. Coba lagi.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Page>
      <AppTopBar active="studio" />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Pratinjau</CardTitle>
          <CardDescription>
            Draf tersimpan, persis seperti yang dilihat tamu.
          </CardDescription>
        </CardHeader>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">Memuat…</p>
      ) : needsWedding ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm">Atur data pernikahanmu dulu.</p>
            <Button asChild size="sm">
              <Link to="/">Ke ringkasan</Link>
            </Button>
          </CardContent>
        </Card>
      ) : error !== '' ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : (
        preview && (
          <InvitationTemplate
            wedding={preview.wedding}
            invitation={preview.invitation}
          />
        )
      )}
    </Page>
  )
}
