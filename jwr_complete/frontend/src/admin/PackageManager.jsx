import React, { useState, useEffect, useCallback, useRef } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function authHeader(json = true) {
  const token = localStorage.getItem('token')
  const base  = token ? { Authorization: `Bearer ${token}` } : {}
  return json ? { ...base, 'Content-Type': 'application/json' } : base
}

const PROMO_DEFAULTS = { label: '', endsAt: '', showCountdown: true }
const DEFAULT_RATES  = { usd_to_npr: 133, inr_to_npr: 1.60 }

/* ────────────────────────────────────────────────────────────
   Live Rates Display (read-only, auto-refreshes from backend)
   ──────────────────────────────────────────────────────────── */
function LiveRatesDisplay() {
  const [rates,   setRates]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [fetchedAt, setFetchedAt] = useState(null)

  async function refresh() {
    setLoading(true)
    try {
      const res  = await fetch(`${API}/api/admin/packages/currency-rates`, { headers: authHeader() })
      const data = await res.json()
      if (!res.ok) throw new Error('Failed')
      setRates(data.currencyRates)
      setFetchedAt(new Date())
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  useEffect(() => { refresh() }, [])

  const isLive = rates?.source === 'live'
  const usdNpr = rates?.usd_to_npr ? rates.usd_to_npr.toFixed(2)  : '—'
  const inrNpr = rates?.inr_to_npr ? rates.inr_to_npr.toFixed(4)  : '—'

  return (
    <div className="admin-live-rates">
      <div className="admin-live-rates__head">
        <span className="admin-live-rates__title">
          <span className={`admin-live-rates__dot${isLive ? ' admin-live-rates__dot--live' : ''}`} />
          {isLive ? 'Live Exchange Rates' : 'Exchange Rates (fallback)'}
        </span>
        <button type="button" className="admin-live-rates__refresh" onClick={refresh} disabled={loading}>
          <svg viewBox="0 0 16 16" fill="none" width="13" height="13" className={loading ? 'admin-spin' : ''}>
            <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5M13.5 2.5v4h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {loading ? 'Fetching…' : 'Refresh'}
        </button>
      </div>
      <div className="admin-live-rates__body">
        <span className="admin-live-rates__pair">
          <span className="admin-live-rates__flag">🇺🇸</span>
          <span>1 USD</span>
          <span className="admin-live-rates__eq">=</span>
          <strong>NPR {usdNpr}</strong>
        </span>
        <span className="admin-live-rates__sep">·</span>
        <span className="admin-live-rates__pair">
          <span className="admin-live-rates__flag">🇮🇳</span>
          <span>1 INR</span>
          <span className="admin-live-rates__eq">=</span>
          <strong>NPR {inrNpr}</strong>
        </span>
      </div>
      {fetchedAt && (
        <span className="admin-live-rates__time">
          Updated {fetchedAt.toLocaleTimeString()} · {isLive ? 'Real-time data' : 'Stored fallback'}
        </span>
      )}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────
   Image Upload Sub-component
   ──────────────────────────────────────────────────────────── */
function PackageImageUpload({ pkg, onUpdate, hideTitle = false }) {
  const [uploading, setUploading]   = useState(false)
  const [imgError,  setImgError]    = useState('')
  const [imgMsg,    setImgMsg]      = useState('')
  const [preview,   setPreview]     = useState(null)
  const [imgKey,    setImgKey]      = useState(Date.now())
  const fileRef                     = useRef(null)

  const currentUrl = pkg._raw?.image_url || ''

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImgError(''); setImgMsg('')
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) { setImgError('Please choose an image file first.'); return }

    setUploading(true); setImgError(''); setImgMsg('')
    try {
      const form = new FormData()
      form.append('image', file)

      const res  = await fetch(`${API}/api/admin/packages/${pkg.dbId}/image`, {
        method:  'POST',
        headers: authHeader(false),
        body:    form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')

      setPreview(null)
      if (fileRef.current) fileRef.current.value = ''
      setImgMsg('Image uploaded & saved.')
      setImgKey(Date.now())
      onUpdate(pkg.dbId, data.package._raw.image_url)
    } catch (err) {
      setImgError(err.message)
    } finally {
      setUploading(false)
    }
  }

  function handleUrlChange(e) {
    setImgError(''); setImgMsg(''); setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
    onUpdate(pkg.dbId, e.target.value)
  }

  const displayUrl = preview || currentUrl

  return (
    <div className={hideTitle ? 'admin-pkg-image-bare' : 'admin-pkg-section admin-pkg-image-section'}>
      {!hideTitle && (
        <p className="admin-pkg-section__title">
          Package image
          <span className="admin-pkg-section__hint"> — upload a file or paste a URL</span>
        </p>
      )}

      {displayUrl && (
        <div className="admin-pkg-image-preview">
          <img
            key={imgKey}
            src={preview ? displayUrl : `${displayUrl}?v=${imgKey}`}
            alt="Package preview"
            className={`admin-pkg-image-thumb${preview ? ' admin-pkg-image-thumb--pending' : ''}`}
            onError={(e) => { e.target.style.display = 'none' }}
          />
          {preview && <span className="admin-pkg-image-preview__label">Preview (not saved yet)</span>}
        </div>
      )}

      <div className="admin-pkg-image-upload-row">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="admin-pkg-image-file-input"
          id={`img-file-${pkg.dbId}`}
          onChange={handleFileChange}
          disabled={uploading}
        />
        <label htmlFor={`img-file-${pkg.dbId}`} className="admin-pkg-image-file-label">
          {uploading ? 'Uploading…' : '📁 Choose file'}
        </label>
        <button
          type="button"
          className="admin-filter-btn admin-pkg-image-upload-btn"
          onClick={handleUpload}
          disabled={uploading || !fileRef.current?.files?.length}
        >
          {uploading ? 'Uploading…' : 'Upload image'}
        </button>
      </div>

      <div className="admin-pkg-image-or">
        <span>or paste URL</span>
      </div>
      <label className="admin-pkg-field">
        <input
          type="url"
          placeholder="https://example.com/image.jpg"
          value={currentUrl}
          onChange={handleUrlChange}
        />
      </label>

      {imgMsg   && <p className="admin-msg admin-msg--ok  admin-msg--sm">{imgMsg}</p>}
      {imgError && <p className="admin-msg admin-msg--err admin-msg--sm">{imgError}</p>}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────
   Accordion Section — collapsible panel with animated body
   ──────────────────────────────────────────────────────────── */
function AccordionSection({ label, icon, summary, isOpen, onToggle, children }) {
  return (
    <div className={`pkg-acc${isOpen ? ' pkg-acc--open' : ''}`}>
      <button type="button" className="pkg-acc__btn" onClick={onToggle}>
        <span className="pkg-acc__icon">{icon}</span>
        <span className="pkg-acc__label">{label}</span>
        {!isOpen && summary && <span className="pkg-acc__summary">{summary}</span>}
        <span className="pkg-acc__arrow">
          <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12" aria-hidden="true">
            <path d="M8 10.94L2.53 5.47a.75.75 0 0 1 1.06-1.06L8 8.82l4.41-4.41a.75.75 0 1 1 1.06 1.06L8 10.94z"/>
          </svg>
        </span>
      </button>
      <div className="pkg-acc__body">
        <div className="pkg-acc__body-inner">
          {children}
        </div>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────
   Main PackageManager
   ──────────────────────────────────────────────────────────── */
export default function PackageManager() {
  const [packages,      setPackages]      = useState([])
  const [promo,         setPromo]         = useState(PROMO_DEFAULTS)
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(null)
  const [message,       setMessage]       = useState('')
  const [error,         setError]         = useState('')
  const [openSections,  setOpenSections]  = useState({})          // accordion state

  /* Which section is open? Base prices open by default, rest closed */
  function isSectionOpen(dbId, section) {
    if (!openSections[dbId]) return section === 'base'            // default
    return openSections[dbId][section] ?? (section === 'base')
  }
  function toggleSection(dbId, section) {
    setOpenSections(prev => ({
      ...prev,
      [dbId]: { ...(prev[dbId] || {}), [section]: !isSectionOpen(dbId, section) }
    }))
  }

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res  = await fetch(`${API}/api/admin/packages`, { headers: authHeader() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load packages')
      setPackages(data.packages || [])
      if (data.promo) setPromo({ ...PROMO_DEFAULTS, ...data.promo, showCountdown: data.promo.showCountdown !== undefined ? Boolean(data.promo.showCountdown) : true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function notify(msg, err) { if (err) setError(err); else setMessage(msg) }

  async function savePackage(pkg) {
    setSaving(pkg.dbId); setMessage(''); setError('')
    try {
      const r = pkg._raw || {}
      const body = {
        name:                     r.name,
        // Send NPR values directly (already stored as NPR; user edits converted on change)
        price_foreigner:          Number(r.price_foreigner),
        price_saarc:              Number(r.price_saarc),
        price_nepali:             Number(r.price_nepali),
        price_foreigner_discount: r.price_foreigner_discount ? Number(r.price_foreigner_discount) : null,
        price_saarc_discount:     r.price_saarc_discount     ? Number(r.price_saarc_discount)     : null,
        price_nepali_discount:    r.price_nepali_discount    ? Number(r.price_nepali_discount)    : null,
        discount_label:           r.discount_label  || null,
        urgency_text:             r.urgency_text    || null,
        image_url:                r.image_url       || null,
      }
      const res  = await fetch(`${API}/api/admin/packages/${pkg.dbId}`, { method: 'PATCH', headers: authHeader(), body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setPackages(prev => prev.map(p => p.dbId === pkg.dbId ? data.package : p))
      notify(`Saved "${data.package.name}" — changes are live.`)
    } catch (err) {
      notify('', err.message)
    } finally {
      setSaving(null)
    }
  }

  async function savePromo() {
    setSaving('promo'); setMessage(''); setError('')
    try {
      const res  = await fetch(`${API}/api/admin/packages/promo`, { method: 'PATCH', headers: authHeader(), body: JSON.stringify({ label: promo.label, endsAt: promo.endsAt, showCountdown: promo.showCountdown }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setPromo({ ...PROMO_DEFAULTS, ...data.promo })
      notify(promo.showCountdown ? 'Countdown updated — visible on Packages page.' : 'Countdown hidden from website.')
    } catch (err) {
      notify('', err.message)
    } finally {
      setSaving(null)
    }
  }

  function updateRaw(dbId, field, value) {
    setPackages(prev => prev.map(p =>
      p.dbId !== dbId ? p : { ...p, _raw: { ...p._raw, [field]: value } }
    ))
  }

  function handleImageUrlUpdate(dbId, newUrl) {
    updateRaw(dbId, 'image_url', newUrl)
  }

  if (loading) return (
    <div className="admin-loading" style={{ minHeight: 120 }}>
      <div className="admin-spinner" /><p>Loading packages…</p>
    </div>
  )

  return (
    <section className="admin-packages">
      <div className="admin-table-header">
        <h3>Package Pricing &amp; Promotions</h3>
        <span className="admin-table-count">Synced to website</span>
      </div>

      {message && <p className="admin-msg admin-msg--ok">{message}</p>}
      {error   && <p className="admin-msg admin-msg--err">{error}</p>}

      {/* ── Live Exchange Rates (read-only, auto-fetched) ── */}
      <LiveRatesDisplay />

      {/* ── Early Bird Countdown ── */}
      <div className="admin-promo-card">
        <div className="admin-promo-card__titlerow">
          <div>
            <h4>Early Bird Countdown</h4>
            <p className="admin-promo-hint">Shown at the top of the Packages page</p>
          </div>
          <label className="admin-toggle-label" title="Show/hide countdown on website">
            <span className="admin-toggle-text">{promo.showCountdown ? 'Visible on site' : 'Hidden from site'}</span>
            <div
              className={`admin-toggle${promo.showCountdown ? ' admin-toggle--on' : ''}`}
              role="switch"
              aria-checked={promo.showCountdown}
              tabIndex={0}
              onClick={() => setPromo(p => ({ ...p, showCountdown: !p.showCountdown }))}
              onKeyDown={e => (e.key === ' ' || e.key === 'Enter') && setPromo(p => ({ ...p, showCountdown: !p.showCountdown }))}
            >
              <span className="admin-toggle__knob" />
            </div>
          </label>
        </div>
        <div className="admin-promo-fields">
          <label>
            <span>Label</span>
            <input type="text" value={promo.label} onChange={e => setPromo(p => ({ ...p, label: e.target.value }))} placeholder="Early Bird Discount Expires In" />
          </label>
          <label>
            <span>End date</span>
            <input type="date" value={promo.endsAt} onChange={e => setPromo(p => ({ ...p, endsAt: e.target.value }))} />
          </label>
          <button type="button" className="admin-filter-btn" disabled={saving === 'promo'} onClick={savePromo}>
            {saving === 'promo' ? 'Saving…' : 'Save countdown'}
          </button>
        </div>
      </div>

      {/* ── Package cards ── */}
      <div className="admin-pkg-list">
        {packages.map(pkg => {
          const r = pkg._raw || {}
          /* Helpers for accordion summaries */
          const baseSummary = r.price_foreigner
            ? `Intl: NPR ${Number(r.price_foreigner).toLocaleString('en-IN')} · SAARC: NPR ${Number(r.price_saarc||0).toLocaleString('en-IN')} · Nepali: NPR ${Number(r.price_nepali||0).toLocaleString('en-IN')}`
            : '—'
          const discountSummary = r.price_foreigner_discount
            ? `NPR ${Number(r.price_foreigner_discount).toLocaleString('en-IN')} active`
            : 'None set'
          const badgeSummary = [r.discount_label, r.urgency_text].filter(Boolean).join(' · ') || '—'
          const imageSummary = r.image_url ? 'Uploaded' : 'None'

          return (
            <article key={pkg.dbId} className="admin-pkg-card">

              {/* ═══ Dark Forest Header ═══ */}
              <header className="admin-pkg-card__header">
                <div className="admin-pkg-card__header-top">
                  <span className="admin-pkg-card__badge">{pkg.badge}</span>
                  {pkg.popular && <span className="admin-pkg-card__popular">★ Signature</span>}
                </div>
                <input
                  type="text"
                  className="admin-pkg-card__name-input"
                  value={r.name || ''}
                  onChange={e => updateRaw(pkg.dbId, 'name', e.target.value)}
                  placeholder="Package name…"
                />
                {(r.urgency_text || r.discount_label) && (
                  <div className="admin-pkg-card__live-row">
                    {r.urgency_text   && <span className="admin-pkg-live admin-pkg-live--urgency">● {r.urgency_text}</span>}
                    {r.discount_label && <span className="admin-pkg-live admin-pkg-live--discount">● {r.discount_label}</span>}
                  </div>
                )}
              </header>

              {/* ═══ Accordion Body ═══ */}
              <div className="admin-pkg-card__body">

                <AccordionSection
                  label="Base Prices" icon="💰"
                  summary={baseSummary}
                  isOpen={isSectionOpen(pkg.dbId, 'base')}
                  onToggle={() => toggleSection(pkg.dbId, 'base')}
                >
                  <div className="admin-pkg-prices admin-pkg-prices--3col">
                    {/* International — NPR */}
                    <label className="admin-fx-price-label">
                      <span className="admin-pkg-price-head">
                        <span>International</span>
                        <span className="admin-fx-currency-tag admin-fx-currency-tag--npr">NPR</span>
                      </span>
                      <div className="admin-fx-price-input-wrap">
                        <span className="admin-fx-price-prefix admin-fx-price-prefix--npr">₨</span>
                        <input
                          type="number" min="0"
                          value={r.price_foreigner ?? ''}
                          onChange={e => updateRaw(pkg.dbId, 'price_foreigner', e.target.value || null)}
                          className="admin-fx-price-input"
                        />
                      </div>
                    </label>
                    {/* SAARC — NPR */}
                    <label className="admin-fx-price-label">
                      <span className="admin-pkg-price-head">
                        <span>SAARC</span>
                        <span className="admin-fx-currency-tag admin-fx-currency-tag--npr">NPR</span>
                      </span>
                      <div className="admin-fx-price-input-wrap">
                        <span className="admin-fx-price-prefix admin-fx-price-prefix--npr">₨</span>
                        <input
                          type="number" min="0"
                          value={r.price_saarc ?? ''}
                          onChange={e => updateRaw(pkg.dbId, 'price_saarc', e.target.value || null)}
                          className="admin-fx-price-input"
                        />
                      </div>
                    </label>
                    {/* Nepali — NPR (unchanged) */}
                    <label className="admin-fx-price-label">
                      <span className="admin-pkg-price-head">
                        <span>Nepali</span>
                        <span className="admin-fx-currency-tag admin-fx-currency-tag--npr">NPR</span>
                      </span>
                      <div className="admin-fx-price-input-wrap">
                        <span className="admin-fx-price-prefix admin-fx-price-prefix--npr">₨</span>
                        <input
                          type="number" min="0"
                          value={r.price_nepali ?? ''}
                          onChange={e => updateRaw(pkg.dbId, 'price_nepali', e.target.value)}
                          className="admin-fx-price-input"
                        />
                      </div>
                    </label>
                  </div>
                </AccordionSection>

                <AccordionSection
                  label="Discount Prices" icon="🏷️"
                  summary={discountSummary}
                  isOpen={isSectionOpen(pkg.dbId, 'discount')}
                  onToggle={() => toggleSection(pkg.dbId, 'discount')}
                >
                  <div className="admin-pkg-prices admin-pkg-prices--3col">
                    {/* Intl discount — NPR */}
                    <label className="admin-fx-price-label">
                      <span className="admin-pkg-price-head">
                        <span>Intl. discount</span>
                        <span className="admin-fx-currency-tag admin-fx-currency-tag--npr">NPR</span>
                      </span>
                      <div className="admin-fx-price-input-wrap">
                        <span className="admin-fx-price-prefix admin-fx-price-prefix--npr">₨</span>
                        <input
                          type="number" min="0"
                          value={r.price_foreigner_discount ?? ''}
                          onChange={e => updateRaw(pkg.dbId, 'price_foreigner_discount', e.target.value || null)}
                          className="admin-fx-price-input"
                        />
                      </div>
                    </label>
                    {/* SAARC discount — NPR */}
                    <label className="admin-fx-price-label">
                      <span className="admin-pkg-price-head">
                        <span>SAARC discount</span>
                        <span className="admin-fx-currency-tag admin-fx-currency-tag--npr">NPR</span>
                      </span>
                      <div className="admin-fx-price-input-wrap">
                        <span className="admin-fx-price-prefix admin-fx-price-prefix--npr">₨</span>
                        <input
                          type="number" min="0"
                          value={r.price_saarc_discount ?? ''}
                          onChange={e => updateRaw(pkg.dbId, 'price_saarc_discount', e.target.value || null)}
                          className="admin-fx-price-input"
                        />
                      </div>
                    </label>
                    <label className="admin-fx-price-label">
                      <span className="admin-pkg-price-head">
                        <span>Nepali disc.</span>
                        <span className="admin-fx-currency-tag admin-fx-currency-tag--npr">NPR</span>
                      </span>
                      <div className="admin-fx-price-input-wrap">
                        <span className="admin-fx-price-prefix admin-fx-price-prefix--npr">₨</span>
                        <input
                          type="number" min="0"
                          value={r.price_nepali_discount ?? ''}
                          onChange={e => updateRaw(pkg.dbId, 'price_nepali_discount', e.target.value || null)}
                          className="admin-fx-price-input"
                        />
                      </div>
                    </label>
                  </div>
                  <p className="admin-pkg-section__note" style={{ marginTop: 10 }}>Leave blank to use regular price.</p>
                </AccordionSection>

                <AccordionSection
                  label="Live Badges" icon="🎯"
                  summary={badgeSummary}
                  isOpen={isSectionOpen(pkg.dbId, 'badges')}
                  onToggle={() => toggleSection(pkg.dbId, 'badges')}
                >
                  <div className="admin-pkg-badges">
                    <label>
                      <span>Discount badge</span>
                      <input type="text" placeholder="e.g. 15% Off"
                        value={r.discount_label || ''}
                        onChange={e => updateRaw(pkg.dbId, 'discount_label', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Rooms / urgency</span>
                      <input type="text" placeholder="e.g. 2 rooms left"
                        value={r.urgency_text || ''}
                        onChange={e => updateRaw(pkg.dbId, 'urgency_text', e.target.value)}
                      />
                    </label>
                  </div>
                  <p className="admin-pkg-section__note" style={{ marginTop: 10 }}>Shown on Packages page, Home page, and booking wizard. Clear to hide.</p>
                </AccordionSection>

                <AccordionSection
                  label="Package Image" icon="🖼️"
                  summary={imageSummary}
                  isOpen={isSectionOpen(pkg.dbId, 'image')}
                  onToggle={() => toggleSection(pkg.dbId, 'image')}
                >
                  <PackageImageUpload pkg={pkg} onUpdate={handleImageUrlUpdate} hideTitle />
                </AccordionSection>

              </div>{/* end .admin-pkg-card__body */}

              {/* ═══ Footer — Save ═══ */}
              <div className="admin-pkg-card__footer">
                <button
                  type="button"
                  className="admin-pkg-save"
                  disabled={saving === pkg.dbId}
                  onClick={() => savePackage(pkg)}
                >
                  {saving === pkg.dbId
                    ? <><span className="pkg-save-spinner" />Saving…</>
                    : `Save ${r.name || 'Package'} →`}
                </button>
              </div>

            </article>
          )
        })}
      </div>
    </section>
  )
}
