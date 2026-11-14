import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { MoreHorizontal, Plus, Search, Settings2, Upload } from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ApiError, api } from '../api'
import type {
  Guest,
  GuestCategory,
  GuestImportResult,
  GuestPayload,
  Wedding,
} from '../types'

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [categories, setCategories] = useState<GuestCategory[]>([])
  const [wedding, setWedding] = useState<Wedding | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsWedding, setNeedsWedding] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [shareFilter, setShareFilter] = useState('')
  const [rsvpFilter, setRsvpFilter] = useState('')

  const [guestName, setGuestName] = useState('')
  const [guestCategoryId, setGuestCategoryId] = useState('')
  const [guestMaxAttendees, setGuestMaxAttendees] = useState('1')
  const [editingGuestId, setEditingGuestId] = useState<string | null>(null)
  const [guestFormOpen, setGuestFormOpen] = useState(false)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)

  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editCategoryName, setEditCategoryName] = useState('')

  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<GuestImportResult | null>(
    null,
  )
  const [importCommitted, setImportCommitted] = useState(false)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      api.get<Guest[]>('/guests'),
      api.get<GuestCategory[]>('/guest-categories'),
      api.get<Wedding>('/wedding'),
    ])
      .then(([guestData, categoryData, weddingData]) => {
        if (cancelled) return
        setGuests(guestData)
        setCategories(categoryData)
        setWedding(weddingData)
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) {
          setNeedsWedding(true)
        } else {
          setError(err instanceof ApiError ? err.message : 'Unable to load guests')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [reloadToken])

  function reload() {
    setReloadToken((value) => value + 1)
  }

  function resetGuestForm() {
    setEditingGuestId(null)
    setGuestName('')
    setGuestCategoryId('')
    setGuestMaxAttendees('1')
  }

  function startEditGuest(guest: Guest) {
    setEditingGuestId(guest.id)
    setGuestName(guest.name)
    setGuestCategoryId(guest.category_id ?? '')
    setGuestMaxAttendees(String(guest.max_attendees))
    setError('')
    setNotice('')
    setGuestFormOpen(true)
  }

  async function handleGuestSubmit(event: FormEvent) {
    event.preventDefault()
    const name = guestName.trim()
    const maxAttendees = Number(guestMaxAttendees)
    if (name === '') return
    if (!Number.isInteger(maxAttendees) || maxAttendees < 1) {
      setError('Max attendees must be at least 1.')
      return
    }

    setError('')
    setNotice('')
    setSaving(true)

    const payload: GuestPayload = {
      name,
      category_id: guestCategoryId === '' ? null : guestCategoryId,
      max_attendees: maxAttendees,
    }

    try {
      if (editingGuestId === null) {
        await api.post<Guest>('/guests', payload)
        setNotice('Guest added.')
      } else {
        await api.put<Guest>(`/guests/${editingGuestId}`, payload)
        setNotice('Guest updated.')
      }
      resetGuestForm()
      setGuestFormOpen(false)
      reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save guest')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteGuest(guest: Guest) {
    if (!window.confirm(`Delete ${guest.name}?`)) return

    setError('')
    setNotice('')
    try {
      await api.delete(`/guests/${guest.id}`)
      if (editingGuestId === guest.id) resetGuestForm()
      setNotice('Guest deleted.')
      reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to delete guest')
    }
  }

  async function handleAddCategory(event: FormEvent) {
    event.preventDefault()
    const name = newCategoryName.trim()
    if (name === '') return

    setError('')
    setNotice('')
    setSaving(true)

    try {
      await api.post<GuestCategory>('/guest-categories', { name })
      setNewCategoryName('')
      setNotice('Category added.')
      reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to add category')
    } finally {
      setSaving(false)
    }
  }

  function startEditCategory(category: GuestCategory) {
    setEditingCategoryId(category.id)
    setEditCategoryName(category.name)
    setError('')
    setNotice('')
  }

  function resetCategoryForm() {
    setEditingCategoryId(null)
    setEditCategoryName('')
  }

  async function handleRenameCategory(event: FormEvent) {
    event.preventDefault()
    const name = editCategoryName.trim()
    if (editingCategoryId === null || name === '') return

    setError('')
    setNotice('')
    setSaving(true)

    try {
      await api.put<GuestCategory>(`/guest-categories/${editingCategoryId}`, {
        name,
      })
      resetCategoryForm()
      setNotice('Category renamed.')
      reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to rename category')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteCategory(category: GuestCategory) {
    if (
      !window.confirm(
        `Delete ${category.name}? Its guests will become uncategorized.`,
      )
    ) {
      return
    }

    setError('')
    setNotice('')
    try {
      await api.delete(`/guest-categories/${category.id}`)
      if (categoryFilter === category.id) setCategoryFilter('')
      if (guestCategoryId === category.id) setGuestCategoryId('')
      if (editingCategoryId === category.id) resetCategoryForm()
      setNotice('Category deleted.')
      reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to delete category')
    }
  }

  function handleImportFileChange(event: ChangeEvent<HTMLInputElement>) {
    setImportFile(event.target.files?.[0] ?? null)
    setImportPreview(null)
    setImportCommitted(false)
    setError('')
    setNotice('')
  }

  async function handlePreviewImport() {
    if (importFile === null) return

    setError('')
    setNotice('')
    setSaving(true)

    try {
      const result = await api.upload<GuestImportResult>(
        '/guests/import?dry_run=true',
        importFile,
      )
      setImportPreview(result)
      setImportCommitted(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to preview import')
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirmImport() {
    if (importFile === null || importPreview === null) return
    if (!window.confirm(`Import ${importPreview.valid_count} guests?`)) return

    setError('')
    setNotice('')
    setSaving(true)

    try {
      const result = await api.upload<GuestImportResult>(
        '/guests/import?dry_run=false',
        importFile,
      )
      setImportPreview(result)
      setImportCommitted(true)
      setNotice(
        `Imported ${result.imported} guests. ${result.invalid_count} rows skipped.`,
      )
      reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to import guests')
    } finally {
      setSaving(false)
    }
  }

  function formatWeddingDate(value: string): string {
    const date = new Date(`${value}T00:00:00`)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString(undefined, { dateStyle: 'long' })
  }

  function guestUrl(guest: Guest): string {
    if (wedding === null) return ''
    return `${window.location.origin}/i/${wedding.slug}/${guest.invitation_code}`
  }

  function shareMessage(guest: Guest): string {
    if (wedding === null) return ''
    return (
      `Hi ${guest.name}, you're invited to ` +
      `${wedding.partner_one_name} & ${wedding.partner_two_name}'s wedding ` +
      `on ${formatWeddingDate(wedding.wedding_date)} at ` +
      `${wedding.venue_name}.\nOpen your invitation: ${guestUrl(guest)}`
    )
  }

  async function handleCopyLink(guest: Guest) {
    setError('')
    setNotice('')
    try {
      await navigator.clipboard.writeText(guestUrl(guest))
      setNotice('Guest link copied.')
    } catch {
      setError('Unable to copy the guest link.')
    }
  }

  async function handleShareGuest(guest: Guest) {
    setError('')
    setNotice('')
    try {
      await api.put<Guest>(`/guests/${guest.id}/share`, { shared: true })
      setNotice(
        `${guest.name} marked shared. This does not confirm delivery or read.`,
      )
      reload()
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Unable to mark the guest as shared.',
      )
    }
  }

  async function handleUnshareGuest(guest: Guest) {
    setError('')
    setNotice('')
    try {
      await api.put<Guest>(`/guests/${guest.id}/share`, { shared: false })
      setNotice('Share mark cleared.')
      reload()
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Unable to clear the share mark.',
      )
    }
  }

  async function handleClearRsvp(guest: Guest) {
    if (!window.confirm(`Clear the RSVP for ${guest.name}?`)) return

    setError('')
    setNotice('')
    try {
      await api.delete(`/guests/${guest.id}/rsvp`)
      setNotice('RSVP cleared.')
      reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to clear the RSVP.')
    }
  }

  async function handleUndoCheckIn(guest: Guest) {
    if (!window.confirm(`Undo the check-in for ${guest.name}?`)) return

    setError('')
    setNotice('')
    try {
      await api.delete(`/guests/${guest.id}/check-in`)
      setNotice('Check-in undone.')
      reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to undo the check-in.')
    }
  }

  function categoryName(categoryId: string | null): string {
    if (categoryId === null) return 'Uncategorized'
    return (
      categories.find((category) => category.id === categoryId)?.name ??
      'Uncategorized'
    )
  }

  const totalCapacity = guests.reduce(
    (total, guest) => total + guest.max_attendees,
    0,
  )
  const attendingCount = guests.filter(
    (guest) => guest.rsvp?.status === 'attending',
  ).length
  const checkedInCount = guests.filter(
    (guest) => guest.checked_in_at !== null,
  ).length

  const query = search.trim().toLowerCase()
  const visibleGuests = guests.filter(
    (guest) =>
      (query === '' || guest.name.toLowerCase().includes(query)) &&
      (categoryFilter === '' || guest.category_id === categoryFilter) &&
      (shareFilter === '' ||
        (shareFilter === 'shared'
          ? guest.shared_at !== null
          : guest.shared_at === null)) &&
      (rsvpFilter === '' ||
        (rsvpFilter === 'none'
          ? guest.rsvp === null
          : guest.rsvp?.status === rsvpFilter)),
  )

  return (
    <Page width="wide">
      <AppTopBar active="guests" />

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <CardTitle className="font-serif text-3xl">Guest list</CardTitle>
              <CardDescription className="mt-2">
                Find, filter, and keep track of everyone invited.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setCategoryModalOpen(true)}>
                <Settings2 data-icon="inline-start" />
                Categories
              </Button>
              <Button variant="outline" size="sm" onClick={() => setImportModalOpen(true)}>
                <Upload data-icon="inline-start" />
                Import
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  resetGuestForm()
                  setGuestFormOpen(true)
                }}
              >
                <Plus data-icon="inline-start" />
                Add guest
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>{guests.length} invited</span>
            <span>{totalCapacity} attendee capacity</span>
            <span>{attendingCount} attending</span>
            <span>{checkedInCount} checked in</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : needsWedding ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm">Set up your wedding first.</p>
              <Button asChild size="sm">
                <Link to="/">Go to dashboard</Link>
              </Button>
            </div>
          ) : (
            <>
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

              {guests.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  “Marked shared” is a manual record. It does not confirm
                  delivery or read.
                </p>
              )}

              <div className="flex flex-col gap-3 rounded-xl bg-muted/45 p-3 lg:flex-row lg:items-end">
                <div className="min-w-0 flex-1 space-y-2">
                  <Label htmlFor="guest-search">Search guests</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="guest-search"
                      type="search"
                      className="pl-9"
                      placeholder="Search by name"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2 lg:w-48">
                  <Label htmlFor="guest-category-filter">Category</Label>
                  <Select
                    value={categoryFilter || 'all'}
                    onValueChange={(value) =>
                      setCategoryFilter(value === 'all' ? '' : value)
                    }
                  >
                    <SelectTrigger id="guest-category-filter" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 lg:w-44">
                  <Label htmlFor="guest-share-filter">Share status</Label>
                  <Select
                    value={shareFilter || 'all'}
                    onValueChange={(value) =>
                      setShareFilter(value === 'all' ? '' : value)
                    }
                  >
                    <SelectTrigger id="guest-share-filter" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All guests</SelectItem>
                      <SelectItem value="shared">Marked shared</SelectItem>
                      <SelectItem value="unshared">Not shared</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 lg:w-44">
                  <Label htmlFor="guest-rsvp-filter">RSVP status</Label>
                  <Select
                    value={rsvpFilter || 'all'}
                    onValueChange={(value) =>
                      setRsvpFilter(value === 'all' ? '' : value)
                    }
                  >
                    <SelectTrigger id="guest-rsvp-filter" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All RSVPs</SelectItem>
                      <SelectItem value="attending">Attending</SelectItem>
                      <SelectItem value="declined">Declined</SelectItem>
                      <SelectItem value="none">Not responded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {visibleGuests.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {guests.length === 0
                    ? 'No guests yet.'
                    : 'No guests match your search.'}
                </p>
              ) : (
                <ul className="space-y-3">
                  {visibleGuests.map((guest) => (
                    <li
                      key={guest.id}
                      className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 space-y-1.5">
                        <p className="font-semibold break-words">{guest.name}</p>
                        <p className="text-sm break-words text-muted-foreground">
                          {categoryName(guest.category_id)} ·{' '}
                          {guest.max_attendees}{' '}
                          {guest.max_attendees === 1 ? 'attendee' : 'attendees'}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant={guest.shared_at ? 'secondary' : 'outline'}
                          >
                            {guest.shared_at ? 'Marked shared' : 'Not shared'}
                          </Badge>
                          <Badge
                            variant={
                              guest.rsvp?.status === 'attending'
                                ? 'default'
                                : 'outline'
                            }
                          >
                            {guest.rsvp === null
                              ? 'Not responded'
                              : guest.rsvp.status === 'attending'
                                ? `Attending (${guest.rsvp.attendee_count})`
                                : 'Declined'}
                          </Badge>
                          <Badge
                            variant={guest.checked_in_at ? 'default' : 'outline'}
                          >
                            {guest.checked_in_at ? 'Checked in' : 'Not checked in'}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() => void handleCopyLink(guest)}
                        >
                          Copy link
                        </Button>
                        <Button size="sm" asChild>
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(shareMessage(guest))}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => void handleShareGuest(guest)}
                          >
                            WhatsApp
                          </a>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`More actions for ${guest.name}`}
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onSelect={() => startEditGuest(guest)}
                            >
                              Edit
                            </DropdownMenuItem>
                            {guest.shared_at !== null && (
                              <DropdownMenuItem
                                onSelect={() => void handleUnshareGuest(guest)}
                              >
                                Undo share
                              </DropdownMenuItem>
                            )}
                            {guest.rsvp !== null && (
                              <DropdownMenuItem
                                onSelect={() => void handleClearRsvp(guest)}
                              >
                                Clear RSVP
                              </DropdownMenuItem>
                            )}
                            {guest.checked_in_at !== null && (
                              <DropdownMenuItem
                                onSelect={() => void handleUndoCheckIn(guest)}
                              >
                                Undo check-in
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() => void handleDeleteGuest(guest)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={guestFormOpen} onOpenChange={setGuestFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingGuestId === null ? 'Add a guest' : 'Edit guest'}
            </DialogTitle>
            <DialogDescription>
              Set the invitation identity and the number of guests this invitation covers.
            </DialogDescription>
          </DialogHeader>

          <form className="flex flex-col gap-4" onSubmit={handleGuestSubmit}>
            <div className="space-y-2">
              <Label htmlFor="guest-name">Guest name</Label>
              <Input
                id="guest-name"
                required
                maxLength={120}
                placeholder="Ayu Lestari"
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="guest-category">Category</Label>
                <Select
                  value={guestCategoryId || 'none'}
                  onValueChange={(value) =>
                    setGuestCategoryId(value === 'none' ? '' : value)
                  }
                >
                  <SelectTrigger id="guest-category" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Uncategorized</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="guest-max">Max attendees</Label>
                <Input
                  id="guest-max"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={guestMaxAttendees}
                  onChange={(event) => setGuestMaxAttendees(event.target.value)}
                />
              </div>
            </div>

            {error !== '' && (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button variant="ghost" type="button" onClick={() => setGuestFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : editingGuestId === null ? 'Add guest' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {!loading && !needsWedding && (
        <>
          <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Settings2 className="size-4 text-muted-foreground" />
                  Manage categories
                </DialogTitle>
                <DialogDescription>
                  Organize guests into groups for easier filtering.
                </DialogDescription>
              </DialogHeader>
            <CardContent className="space-y-4">
              <form className="flex flex-wrap items-end gap-3" onSubmit={handleAddCategory}>
                <div className="min-w-0 flex-1 space-y-2">
                  <Label htmlFor="new-category">New category</Label>
                  <Input
                    id="new-category"
                    maxLength={80}
                    placeholder="Family"
                    value={newCategoryName}
                    onChange={(event) => setNewCategoryName(event.target.value)}
                  />
                </div>
                <Button type="submit" disabled={saving}>
                  Add category
                </Button>
              </form>

              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No categories yet.
                </p>
              ) : (
                <ul className="space-y-1">
                  {categories.map((category) => (
                    <li
                      key={category.id}
                      className="flex flex-col gap-2 rounded-lg px-2 py-2 hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                    >
                      {editingCategoryId === category.id ? (
                        <form
                          className="flex flex-1 flex-wrap items-center gap-2"
                          onSubmit={handleRenameCategory}
                        >
                          <Input
                            aria-label="Category name"
                            maxLength={80}
                            value={editCategoryName}
                            onChange={(event) =>
                              setEditCategoryName(event.target.value)
                            }
                          />
                          <Button type="submit" size="sm" disabled={saving}>
                            Save
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={resetCategoryForm}
                          >
                            Cancel
                          </Button>
                        </form>
                      ) : (
                        <>
                          <span className="text-sm">{category.name}</span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              type="button"
                              onClick={() => startEditCategory(category)}
                            >
                              Rename
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              type="button"
                              onClick={() => void handleDeleteCategory(category)}
                            >
                              Delete
                            </Button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              </CardContent>
            </DialogContent>
          </Dialog>

          <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Import guests</DialogTitle>
                <DialogDescription>
                  Upload a CSV or XLSX file with columns: name, category,
                  max_attendees. Preview first; only valid rows are imported.
                </DialogDescription>
              </DialogHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="guest-import-file">Guest list file</Label>
                <Input
                  id="guest-import-file"
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleImportFileChange}
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  className="gap-2"
                  disabled={importFile === null || saving || importCommitted}
                  onClick={() => void handlePreviewImport()}
                >
                  <Upload data-icon="inline-start" />
                  Preview import
                </Button>
                {importPreview !== null && !importCommitted && (
                  <Button
                    variant="secondary"
                    type="button"
                    disabled={saving || importPreview.valid_count === 0}
                    onClick={() => void handleConfirmImport()}
                  >
                    Import {importPreview.valid_count} guests
                  </Button>
                )}
              </div>

              {importPreview !== null && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {importPreview.valid_count} valid ·{' '}
                    {importPreview.invalid_count} invalid
                    {importPreview.imported > 0
                      ? ` · ${importPreview.imported} imported`
                      : ''}
                  </p>

                  {importPreview.rows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      The file has no guest rows.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Row</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Max</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importPreview.rows.map((row) => (
                            <TableRow
                              key={row.row}
                              className={
                                row.valid ? undefined : 'bg-destructive/10'
                              }
                            >
                              <TableCell>{row.row}</TableCell>
                              <TableCell>{row.name || '—'}</TableCell>
                              <TableCell>{row.category || '—'}</TableCell>
                              <TableCell>{row.max_attendees ?? '—'}</TableCell>
                              <TableCell>
                                {row.valid ? 'Ready' : row.errors.join('; ')}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
              </CardContent>
            </DialogContent>
          </Dialog>

        </>
      )}
    </Page>
  )
}
