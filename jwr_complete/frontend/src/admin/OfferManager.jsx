import React, { useState, useEffect, useCallback, useRef } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function authHeader(json = true) {
  const token = localStorage.getItem('token')
  const base  = token ? { Authorization: `Bearer ${token}` } : {}
  return json ? { ...base, 'Content-Type': 'application/json' } : base
}

const DURATION_OPTIONS = [
  { label: '6 hours',  value: 6  },
  { label: '12 hours', value: 12 },
  { label: '1 day',    value: 24 },
  { label: '2 days',   value: 48 },
  { label: '3 days',   value: 72 },
  { label: '7 days',   value: 168 },
  { label: '14 days',  value: 336 },
  { label: '30 days',  value: 720 },
]

function formatExpiry(expiresAt) {
  if (!expiresAt) return '—'
  const d = new Date(expiresAt)
  const now = new Date()
  if (d < now) return 'Expired'
  const diffMs = d - now
  const diffH  = Math.floor(diffMs / 3600000)
  const diffM  = Math.floor((diffMs % 3600000) / 60000)
  if (diffH >= 24) {
    const days = Math.floor(diffH / 24)
    return `${days} day${days !== 1 ? 's' : ''} remaining`
  }
  return `${diffH}h ${diffM}m remaining`
}

function isExpired(expiresAt) {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

export default function OfferManager() {
  const [offer,     setOffer]     = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [message,   setMessage]   = useState('')

  // Upload form
  const [title,     setTitle]     = useState('')
  const [duration,  setDuration]  = useState(24)
  const [preview,   setPreview]   = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')
  const [deleting,  setDeleting]  = useState(false)
  const fileRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res  = await fetch(`${API}/api/admin/offer`, { headers: authHeader() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load offer')
      setOffer(data.offer || null)
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
      form.append('title',    title)
      form.append('duration', duration)

      const res  = await fetch(`${API}/api/admin/offer/upload`, {
        method:  'POST',
        headers: authHeader(false),
        body:    form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')

      setOffer(data.offer)
      setPreview(null)
      setTitle('')
      setDuration(24)
      if (fileRef.current) fileRef.current.value = ''
      setMessage('Offer banner uploaded! It will now show to visitors when they open the site.')
    } catch (err) { setUploadErr(err.message) }
    finally { setUploading(false) }
  }

  async function handleDelete() {
    if (!window.confirm('Remove the current offer banner? Visitors will no longer see it.')) return
    setDeleting(true); setMessage(''); setError('')
    try {
      const res  = await fetch(`${API}/api/admin/offer`, {
        method:  'DELETE',
        headers: authHeader(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      setOffer(null)
      setMessage('Offer banner removed.')
    } catch (err) { setError(err.message) }
    finally { setDeleting(false) }
  }

  const expired = offer ? isExpired(offer.expiresAt) : false

  return (
    <section className="admin-gallery-manager">
      <div className="admin-table-header">
        <h3>Offer Banner</h3>
        <span className="admin-table-count">
          Upload a discount / promotion image — it pops up automatically for site visitors
        </span>
      </div>

      {message && <p className="admin-msg admin-msg--ok"  style={{ marginBottom: 16 }}>{message}</p>}
      {error   && <p className="admin-msg admin-msg--err" style={{ marginBottom: 16 }}>{error}</p>}

      {/* ── Current Offer ── */}
      {loading ? (
        <div className="admin-loading"><div className="admin-spinner" /><p>Loading…</p></div>
      ) : offer ? (
        <div className="admin-gallery-upload-card" style={{ marginBottom: 32 }}>
          <h4 style={{ marginBottom: 4 }}>Current Offer Banner</h4>

          <div style={{
            display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start',
            marginTop: 14,
          }}>
            {/* Preview */}
            <div style={{
              flex: '0 0 220px', maxWidth: 220, borderRadius: 4, overflow: 'hidden',
              border: '1px solid var(--a-border)', background: '#000',
              position: 'relative',
            }}>
              <img
                src={offer.url}
                alt={offer.title || 'Offer banner'}
                style={{ width: '100%', display: 'block', opacity: expired ? 0.45 : 1 }}
              />
              {expired && (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <span style={{
                    background: 'rgba(0,0,0,0.78)', color: '#e74c3c',
                    padding: '5px 14px', fontSize: 11, fontWeight: 700,
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                  }}>Expired</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 180 }}>
              {offer.title && (
                <p style={{ color: 'var(--a-text)', fontWeight: 600, marginBottom: 6, fontSize: 14 }}>
                  {offer.title}
                </p>
              )}
              <p style={{ color: 'var(--a-text-3)', fontSize: 12, marginBottom: 4 }}>
                Uploaded: {offer.uploadedAt ? new Date(offer.uploadedAt).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                }) : '—'}
              </p>
              <p style={{
                color: expired ? '#e74c3c' : '#16a34a',
                fontSize: 12, fontWeight: 600, marginBottom: 16,
              }}>
                {expired ? '⚠ Expired — upload a new banner' : `✓ Active — ${formatExpiry(offer.expiresAt)}`}
              </p>

              <button
                type="button"
                className="admin-logout-btn"
                onClick={handleDelete}
                disabled={deleting}
                style={{ fontSize: 12 }}
              >
                {deleting ? 'Removing…' : '✕ Remove banner'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="admin-empty" style={{ marginBottom: 28 }}>
          <div className="admin-empty__title">No offer banner set</div>
          <div className="admin-empty__sub">Upload one below and it will pop up for visitors.</div>
        </div>
      )}

      {/* ── Upload New Offer ── */}
      <div className="admin-gallery-upload-card">
        <h4>{offer ? 'Replace Offer Banner' : 'Upload Offer Banner'}</h4>
        <p className="admin-promo-hint" style={{ marginBottom: 18 }}>
          Upload a promotion or discount image (JPG/PNG, max 10 MB). Choose how long it stays active — it auto-expires after that.
        </p>

        <div className="admin-gallery-upload-form">
          <div className="admin-gallery-upload-meta">
            <label className="admin-pkg-field">
              <span>Offer Title <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional label on image)</span></span>
              <input
                type="text"
                placeholder="e.g. Summer Discount — 20% Off"
                value={title}
                onChange={e => setTitle(e.target.value)}
                disabled={uploading}
              />
            </label>

            <label className="admin-pkg-field">
              <span>Active duration</span>
              <select value={duration} onChange={e => setDuration(Number(e.target.value))} disabled={uploading}>
                {DURATION_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
          </div>

          {/* File row */}
          <div className="admin-pkg-image-upload-row">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              id="offer-file-input"
              className="admin-pkg-image-file-input"
              onChange={handleFileChange}
              disabled={uploading}
            />
            <label htmlFor="offer-file-input" className="admin-pkg-image-file-label">
              📁 {uploading ? 'Uploading…' : 'Choose offer image (max 10 MB)'}
            </label>

            <button
              type="button"
              className="admin-filter-btn"
              onClick={handleUpload}
              disabled={uploading}
              style={{ whiteSpace: 'nowrap' }}
            >
              {uploading ? 'Uploading…' : '⬆ Set as active offer'}
            </button>
          </div>

          {/* Preview */}
          {preview && (
            <div className="admin-gallery-upload-preview">
              <img src={preview} alt="Offer preview" style={{ maxHeight: 280, borderRadius: 4 }} />
              <span className="admin-pkg-image-preview__label">Preview — not uploaded yet</span>
            </div>
          )}

          {uploadErr && <p className="admin-msg admin-msg--err admin-msg--sm">{uploadErr}</p>}
        </div>

        <p style={{
          marginTop: 18, fontSize: 11.5,
          color: 'var(--a-text-4)',
          borderTop: '1px solid var(--a-border)',
          paddingTop: 14,
          lineHeight: 1.6,
        }}>
          <strong>How it works:</strong> When a visitor opens the website for the first time in their browser session, the offer image appears as a centered popup. It auto-closes after 20 seconds or when the visitor dismisses it. It won't show again in the same session.
        </p>
      </div>
    </section>
  )
}
