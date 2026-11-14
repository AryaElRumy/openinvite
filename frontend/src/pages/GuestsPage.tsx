import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, api } from '../api'
import { useAuth } from '../auth'
import type {
  Guest,
  GuestCategory,
  GuestImportResult,
  GuestPayload,
} from '../types'

export default function GuestsPage() {
  const { logout } = useAuth()
  const [guests, setGuests] = useState<Guest[]>([])
  const [categories, setCategories] = useState<GuestCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [needsWedding, setNeedsWedding] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const [guestName, setGuestName] = useState('')
  const [guestCategoryId, setGuestCategoryId] = useState('')
  const [guestMaxAttendees, setGuestMaxAttendees] = useState('1')
  const [editingGuestId, setEditingGuestId] = useState<string | null>(null)

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
    ])
      .then(([guestData, categoryData]) => {
        if (cancelled) return
        setGuests(guestData)
        setCategories(categoryData)
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
      setError(
        err instanceof ApiError ? err.message : 'Unable to add category',
      )
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
      await api.put<GuestCategory>(
        `/guest-categories/${editingCategoryId}`,
        { name },
      )
      resetCategoryForm()
      setNotice('Category renamed.')
      reload()
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Unable to rename category',
      )
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
      setError(
        err instanceof ApiError ? err.message : 'Unable to delete category',
      )
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
      setError(
        err instanceof ApiError ? err.message : 'Unable to preview import',
      )
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
  const query = search.trim().toLowerCase()
  const visibleGuests = guests.filter(
    (guest) =>
      (query === '' || guest.name.toLowerCase().includes(query)) &&
      (categoryFilter === '' || guest.category_id === categoryFilter),
  )

  return (
    <main className="page">
      <header className="topbar">
        <strong>OpenInvite</strong>
        <nav className="topbar-actions">
          <Link className="link" to="/">
            Dashboard
          </Link>
          <Link className="link" to="/editor">
            Edit invitation
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
        <h1>Guests</h1>

        {loading ? (
          <p>Loading…</p>
        ) : needsWedding ? (
          <p>
            Set up your wedding first. <Link to="/">Go to dashboard</Link>
          </p>
        ) : (
          <>
            <p className="muted">
              {guests.length} invitation{guests.length === 1 ? '' : 's'} ·{' '}
              {totalCapacity} attendee capacity
            </p>

            {error !== '' && <p className="error">{error}</p>}
            {notice !== '' && <p className="success">{notice}</p>}

            <div className="guest-toolbar">
              <label className="field">
                <span>Search guests</span>
                <input
                  type="search"
                  placeholder="Name"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>

              <label className="field">
                <span>Filter by category</span>
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                >
                  <option value="">All categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <form className="form" onSubmit={handleGuestSubmit}>
              <div className="grid">
                <label className="field">
                  <span>Guest name</span>
                  <input
                    required
                    maxLength={120}
                    placeholder="Ayu Lestari"
                    value={guestName}
                    onChange={(event) => setGuestName(event.target.value)}
                  />
                </label>

                <label className="field">
                  <span>Category</span>
                  <select
                    value={guestCategoryId}
                    onChange={(event) =>
                      setGuestCategoryId(event.target.value)
                    }
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Max attendees</span>
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={guestMaxAttendees}
                    onChange={(event) =>
                      setGuestMaxAttendees(event.target.value)
                    }
                  />
                </label>
              </div>

              <div className="actions">
                <button className="button" type="submit" disabled={saving}>
                  {editingGuestId === null ? 'Add guest' : 'Update guest'}
                </button>
                {editingGuestId !== null && (
                  <button
                    className="button secondary"
                    type="button"
                    onClick={resetGuestForm}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            {visibleGuests.length === 0 ? (
              <p className="muted">
                {guests.length === 0
                  ? 'No guests yet.'
                  : 'No guests match your search.'}
              </p>
            ) : (
              <ul className="guest-list">
                {visibleGuests.map((guest) => (
                  <li className="guest-row" key={guest.id}>
                    <div className="guest-row-info">
                      <strong>{guest.name}</strong>
                      <span className="muted">
                        {categoryName(guest.category_id)} ·{' '}
                        {guest.max_attendees}{' '}
                        {guest.max_attendees === 1 ? 'attendee' : 'attendees'}
                      </span>
                    </div>
                    <div className="guest-row-actions">
                      <button
                        className="link"
                        type="button"
                        onClick={() => startEditGuest(guest)}
                      >
                        Edit
                      </button>
                      <button
                        className="link"
                        type="button"
                        onClick={() => void handleDeleteGuest(guest)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      {!loading && !needsWedding && (
        <section className="card">
          <h2>Categories</h2>

          <form className="guest-toolbar" onSubmit={handleAddCategory}>
            <label className="field">
              <span>New category</span>
              <input
                maxLength={80}
                placeholder="Family"
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
              />
            </label>
            <button className="button" type="submit" disabled={saving}>
              Add category
            </button>
          </form>

          {categories.length === 0 ? (
            <p className="muted">No categories yet.</p>
          ) : (
            <ul className="category-list">
              {categories.map((category) => (
                <li className="category-row" key={category.id}>
                  {editingCategoryId === category.id ? (
                    <form
                      className="category-inline-form"
                      onSubmit={handleRenameCategory}
                    >
                      <input
                        aria-label="Category name"
                        maxLength={80}
                        value={editCategoryName}
                        onChange={(event) =>
                          setEditCategoryName(event.target.value)
                        }
                      />
                      <button className="button" type="submit" disabled={saving}>
                        Save
                      </button>
                      <button
                        className="button secondary"
                        type="button"
                        onClick={resetCategoryForm}
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <>
                      <span>{category.name}</span>
                      <div className="guest-row-actions">
                        <button
                          className="link"
                          type="button"
                          onClick={() => startEditCategory(category)}
                        >
                          Rename
                        </button>
                        <button
                          className="link"
                          type="button"
                          onClick={() => void handleDeleteCategory(category)}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {!loading && !needsWedding && (
        <section className="card">
          <h2>Import guests</h2>
          <p className="muted">
            Upload a CSV or XLSX file with columns: name, category,
            max_attendees. Preview first; only valid rows are imported.
          </p>

          <label className="field">
            <span>Guest list file</span>
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={handleImportFileChange}
            />
          </label>

          <div className="actions">
            <button
              className="button"
              type="button"
              disabled={importFile === null || saving || importCommitted}
              onClick={() => void handlePreviewImport()}
            >
              Preview import
            </button>
            {importPreview !== null && !importCommitted && (
              <button
                className="button secondary"
                type="button"
                disabled={saving || importPreview.valid_count === 0}
                onClick={() => void handleConfirmImport()}
              >
                Import {importPreview.valid_count} guests
              </button>
            )}
          </div>

          {importPreview !== null && (
            <div className="import-preview">
              <p className="muted">
                {importPreview.valid_count} valid ·{' '}
                {importPreview.invalid_count} invalid
                {importPreview.imported > 0
                  ? ` · ${importPreview.imported} imported`
                  : ''}
              </p>

              {importPreview.rows.length === 0 ? (
                <p className="muted">The file has no guest rows.</p>
              ) : (
                <div className="import-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Row</th>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Max</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.rows.map((row) => (
                        <tr
                          key={row.row}
                          className={
                            row.valid ? undefined : 'import-row-invalid'
                          }
                        >
                          <td>{row.row}</td>
                          <td>{row.name === '' ? '—' : row.name}</td>
                          <td>{row.category === '' ? '—' : row.category}</td>
                          <td>{row.max_attendees ?? '—'}</td>
                          <td>
                            {row.valid ? 'Ready' : row.errors.join('; ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </main>
  )
}
