import React, { useState, useEffect, useCallback } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function authHeader() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {}
}

const PROMO_DEFAULTS = { label: '', endsAt: '', showCountdown: true }

export default function PackageManager() {
  const [packages, setPackages] = useState([])
  const [promo,    setPromo]    = useState(PROMO_DEFAULTS)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(null)
  const [message,  setMessage]  = useState('')
  const [error,    setError]    = useState('')

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
        price_foreigner:          Number(r.price_foreigner),
        price_saarc:              Number(r.price_saarc),
        price_nepali:             Number(r.price_nepali),
        price_foreigner_discount: r.price_foreigner_discount ? Number(r.price_foreigner_discount) : null,
        price_saarc_discount:     r.price_saarc_discount     ? Number(r.price_saarc_discount)     : null,
        price_nepali_discount:    r.price_nepali_discount    ? Number(r.price_nepali_discount)    : null,
        discount_label:           r.discount_label  || null,
        urgency_text:             r.urgency_text    || null,
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

  // Only _raw needs updating — display values (name, discount, urgency) come from _raw via save
  function updateRaw(dbId, field, value) {
    setPackages(prev => prev.map(p =>
      p.dbId !== dbId ? p : { ...p, _raw: { ...p._raw, [field]: value } }
    ))
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
                {r.urgency_text  && <span className="admin-pkg-card__urgency-preview" title="Urgency badge (live)">🔴 {r.urgency_text}</span>}
                {r.discount_label && <span className="admin-pkg-card__discount-preview" title="Discount badge (live)">🟢 {r.discount_label}</span>}
              </header>

              <label className="admin-pkg-field">
                <span>Package name</span>
                <input type="text" value={r.name || ''} onChange={e => updateRaw(pkg.dbId, 'name', e.target.value)} />
              </label>

              <div className="admin-pkg-prices">
                {[['International (NPR)', 'price_foreigner'], ['SAARC (NPR)', 'price_saarc'], ['Nepali (NPR)', 'price_nepali']].map(([label, field]) => (
                  <label key={field}>
                    <span>{label}</span>
                    <input type="number" min="0" value={r[field] ?? ''} onChange={e => updateRaw(pkg.dbId, field, e.target.value)} />
                  </label>
                ))}
              </div>

              <div className="admin-pkg-section">
                <p className="admin-pkg-section__title">
                  Discount prices <span className="admin-pkg-section__hint">— leave blank to use regular price</span>
                </p>
                <div className="admin-pkg-prices">
                  {[['Intl. discount', 'price_foreigner_discount'], ['SAARC discount', 'price_saarc_discount'], ['Nepali discount', 'price_nepali_discount']].map(([label, field]) => (
                    <label key={field}>
                      <span>{label}</span>
                      <input type="number" min="0" value={r[field] ?? ''} onChange={e => updateRaw(pkg.dbId, field, e.target.value || null)} />
                    </label>
                  ))}
                </div>
              </div>

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
