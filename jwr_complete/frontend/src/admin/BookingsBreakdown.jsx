import React, { useState, useEffect, useCallback } from 'react'
import './admin.css'
import {
  API, authHeader, fmtMoney, fmtDate, fmtRelative, fmtCount,
  BOOKING_STATUS_LABEL, SOURCE_LABEL,
  StatusBadge, PayBadge, BreakdownBarList,
} from './statBreakdownShared'

const SCOPE_META = {
  all: {
    title: 'All Bookings',
    note: 'every active booking, all time · recycled bookings excluded',
  },
  draft: {
    title: 'Pending / Draft Bookings',
    note: "checkout was started but never finished — safe to delete if abandoned · oldest first",
  },
  active: {
    title: 'Confirmed & Active Bookings',
    note: 'confirmed or checked-in right now · soonest arrival first',
  },
}

export default function BookingsBreakdown({ isOpen, onClose, scope }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    fetch(`${API}/api/admin/stats/bookings-breakdown?scope=${encodeURIComponent(scope)}`, { headers: authHeader() })
      .then(async (r) => {
        const json = await r.json().catch(() => null)
        if (!r.ok) throw new Error(json?.error || 'Failed to load booking breakdown')
        return json
      })
      .then(setData)
      .catch((e) => setError(e.message || 'Failed to load booking breakdown'))
      .finally(() => setLoading(false))
  }, [scope])

  useEffect(() => {
    if (isOpen) load()
  }, [isOpen, load])

  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  const meta = SCOPE_META[scope] || SCOPE_META.all
  const statusCounts = data ? Object.fromEntries(data.by_status.map((s) => [s.status, s.booking_count])) : {}
  const showContactColumn = scope === 'draft'

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal-card modal-card--wide rev-breakdown-card"
        role="dialog"
        aria-modal="true"
        aria-label={meta.title}
      >
        <div className="modal-header">
          <div>
            <div className="modal-title">{meta.title}</div>
            <div className="modal-ref">{meta.note}</div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-body rev-breakdown-body">
          {loading ? (
            <div className="admin-loading" style={{ padding: '60px 24px' }}>
              <div className="admin-spinner" /><p>Loading…</p>
            </div>
          ) : error ? (
            <p className="text-muted" style={{ padding: '24px' }}>{error}</p>
          ) : !data ? null : (
            <>
              <div className="rev-summary-row">
                {scope === 'active' ? (
                  <>
                    <div className="rev-summary-item rev-summary-item--primary">
                      <div className="rev-summary-item__label">Confirmed</div>
                      <div className="rev-summary-item__value">{statusCounts.confirmed || 0}</div>
                    </div>
                    <div className="rev-summary-item">
                      <div className="rev-summary-item__label">Checked In</div>
                      <div className="rev-summary-item__value">{statusCounts.checked_in || 0}</div>
                    </div>
                  </>
                ) : (
                  <div className="rev-summary-item rev-summary-item--primary">
                    <div className="rev-summary-item__label">{meta.title}</div>
                    <div className="rev-summary-item__value">{data.booking_count}</div>
                  </div>
                )}
              </div>

              <div className="detail-section detail-section--full">
                <div className="detail-section__title">By Package</div>
                <BreakdownBarList
                  items={data.by_package}
                  nameKey="package_name"
                  valueKey="booking_count"
                  formatValue={(item) => fmtCount(item.booking_count)}
                />
              </div>

              {data.by_status.length > 1 && (
                <div className="detail-section">
                  <div className="detail-section__title">By Status</div>
                  <BreakdownBarList
                    items={data.by_status}
                    nameKey="status"
                    labelMap={BOOKING_STATUS_LABEL}
                    valueKey="booking_count"
                    formatValue={(item) => fmtCount(item.booking_count)}
                  />
                </div>
              )}
              {data.by_source.length > 1 && (
                <div className="detail-section">
                  <div className="detail-section__title">By Source</div>
                  <BreakdownBarList
                    items={data.by_source}
                    nameKey="source"
                    labelMap={SOURCE_LABEL}
                    valueKey="booking_count"
                    formatValue={(item) => fmtCount(item.booking_count)}
                  />
                </div>
              )}

              <div className="detail-section detail-section--full">
                <div className="detail-section__title">Bookings ({data.bookings.length})</div>
                {data.bookings.length === 0 ? (
                  <p className="rev-empty-note">Nothing here.</p>
                ) : (
                  <div className="rev-table-wrap">
                    <table className="rev-table">
                      <thead>
                        <tr>
                          <th>Reference</th>
                          <th>Guest</th>
                          <th>Package</th>
                          <th>Stay</th>
                          <th>Party</th>
                          <th>Status</th>
                          <th>Payment</th>
                          <th>Total</th>
                          {showContactColumn && <th>Contact</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {data.bookings.map((b) => (
                          <tr key={b.id}>
                            <td>
                              {b.booking_reference}
                              {b.is_spam && <span className="rev-mismatch-flag" title="Flagged as spam"> 🚫</span>}
                              <div className="rev-table-subtext">created {fmtRelative(b.created_at)}</div>
                            </td>
                            <td>{b.guest_name}</td>
                            <td>{b.package_name}</td>
                            <td>
                              {fmtDate(b.check_in_date)} → {fmtDate(b.check_out_date)}
                              <div className="rev-table-subtext">{fmtRelative(b.check_in_date)}</div>
                            </td>
                            <td>{b.num_adults}A{b.num_children ? ` + ${b.num_children}C` : ''}</td>
                            <td><StatusBadge status={b.status} /></td>
                            <td><PayBadge status={b.payment_status} /></td>
                            <td>{fmtMoney(b.total_price)}</td>
                            {showContactColumn && (
                              <td>
                                <div className="rev-table-subtext">{b.guest_email}</div>
                                <div className="rev-table-subtext">{b.guest_phone || '—'}</div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
