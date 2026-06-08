import React, { useState, useEffect, useCallback, useRef } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function authHeader(json = true) {
  const token = localStorage.getItem('token')
  const base  = token ? { Authorization: `Bearer ${token}` } : {}
  return json ? { ...base, 'Content-Type': 'application/json' } : base
}

const PROMO_DEFAULTS = { label: '', endsAt: '', showCountdown: true }
const DEFAULT_RATES  = { usd_to_npr: 132, inr_to_npr: 1.58 }

/* ────────────────────────────────────────────────────────────
   Currency helpers
   ──────────────────────────────────────────────────────────── */
function nprToUsd(npr, rate) {
  if (!npr || !rate) return ''
  return (Number(npr) / Number(rate)).toFixed(2)
}
function nprToInr(npr, rate) {
  if (!npr || !rate) return ''
  return Math.round(Number(npr) / Number(rate)).toString()
}
function usdToNpr(usd, rate) { return Math.round(Number(usd) * Number(rate)) }
function inrToNpr(inr, rate) { return Math.round(Number(inr) * Number(rate)) }

function fmtNprEq(nprVal) {
  if (!nprVal || isNaN(Number(nprVal))) return '—'
  return `NPR ${Math.round(Number(nprVal)).toLocaleString('en-IN')}`
}

/* ────────────────────────────────────────────────────────────
   Image Upload Sub-component
   ──────────────────────────────────────────────────────────── */
function PackageImageUpload({ pkg, onUpdate }) {
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
    <div className="admin-pkg-section admin-pkg-image-section">
      <p className="admin-pkg-section__title">
        Package image
        <span className="admin-pkg-section__hint"> — upload a file or paste a URL</span>
      </p>

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
   Currency Rate Settings Card
   ──────────────────────────────────────────────────────────── */
function CurrencyRatesCard({ rates, onSaved }) {
  const [form,    setForm]    = useState({ usd_to_npr: '', inr_to_npr: '' })
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState('')
  const [err,     setErr]     = useState('')

  /* Sync incoming rates into the form whenever they change */
  useEffect(() => {
    setForm({
      usd_to_npr: rates.usd_to_npr?.toString() || DEFAULT_RATES.usd_to_npr.toString(),
      inr_to_npr: rates.inr_to_npr?.toString() || DEFAULT_RATES.inr_to_npr.toString(),
    })
  }, [rates.usd_to_npr, rates.inr_to_npr])

  async function handleSave() {
    setMsg(''); setErr('')
    const usd = parseFloat(form.usd_to_npr)
    const inr = parseFloat(form.inr_to_npr)
    if (!Number.isFinite(usd) || usd <= 0) { setErr('USD rate must be a positive number'); return }
    if (!Number.isFinite(inr) || inr <= 0) { setErr('INR rate must be a positive number'); return }

    setSaving(true)
    try {
      const res  = await fetch(`${API}/api/admin/packages/currency-rates`, {
        method:  'PATCH',
        headers: authHeader(),
        body:    JSON.stringify({ usd_to_npr: usd, inr_to_npr: inr }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setMsg('Exchange rates saved — all package prices updated instantly.')
      onSaved(data.currencyRates)
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-promo-card admin-fx-card">
      <div className="admin-promo-card__titlerow">
        <div>
          <h4>Currency Conversion Rates</h4>
          <p className="admin-promo-hint">
            International prices are entered in <strong>USD</strong> · SAARC prices in <strong>INR</strong>.
            Set the exchange rates here — all prices sync automatically.
          </p>
        </div>
      </div>

      <div className="admin-fx-grid">
        {/* USD → NPR */}
        <div className="admin-fx-field">
          <label className="admin-fx-label">
            <span className="admin-fx-flag">🇺🇸</span>
            <span>1 USD =</span>
          </label>
          <div className="admin-fx-input-wrap">
            <input
              type="number"
              min="1"
              step="0.01"
              value={form.usd_to_npr}
              onChange={e => setForm(f => ({ ...f, usd_to_npr: e.target.value }))}
              className="admin-fx-input"
            />
            <span className="admin-fx-suffix">NPR</span>
          </div>
          <span className="admin-fx-example">
            e.g. USD 100 = NPR {Math.round(parseFloat(form.usd_to_npr || 0) * 100).toLocaleString('en-IN')}
          </span>
        </div>

        {/* INR → NPR */}
        <div className="admin-fx-field">
          <label className="admin-fx-label">
            <span className="admin-fx-flag">🇮🇳</span>
            <span>1 INR =</span>
          </label>
          <div className="admin-fx-input-wrap">
            <input
              type="number"
              min="0.01"
              step="0.0001"
              value={form.inr_to_npr}
              onChange={e => setForm(f => ({ ...f, inr_to_npr: e.target.value }))}
              className="admin-fx-input"
            />
            <span className="admin-fx-suffix">NPR</span>
          </div>
          <span className="admin-fx-example">
            e.g. INR 100 = NPR {Math.round(parseFloat(form.inr_to_npr || 0) * 100).toLocaleString('en-IN')}
          </span>
        </div>

        <button
          type="button"
          className="admin-filter-btn admin-fx-save-btn"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save rates'}
        </button>
      </div>

      {msg && <p className="admin-msg admin-msg--ok  admin-msg--sm" style={{ marginTop: 8 }}>{msg}</p>}
      {err && <p className="admin-msg admin-msg--err admin-msg--sm" style={{ marginTop: 8 }}>{err}</p>}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────
   Price field pair: currency input (free-type, no NPR equiv)
   ──────────────────────────────────────────────────────────── */
function CurrencyPriceField({ label, currency, symbol, nprValue, rate, onChange, toNpr, fromNpr }) {
  /* Local string state so the user can type multi-digit values freely
     without React overwriting the input on every keystroke.             */
  const computedVal = nprValue ? fromNpr(nprValue, rate) : ''
  const [localVal, setLocalVal] = useState(computedVal)
  const editingRef = useRef(false)

  /* Sync from parent only while NOT being edited */
  useEffect(() => {
    if (!editingRef.current) {
      setLocalVal(nprValue ? fromNpr(nprValue, rate) : '')
    }
  }, [nprValue, rate])                        // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <label className="admin-fx-price-label">
      <span className="admin-pkg-price-head">
        <span>{label}</span>
        <span className="admin-fx-currency-tag">{currency}</span>
      </span>
      <div className="admin-fx-price-input-wrap">
        <span className="admin-fx-price-prefix">{symbol}</span>
        <input
          type="number"
          min="0"
          step="any"
          value={localVal}
          onFocus={() => { editingRef.current = true }}
          onChange={e => {
            const raw = e.target.value
            setLocalVal(raw)                  // keep local string in sync
            if (raw === '' || raw === null) { onChange(null); return }
            const converted = toNpr(raw, rate)
            onChange(isNaN(converted) ? null : converted)
          }}
          onBlur={() => {
            editingRef.current = false
            /* Re-format on blur (e.g. "10" → "10.00") */
            setLocalVal(nprValue ? fromNpr(nprValue, rate) : '')
          }}
          className="admin-fx-price-input"
        />
      </div>
      {/* NPR equivalent hint removed — not needed in admin price section */}
    </label>
  )
}

/* ────────────────────────────────────────────────────────────
   Main PackageManager
   ──────────────────────────────────────────────────────────── */
export default function PackageManager() {
  const [packages,  setPackages]  = useState([])
  const [promo,     setPromo]     = useState(PROMO_DEFAULTS)
  const [rates,     setRates]     = useState(DEFAULT_RATES)
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(null)
  const [message,   setMessage]   = useState('')
  const [error,     setError]     = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res  = await fetch(`${API}/api/admin/packages`, { headers: authHeader() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load packages')
      setPackages(data.packages || [])
      if (data.promo) setPromo({ ...PROMO_DEFAULTS, ...data.promo, showCountdown: data.promo.showCountdown !== undefined ? Boolean(data.promo.showCountdown) : true })
      if (data.currencyRates) setRates(data.currencyRates)
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

      {/* ── Currency Conversion Rates ── */}
      <CurrencyRatesCard rates={rates} onSaved={newRates => { setRates(newRates); setMessage('') }} />

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
          return (
            <article key={pkg.dbId} className="admin-pkg-card">
              <header className="admin-pkg-card__head">
                <span className="admin-pkg-card__badge">{pkg.badge}</span>
                {pkg.popular && <span className="admin-pkg-card__popular">Signature</span>}
                {r.urgency_text   && <span className="admin-pkg-card__urgency-preview"  title="Urgency badge (live)">🔴 {r.urgency_text}</span>}
                {r.discount_label && <span className="admin-pkg-card__discount-preview" title="Discount badge (live)">🟢 {r.discount_label}</span>}
              </header>

              <label className="admin-pkg-field">
                <span>Package name</span>
                <input type="text" value={r.name || ''} onChange={e => updateRaw(pkg.dbId, 'name', e.target.value)} />
              </label>

              {/* ── Base Prices ── */}
              <div className="admin-pkg-section">
                <p className="admin-pkg-section__title">
                  Base prices
                  <span className="admin-pkg-section__hint"> — International in USD · SAARC in INR · Nepali in NPR</span>
                </p>
                <div className="admin-pkg-prices admin-pkg-prices--3col">
                  <CurrencyPriceField
                    label="International"
                    currency="USD"
                    symbol="$"
                    nprValue={r.price_foreigner}
                    rate={rates.usd_to_npr}
                    toNpr={usdToNpr}
                    fromNpr={nprToUsd}
                    onChange={v => updateRaw(pkg.dbId, 'price_foreigner', v)}
                  />
                  <CurrencyPriceField
                    label="SAARC"
                    currency="INR"
                    symbol="₹"
                    nprValue={r.price_saarc}
                    rate={rates.inr_to_npr}
                    toNpr={inrToNpr}
                    fromNpr={nprToInr}
                    onChange={v => updateRaw(pkg.dbId, 'price_saarc', v)}
                  />
                  {/* Nepali stays NPR */}
                  <label className="admin-fx-price-label">
                    <span className="admin-pkg-price-head">
                      <span>Nepali</span>
                      <span className="admin-fx-currency-tag admin-fx-currency-tag--npr">NPR</span>
                    </span>
                    <div className="admin-fx-price-input-wrap">
                      <span className="admin-fx-price-prefix admin-fx-price-prefix--npr">₨</span>
                      <input
                        type="number"
                        min="0"
                        value={r.price_nepali ?? ''}
                        onChange={e => updateRaw(pkg.dbId, 'price_nepali', e.target.value)}
                        className="admin-fx-price-input"
                      />
                    </div>
                  </label>
                </div>
              </div>

              {/* ── Discount Prices ── */}
              <div className="admin-pkg-section">
                <p className="admin-pkg-section__title">
                  Discount prices <span className="admin-pkg-section__hint">— leave blank to use regular price</span>
                </p>
                <div className="admin-pkg-prices admin-pkg-prices--3col">
                  <CurrencyPriceField
                    label="Intl. discount"
                    currency="USD"
                    symbol="$"
                    nprValue={r.price_foreigner_discount}
                    rate={rates.usd_to_npr}
                    toNpr={usdToNpr}
                    fromNpr={nprToUsd}
                    onChange={v => updateRaw(pkg.dbId, 'price_foreigner_discount', v)}
                  />
                  <CurrencyPriceField
                    label="SAARC discount"
                    currency="INR"
                    symbol="₹"
                    nprValue={r.price_saarc_discount}
                    rate={rates.inr_to_npr}
                    toNpr={inrToNpr}
                    fromNpr={nprToInr}
                    onChange={v => updateRaw(pkg.dbId, 'price_saarc_discount', v)}
                  />
                  <label className="admin-fx-price-label">
                    <span className="admin-pkg-price-head">
                      <span>Nepali discount</span>
                      <span className="admin-fx-currency-tag admin-fx-currency-tag--npr">NPR</span>
                    </span>
                    <div className="admin-fx-price-input-wrap">
                      <span className="admin-fx-price-prefix admin-fx-price-prefix--npr">₨</span>
                      <input
                        type="number"
                        min="0"
                        value={r.price_nepali_discount ?? ''}
                        onChange={e => updateRaw(pkg.dbId, 'price_nepali_discount', e.target.value || null)}
                        className="admin-fx-price-input"
                      />
                    </div>
                  </label>
                </div>
              </div>

              {/* ── Live Badges ── */}
              <div className="admin-pkg-section">
                <p className="admin-pkg-section__title">
                  Live badges <span className="admin-pkg-section__hint">— appear on package cards across the site</span>
                </p>
                <div className="admin-pkg-badges">
                  <label>
                    <span>Discount badge</span>
                    <input type="text" placeholder="e.g. 15% Off" value={r.discount_label || ''} onChange={e => updateRaw(pkg.dbId, 'discount_label', e.target.value)} />
                  </label>
                  <label>
                    <span>Rooms / urgency text</span>
                    <input type="text" placeholder="e.g. 2 rooms left" value={r.urgency_text || ''} onChange={e => updateRaw(pkg.dbId, 'urgency_text', e.target.value)} />
                  </label>
                </div>
                <p className="admin-pkg-section__note">Shown on Packages page, Home page cards, and the booking wizard. Clear to hide.</p>
              </div>

              {/* ── Image Upload ── */}
              <PackageImageUpload pkg={pkg} onUpdate={handleImageUrlUpdate} />

              <button type="button" className="admin-filter-btn admin-pkg-save" disabled={saving === pkg.dbId} onClick={() => savePackage(pkg)}>
                {saving === pkg.dbId ? 'Saving…' : `Save ${r.name || 'package'}`}
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}
