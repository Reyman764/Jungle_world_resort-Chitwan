import React, { useState, useEffect, useCallback } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function authHeader() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {}
}

export default function PackageManager() {
  const [packages, setPackages] = useState([])
  const [promo, setPromo] = useState({ label: '', endsAt: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/api/admin/packages`, { headers: authHeader() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load packages')
      setPackages(data.packages || [])
      if (data.promo) setPromo(data.promo)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function savePackage(pkg) {
    setSaving(pkg.dbId)
    setMessage('')
    setError('')
    try {
      const raw = pkg._raw || {}
      const body = {
        name: raw.name,
        price_foreigner: Number(raw.price_foreigner),
        price_saarc: Number(raw.price_saarc),
        price_nepali: Number(raw.price_nepali),
        price_foreigner_discount: raw.price_foreigner_discount ? Number(raw.price_foreigner_discount) : null,
        price_saarc_discount: raw.price_saarc_discount ? Number(raw.price_saarc_discount) : null,
        price_nepali_discount: raw.price_nepali_discount ? Number(raw.price_nepali_discount) : null,
        discount_label: raw.discount_label || null,
        urgency_text: raw.urgency_text || null,
      }
      const res = await fetch(`${API}/api/admin/packages/${pkg.dbId}`, {
        method: 'PATCH',
        headers: authHeader(),
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setPackages(prev => prev.map(p => p.dbId === pkg.dbId ? data.package : p))
      setMessage(`Saved "${data.package.name}" — changes are live on the website.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(null)
    }
  }

  async function savePromo() {
    setSaving('promo')
    setMessage('')
    setError('')
    try {
      const res = await fetch(`${API}/api/admin/packages/promo`, {
        method: 'PATCH',
        headers: authHeader(),
        body: JSON.stringify({ label: promo.label, endsAt: promo.endsAt }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setPromo(data.promo)
      setMessage('Promo countdown updated — visible on Packages page.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(null)
    }
  }

  function updateRaw(dbId, field, value) {
    setPackages(prev => prev.map(p => {
      if (p.dbId !== dbId) return p
      return {
        ...p,
        _raw: { ...p._raw, [field]: value },
        name: field === 'name' ? value : p.name,
        discount: field === 'discount_label' ? (value || null) : p.discount,
        urgency: field === 'urgency_text' ? (value || null) : p.urgency,
      }
    }))
  }

  if (loading) {
    return (
      <div className="admin-loading" style={{ minHeight: 120 }}>
        <div className="admin-spinner" />
        <p>Loading packages…</p>
      </div>
    )
  }

  return (
    <section className="admin-packages">
      <div className="admin-table-header">
        <h3>Package Pricing &amp; Promotions</h3>
        <span className="admin-table-count">Synced to website</span>
      </div>

      {message && <p className="admin-msg admin-msg--ok">{message}</p>}
      {error && <p className="admin-msg admin-msg--err">{error}</p>}

      <div className="admin-promo-card">
        <h4>Early Bird Countdown</h4>
        <p className="admin-promo-hint">Shown at the top of the Packages page</p>
        <div className="admin-promo-fields">
          <label>
            <span>Label</span>
            <input
              type="text"
              value={promo.label || ''}
              onChange={e => setPromo(p => ({ ...p, label: e.target.value }))}
              placeholder="Early Bird Discount Expires In"
            />
          </label>
          <label>
            <span>End date</span>
            <input
              type="date"
              value={promo.endsAt || ''}
              onChange={e => setPromo(p => ({ ...p, endsAt: e.target.value }))}
            />
          </label>
          <button
            type="button"
            className="admin-filter-btn"
            disabled={saving === 'promo'}
            onClick={savePromo}
          >
            {saving === 'promo' ? 'Saving…' : 'Save countdown'}
          </button>
        </div>
      </div>

      <div className="admin-pkg-list">
        {packages.map(pkg => {
          const raw = pkg._raw || {}
          return (
            <article key={pkg.dbId} className="admin-pkg-card">
              <header className="admin-pkg-card__head">
                <span className="admin-pkg-card__badge">{pkg.badge}</span>
                {pkg.popular && <span className="admin-pkg-card__popular">Signature</span>}
              </header>

              <label className="admin-pkg-field">
                <span>Package name</span>
                <input
                  type="text"
                  value={raw.name || ''}
                  onChange={e => updateRaw(pkg.dbId, 'name', e.target.value)}
                />
              </label>

              <div className="admin-pkg-prices">
                <label>
                  <span>International (NPR)</span>
                  <input
                    type="number"
                    min="0"
                    value={raw.price_foreigner ?? ''}
                    onChange={e => updateRaw(pkg.dbId, 'price_foreigner', e.target.value)}
                  />
                </label>
                <label>
                  <span>SAARC (NPR)</span>
                  <input
                    type="number"
                    min="0"
                    value={raw.price_saarc ?? ''}
                    onChange={e => updateRaw(pkg.dbId, 'price_saarc', e.target.value)}
                  />
                </label>
                <label>
                  <span>Nepali (NPR)</span>
                  <input
                    type="number"
                    min="0"
                    value={raw.price_nepali ?? ''}
                    onChange={e => updateRaw(pkg.dbId, 'price_nepali', e.target.value)}
                  />
                </label>
              </div>

              <div className="admin-pkg-prices admin-pkg-prices--discount">
                <p className="admin-pkg-discount-title">Discount prices (optional — leave blank to use regular price)</p>
                <label>
                  <span>Intl. discount</span>
                  <input
                    type="number"
                    min="0"
                    value={raw.price_foreigner_discount ?? ''}
                    onChange={e => updateRaw(pkg.dbId, 'price_foreigner_discount', e.target.value || null)}
                  />
                </label>
                <label>
                  <span>SAARC discount</span>
                  <input
                    type="number"
                    min="0"
                    value={raw.price_saarc_discount ?? ''}
                    onChange={e => updateRaw(pkg.dbId, 'price_saarc_discount', e.target.value || null)}
                  />
                </label>
                <label>
                  <span>Nepali discount</span>
                  <input
                    type="number"
                    min="0"
                    value={raw.price_nepali_discount ?? ''}
                    onChange={e => updateRaw(pkg.dbId, 'price_nepali_discount', e.target.value || null)}
                  />
                </label>
              </div>

              <div className="admin-pkg-badges">
                <label>
                  <span>Discount badge</span>
                  <input
                    type="text"
                    placeholder="e.g. 15% Off"
                    value={raw.discount_label || ''}
                    onChange={e => updateRaw(pkg.dbId, 'discount_label', e.target.value)}
                  />
                </label>
                <label>
                  <span>Urgency text</span>
                  <input
                    type="text"
                    placeholder="e.g. 2 rooms left"
                    value={raw.urgency_text || ''}
                    onChange={e => updateRaw(pkg.dbId, 'urgency_text', e.target.value)}
                  />
                </label>
              </div>

              <button
                type="button"
                className="admin-filter-btn admin-pkg-save"
                disabled={saving === pkg.dbId}
                onClick={() => savePackage(pkg)}
              >
                {saving === pkg.dbId ? 'Saving…' : `Save ${raw.name || 'package'}`}
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}
