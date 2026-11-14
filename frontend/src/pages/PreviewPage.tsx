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
          setError(err instanceof ApiError ? err.message : 'Unable to load preview')
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
      <AppTopBar active="preview" />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Preview</CardTitle>
          <CardDescription>
            The saved draft, exactly as guests will see it.
          </CardDescription>
        </CardHeader>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : needsWedding ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm">Set up your wedding first.</p>
            <Button asChild size="sm">
              <Link to="/">Go to dashboard</Link>
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