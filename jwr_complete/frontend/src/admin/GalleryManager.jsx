import React, { useState, useEffect, useCallback, useRef } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const CATEGORIES = ['Resort', 'Wildlife', 'Activities', 'Landscape']

function authHeader(json = true) {
  const token = localStorage.getItem('token')
  const base  = token ? { Authorization: `Bearer ${token}` } : {}
  return json ? { ...base, 'Content-Type': 'application/json' } : base
}

// ── Card with skeleton loader ─────────────────────────────────────────────
function GalleryImageCard({ image, onDelete, onUpdate }) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [editing,  setEditing]   = useState(false)
  const [caption,  setCaption]   = useState(image.caption  || '')
  const [category, setCategory]  = useState(image.category || 'Resort')
  const [size,     setSize]      = useState(image.size     || '')
  const [saving,   setSaving]    = useState(false)
  const [deleting, setDeleting]  = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const res  = await fetch(`${API}/api/admin/gallery/${image.id}`, {
        method:  'PATCH',
        headers: authHeader(),
        body:    JSON.stringify({ caption, category, size }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      onUpdate(data.image)
      setEditing(false)
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete this image?\n"${image.caption || 'Untitled'}"`)) return
    setDeleting(true)
    try {
      const res  = await fetch(`${API}/api/admin/gallery/${image.id}`, {
        method:  'DELETE',
        headers: authHeader(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      onDelete(image.id)
    } catch (err) { alert(err.message); setDeleting(false) }
  }

  return (
    <div className="admin-gallery-card">
      {/* Image with skeleton */}
      <div className="admin-gallery-card__img-wrap">
        <div className={`admin-gallery-card__skeleton${imgLoaded ? ' hidden' : ''}`} />
        <img
          src={image.url}
          alt={image.caption || 'Gallery image'}
          className={`admin-gallery-card__img${imgLoaded ? ' img-loaded' : ''}`}
          loading="eager"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgLoaded(true)}
        />
        {image.size === 'large' && (
          <span className="admin-gallery-card__size-badge">Wide</span>
        )}
        <span className="admin-gallery-card__cat-badge">{image.category}</span>
      </div>

      {editing ? (
        <div className="admin-gallery-card__edit">
          <label className="admin-pkg-field">
            <span>Caption</span>
            <input type="text" value={caption} onChange={e => setCaption(e.target.value)} placeholder="Image caption" />
          </label>
          <label className="admin-pkg-field">
            <span>Category</span>
            <select value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="admin-pkg-field">
            <span>Display size</span>
            <select value={size} onChange={e => setSize(e.target.value)}>
              <option value="">Normal</option>
              <option value="large">Large / Wide</option>
            </select>
          </label>
          <div className="admin-gallery-card__actions">
            <button type="button" className="admin-filter-btn admin-filter-btn--sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="admin-clear-btn admin-filter-btn--sm"
              onClick={() => { setEditing(false); setCaption(image.caption||''); setCategory(image.category||'Resort'); setSize(image.size||'') }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="admin-gallery-card__meta">
          <p className="admin-gallery-card__caption">{image.caption || <em>No caption</em>}</p>
          <p className="admin-gallery-card__date">
            {image.uploadedAt ? new Date(image.uploadedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
          </p>
          <div className="admin-gallery-card__actions">
            <button type="button" className="admin-filter-btn admin-filter-btn--sm" onClick={() => setEditing(true)}>Edit</button>
            <button type="button" className="admin-logout-btn" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main GalleryManager ───────────────────────────────────────────────────
export default function GalleryManager() {
  const [images,    setImages]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [message,   setMessage]   = useState('')

  // Upload form
  const [caption,   setCaption]   = useState('')
  const [category,  setCategory]  = useState('Resort')
  const [size,      setSize]      = useState('')
  const [preview,   setPreview]   = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')
  const fileRef                   = useRef(null)

  const [filterCat, setFilterCat] = useState('All')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res  = await fetch(`${API}/api/admin/gallery`, { headers: authHeader() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load gallery')
      setImages(data.images || [])
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadErr('')
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) { setUploadErr('Please choose an image file first.'); return }

    setUploading(true); setUploadErr(''); setMessage('')
    try {
      const form = new FormData()
      form.append('image',    file)
      form.append('caption',  caption)
      form.append('category', category)
      form.append('size',     size)

      const res  = await fetch(`${API}/api/admin/gallery/upload`, {
        method:  'POST',
        headers: authHeader(false),
        body:    form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')

      setImages(data.images || [])
      setPreview(null)
      setCaption('')
      setCategory('Resort')
      setSize('')
      if (fileRef.current) fileRef.current.value = ''
      setMessage(`"${data.image.caption || 'Image'}" uploaded successfully to gallery!`)
    } catch (err) { setUploadErr(err.message) }
    finally { setUploading(false) }
  }

  function handleDelete(id) {
    setImages(prev => prev.filter(img => img.id !== id))
    setMessage('Image deleted from gallery.')
  }

  function handleUpdate(updated) {
    setImages(prev => prev.map(img => img.id === updated.id ? updated : img))
  }

  const filtered = filterCat === 'All' ? images : images.filter(img => img.category === filterCat)

  return (
    <section className="admin-gallery-manager">
      <div className="admin-table-header">
        <h3>Gallery Management</h3>
        <span className="admin-table-count">{images.length} image{images.length !== 1 ? 's' : ''} · shown on public Gallery page</span>
      </div>

      {message && <p className="admin-msg admin-msg--ok">{message}</p>}
      {error   && <p className="admin-msg admin-msg--err">{error}</p>}

      {/* ── Upload Form ── */}
      <div className="admin-gallery-upload-card">
        <h4>Upload New Image</h4>
        <p className="admin-promo-hint">Images upload to Cloudinary and appear on the public Gallery page immediately.</p>

        <div className="admin-gallery-upload-form">
          {/* Metadata first — easier to fill before choosing file */}
          <div className="admin-gallery-upload-meta">
            <label className="admin-pkg-field">
              <span>Caption</span>
              <input
                type="text"
                placeholder="e.g. Swimming pool at sunset"
                value={caption}
                onChange={e => setCaption(e.target.value)}
                disabled={uploading}
              />
            </label>
            <label className="admin-pkg-field">
              <span>Category</span>
              <select value={category} onChange={e => setCategory(e.target.value)} disabled={uploading}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="admin-pkg-field">
              <span>Display size</span>
              <select value={size} onChange={e => setSize(e.target.value)} disabled={uploading}>
                <option value="">Normal (4:3)</option>
                <option value="large">Large / Wide</option>
              </select>
            </label>
          </div>

          {/* File row */}
          <div className="admin-pkg-image-upload-row">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              id="gallery-file-input"
              className="admin-pkg-image-file-input"
              onChange={handleFileChange}
              disabled={uploading}
            />
            <label htmlFor="gallery-file-input" className="admin-pkg-image-file-label">
              📁 {uploading ? 'Uploading…' : 'Choose image (max 10 MB)'}
            </label>

            <button
              type="button"
              className="admin-filter-btn"
              onClick={handleUpload}
              disabled={uploading}
              style={{ whiteSpace: 'nowrap' }}
            >
              {uploading ? 'Uploading to Cloudinary…' : '⬆ Upload to gallery'}
            </button>
          </div>

          {/* Preview */}
          {preview && (
            <div className="admin-gallery-upload-preview">
              <img src={preview} alt="Upload preview" />
              <span className="admin-pkg-image-preview__label">Preview — not uploaded yet</span>
            </div>
          )}

          {uploadErr && <p className="admin-msg admin-msg--err admin-msg--sm">{uploadErr}</p>}
        </div>
      </div>

      {/* ── Category filters ── */}
      <div className="admin-gallery-filters">
        {['All', ...CATEGORIES].map(cat => (
          <button
            key={cat}
            type="button"
            className={`admin-filter-btn${filterCat === cat ? '' : ' admin-filter-btn--ghost'}`}
            onClick={() => setFilterCat(cat)}
          >
            {cat}&nbsp;
            ({cat === 'All' ? images.length : images.filter(i => i.category === cat).length})
          </button>
        ))}
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div className="admin-loading">
          <div className="admin-spinner" /><p>Loading gallery…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty__title">No images yet</div>
          <div className="admin-empty__sub">Upload your first image using the form above.</div>
        </div>
      ) : (
        <div className="admin-gallery-grid">
          {filtered.map(image => (
            <GalleryImageCard key={image.id} image={image} onDelete={handleDelete} onUpdate={handleUpdate} />
          ))}
        </div>
      )}
    </section>
  )
}
