import { useState } from 'react'
import type { FormEvent } from 'react'
import { Heart } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

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
import { ApiError } from '../api'
import { useAuth } from '../auth'

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  if (user !== null) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to sign in')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(18rem,0.8fr)_minmax(24rem,1fr)]">
      <aside className="hidden bg-foreground p-10 text-background lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-2 font-semibold"><Heart className="size-4 fill-primary text-primary" /> openinvite.</div>
        <div><p className="app-kicker mb-4 text-primary">A little less to carry</p><p className="max-w-sm font-serif text-4xl leading-tight">The beautiful part is already on its way.</p></div>
        <p className="text-sm text-background/60">Invitation planning, made personal.</p>
      </aside>
      <div className="flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <p className="app-kicker">Welcome back</p>
          <CardTitle className="font-serif text-3xl">Sign in</CardTitle>
          <CardDescription>Manage your wedding invitation.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {error !== '' && (
              <p
                role="alert"
                className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            New here?{' '}
            <Link
              to="/register"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
      </div>
    </main>
  )
}
