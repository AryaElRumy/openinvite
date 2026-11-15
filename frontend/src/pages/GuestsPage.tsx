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
          setError(err instanceof ApiError ? err.message : 'Gagal memuat daftar tamu. Coba lagi.')
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
      setError('Jumlah tamu minimal 1.')
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
        setNotice('Tamu ditambahkan.')
      } else {
        await api.put<Guest>(`/guests/${editingGuestId}`, payload)
        setNotice('Data tamu diperbarui.')
      }
      resetGuestForm()
      setGuestFormOpen(false)
      reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menyimpan data tamu. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteGuest(guest: Guest) {
    if (!window.confirm(`Hapus ${guest.name}?`)) return

    setError('')
    setNotice('')
    try {
      await api.delete(`/guests/${guest.id}`)
      if (editingGuestId === guest.id) resetGuestForm()
      setNotice('Tamu dihapus.')
      reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menghapus tamu. Coba lagi.')
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
      setNotice('Kategori ditambahkan.')
      reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menambah kategori. Coba lagi.')
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
      setNotice('Nama kategori diperbarui.')
      reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal mengubah nama kategori. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteCategory(category: GuestCategory) {
    if (
      !window.confirm(
        `Hapus ${category.name}? Tamu di kategori ini akan menjadi tanpa kategori.`,
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
      setNotice('Kategori dihapus.')
      reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menghapus kategori. Coba lagi.')
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
      setError(err instanceof ApiError ? err.message : 'Gagal memuat pratinjau impor. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirmImport() {
    if (importFile === null || importPreview === null) return
    if (!window.confirm(`Impor ${importPreview.valid_count} tamu?`)) return

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
        `Berhasil mengimpor ${result.imported} tamu. ${result.invalid_count} baris dilewati.`,
      )
      reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal mengimpor tamu. Coba lagi.')
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
      `Halo ${guest.name}, kamu diundang ke pernikahan ` +
      `${wedding.partner_one_name} & ${wedding.partner_two_name} ` +
      `pada ${formatWeddingDate(wedding.wedding_date)} di ` +
      `${wedding.venue_name}.\nBuka undanganmu: ${guestUrl(guest)}`
    )
  }

  async function handleCopyLink(guest: Guest) {
    setError('')
    setNotice('')
    try {
      await navigator.clipboard.writeText(guestUrl(guest))
      setNotice('Tautan tamu disalin.')
    } catch {
      setError('Gagal menyalin tautan tamu. Coba lagi.')
    }
  }

  async function handleShareGuest(guest: Guest) {
    setError('')
    setNotice('')
    try {
      await api.put<Guest>(`/guests/${guest.id}/share`, { shared: true })
      setNotice(
        `${guest.name} ditandai sudah dibagikan. Ini tidak memastikan pesan terkirim atau dibaca.`,
      )
      reload()
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Gagal menandai tamu sudah dibagikan. Coba lagi.',
      )
    }
  }

  async function handleUnshareGuest(guest: Guest) {
    setError('')
    setNotice('')
    try {
      await api.put<Guest>(`/guests/${guest.id}/share`, { shared: false })
      setNotice('Tanda berbagi dihapus.')
      reload()
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Gagal menghapus tanda berbagi. Coba lagi.',
      )
    }
  }

  async function handleClearRsvp(guest: Guest) {
    if (!window.confirm(`Clear the RSVP for ${guest.name}?`)) return

    setError('')
    setNotice('')
    try {
      await api.delete(`/guests/${guest.id}/rsvp`)
      setNotice('Jawaban RSVP dihapus.')
      reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menghapus jawaban RSVP. Coba lagi.')
    }
  }

  async function handleUndoCheckIn(guest: Guest) {
    if (!window.confirm(`Undo the check-in for ${guest.name}?`)) return

    setError('')
    setNotice('')
    try {
      await api.delete(`/guests/${guest.id}/check-in`)
      setNotice('Kehadiran dibatalkan.')
      reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal membatalkan kehadiran. Coba lagi.')
    }
  }

  function categoryName(categoryId: string | null): string {
    if (categoryId === null) return 'Tanpa kategori'
    return (
      categories.find((category) => category.id === categoryId)?.name ??
      'Tanpa kategori'
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
              <CardTitle className="font-serif text-3xl">Daftar tamu</CardTitle>
              <CardDescription className="mt-2">
                Cari, saring, dan pantau semua tamu yang diundang.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setCategoryModalOpen(true)}>
                <Settings2 data-icon="inline-start" />
                Kategori
              </Button>
              <Button variant="outline" size="sm" onClick={() => setImportModalOpen(true)}>
                <Upload data-icon="inline-start" />
                Impor
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  resetGuestForm()
                  setGuestFormOpen(true)
                }}
              >
                <Plus data-icon="inline-start" />
                Tambah tamu
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>{guests.length} diundang</span>
            <span>kapasitas {totalCapacity} orang</span>
            <span>{attendingCount} akan hadir</span>
            <span>{checkedInCount} sudah hadir</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {loading ? (
            <p className="text-muted-foreground">Memuat…</p>
          ) : needsWedding ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm">Atur data pernikahanmu dulu.</p>
              <Button asChild size="sm">
                <Link to="/">Ke ringkasan</Link>
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
                  “Ditandai dibagikan” hanya catatan manual. Ini tidak memastikan
                  pesan terkirim atau dibaca.
                </p>
              )}

              <div className="flex flex-col gap-3 rounded-xl bg-muted/45 p-3 lg:flex-row lg:items-end">
                <div className="min-w-0 flex-1 space-y-2">
                  <Label htmlFor="guest-search">Cari tamu</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="guest-search"
                      type="search"
                      className="pl-9"
                      placeholder="Cari berdasarkan nama"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2 lg:w-48">
                  <Label htmlFor="guest-category-filter">Kategori</Label>
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
                      <SelectItem value="all">Semua kategori</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 lg:w-44">
                  <Label htmlFor="guest-share-filter">Status berbagi</Label>
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
                      <SelectItem value="all">Semua tamu</SelectItem>
                      <SelectItem value="shared">Ditandai dibagikan</SelectItem>
                      <SelectItem value="unshared">Belum dibagikan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 lg:w-44">
                  <Label htmlFor="guest-rsvp-filter">Status RSVP</Label>
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
                      <SelectItem value="all">Semua RSVP</SelectItem>
                      <SelectItem value="attending">Hadir</SelectItem>
                      <SelectItem value="declined">Tidak hadir</SelectItem>
                      <SelectItem value="none">Belum menjawab</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {visibleGuests.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {guests.length === 0
                    ? 'Belum ada tamu.'
                    : 'Tidak ada tamu yang cocok dengan pencarian.'}
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
                          {guest.max_attendees} orang
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant={guest.shared_at ? 'secondary' : 'outline'}
                          >
                            {guest.shared_at ? 'Ditandai dibagikan' : 'Belum dibagikan'}
                          </Badge>
                          <Badge
                            variant={
                              guest.rsvp?.status === 'attending'
                                ? 'default'
                                : 'outline'
                            }
                          >
                            {guest.rsvp === null
                              ? 'Belum menjawab'
                              : guest.rsvp.status === 'attending'
                                ? `Hadir (${guest.rsvp.attendee_count})`
                                : 'Tidak hadir'}
                          </Badge>
                          <Badge
                            variant={guest.checked_in_at ? 'default' : 'outline'}
                          >
                            {guest.checked_in_at ? 'Sudah hadir' : 'Belum hadir'}
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
                          Salin tautan
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
                              aria-label={`Tindakan lain untuk ${guest.name}`}
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onSelect={() => startEditGuest(guest)}
                            >
                              Ubah
                            </DropdownMenuItem>
                            {guest.shared_at !== null && (
                              <DropdownMenuItem
                                onSelect={() => void handleUnshareGuest(guest)}
                              >
                                Batalkan tanda berbagi
                              </DropdownMenuItem>
                            )}
                            {guest.rsvp !== null && (
                              <DropdownMenuItem
                                onSelect={() => void handleClearRsvp(guest)}
                              >
                                Hapus RSVP
                              </DropdownMenuItem>
                            )}
                            {guest.checked_in_at !== null && (
                              <DropdownMenuItem
                                onSelect={() => void handleUndoCheckIn(guest)}
                              >
                                Batalkan kehadiran
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() => void handleDeleteGuest(guest)}
                            >
                              Hapus
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
              {editingGuestId === null ? 'Tambah tamu' : 'Ubah data tamu'}
            </DialogTitle>
            <DialogDescription>
              Atur nama pada undangan dan jumlah orang yang ditanggung undangan ini.
            </DialogDescription>
          </DialogHeader>

          <form className="flex flex-col gap-4" onSubmit={handleGuestSubmit}>
            <div className="space-y-2">
              <Label htmlFor="guest-name">Nama tamu</Label>
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
                <Label htmlFor="guest-category">Kategori</Label>
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
                    <SelectItem value="none">Tanpa kategori</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="guest-max">Maksimal tamu</Label>
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
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Menyimpan…' : editingGuestId === null ? 'Tambah tamu' : 'Simpan perubahan'}
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
                  Kelola kategori
                </DialogTitle>
                <DialogDescription>
                  Kelompokkan tamu supaya lebih mudah disaring.
                </DialogDescription>
              </DialogHeader>
            <CardContent className="space-y-4">
              <form className="flex flex-wrap items-end gap-3" onSubmit={handleAddCategory}>
                <div className="min-w-0 flex-1 space-y-2">
                  <Label htmlFor="new-category">Kategori baru</Label>
                  <Input
                    id="new-category"
                    maxLength={80}
                    placeholder="Keluarga"
                    value={newCategoryName}
                    onChange={(event) => setNewCategoryName(event.target.value)}
                  />
                </div>
                <Button type="submit" disabled={saving}>
                  Tambah kategori
                </Button>
              </form>

              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Belum ada kategori.
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
                            aria-label="Nama kategori"
                            maxLength={80}
                            value={editCategoryName}
                            onChange={(event) =>
                              setEditCategoryName(event.target.value)
                            }
                          />
                          <Button type="submit" size="sm" disabled={saving}>
                            Simpan
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={resetCategoryForm}
                          >
                            Batal
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
                              Ubah nama
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              type="button"
                              onClick={() => void handleDeleteCategory(category)}
                            >
                              Hapus
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
                <DialogTitle>Impor tamu</DialogTitle>
                <DialogDescription>
                  Unggah file CSV atau XLSX dengan kolom: name, category,
                  max_attendees. Lihat pratinjau dulu; hanya baris valid yang diimpor.
                </DialogDescription>
              </DialogHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="guest-import-file">File daftar tamu</Label>
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
                  Pratinjau impor
                </Button>
                {importPreview !== null && !importCommitted && (
                  <Button
                    variant="secondary"
                    type="button"
                    disabled={saving || importPreview.valid_count === 0}
                    onClick={() => void handleConfirmImport()}
                  >
                    Impor {importPreview.valid_count} tamu
                  </Button>
                )}
              </div>

              {importPreview !== null && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {importPreview.valid_count} valid ·{' '}
                    {importPreview.invalid_count} tidak valid
                    {importPreview.imported > 0
                      ? ` · ${importPreview.imported} diimpor`
                      : ''}
                  </p>

                  {importPreview.rows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      File ini tidak berisi baris tamu.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Baris</TableHead>
                            <TableHead>Nama</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Maks</TableHead>
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
                                {row.valid ? 'Siap' : row.errors.join('; ')}
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
