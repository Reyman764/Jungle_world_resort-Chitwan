import React, { useState, useEffect, useCallback } from 'react'
import './admin.css'
import {
  API, authHeader, fmtMoney as fmt,
  PAYMENT_STATUS_LABEL, BOOKING_STATUS_LABEL,
  StatusBadge, PayBadge, BreakdownBarList,
} from './statBreakdownShared'

const REVENUE_STATUSES = ['confirmed', 'checked_in', 'checked_out']

export default function RevenueBreakdown({ isOpen, onClose, onReconciled, isAdmin }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmingFix, setConfirmingFix] = useState(false)
  const [fixing, setFixing] = useState(false)
  const [fixResult, setFixResult] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    fetch(`${API}/api/admin/stats/revenue-breakdown`, { headers: authHeader() })
      .then(async (r) => {
        const json = await r.json().catch(() => null)
        if (!r.ok) throw new Error(json?.error || 'Failed to load revenue breakdown')
        return json
      })
      .then(setData)
      .catch((e) => setError(e.message || 'Failed to load revenue breakdown'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (isOpen) {
      setFixResult(null)
      setConfirmingFix(false)
      load()
    }
  }, [isOpen, load])

  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  async function runReconcile() {
    setFixing(true)
    setError('')
    try {
      const res = await fetch(`${API}/api/admin/stats/reconcile-payments`, {
        method: 'POST',
        headers: authHeader(),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || 'Failed to reconcile payments')
      setFixResult(json)
      setConfirmingFix(false)
      load()
      if (onReconciled) onReconciled()
    } catch (e) {
      setError(e.message || 'Failed to reconcile payments')
      setConfirmingFix(false)
    } finally {
      setFixing(false)
    }
  }

  if (!isOpen) return null

  const confirmedRevenue = data
    ? data.by_status
        .filter((s) => REVENUE_STATUSES.includes(s.status))
        .reduce((sum, s) => sum + Number(s.revenue), 0)
    : 0

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal-card modal-card--wide rev-breakdown-card"
        role="dialog"
        aria-modal="true"
        aria-label="Revenue Breakdown"
      >
        <div className="modal-header">
          <div>
            <div className="modal-title">Revenue Breakdown</div>
            {data && (
              <div className="modal-ref">
                {data.booking_count} active booking{data.booking_count === 1 ? '' : 's'} counted · deleted &amp; draft bookings excluded
              </div>
            )}
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-body rev-breakdown-body">
          {loading ? (
            <div className="admin-loading" style={{ padding: '60px 24px' }}>
              <div className="admin-spinner" /><p>Loading breakdown…</p>
            </div>
          ) : error ? (
            <p className="text-muted" style={{ padding: '24px' }}>{error}</p>
          ) : !data ? null : (
            <>
              <div className="rev-summary-row">
                <div className="rev-summary-item rev-summary-item--primary">
                  <div className="rev-summary-item__label">Total Revenue</div>
                  <div className="rev-summary-item__value">{fmt(data.grand_total)}</div>
                </div>
                <div className="rev-summary-item">
                  <div className="rev-summary-item__label">From Confirmed / Checked-in / Checked-out</div>
                  <div className="rev-summary-item__value">{fmt(confirmedRevenue)}</div>
                </div>
              </div>

              {data.mismatched_count > 0 && (
                <div className="rev-mismatch-banner">
                  <div className="rev-mismatch-banner__text">
                    <strong>⚠ {data.mismatched_count} booking{data.mismatched_count === 1 ? '' : 's'}</strong> have paid,
                    refund, or balance amounts that don't match what their own payment status implies — usually left
                    over from before a fix, or edited by hand. They're marked with ⚠ in the table below.
                  </div>
                  {!isAdmin ? (
                    <div className="rev-fix-note">Ask an admin to fix these.</div>
                  ) : !confirmingFix ? (
                    <button type="button" className="rev-fix-btn" onClick={() => setConfirmingFix(true)}>
                      Fix Automatically
                    </button>
                  ) : (
                    <div className="rev-fix-confirm">
                      <span>Recalculate paid / refund / balance for these bookings using each one's own payment status?</span>
                      <div className="rev-fix-confirm__actions">
                        <button type="button" className="modal-cancel-btn" onClick={() => setConfirmingFix(false)} disabled={fixing}>
                          Cancel
                        </button>
                        <button type="button" className="modal-delete-confirm-btn" onClick={runReconcile} disabled={fixing}>
                          {fixing ? 'Fixing…' : 'Yes, Fix Now'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {fixResult && (
                <div className="rev-fix-result">
                  ✓ {fixResult.fixed_count > 0 ? fixResult.message : 'Nothing needed fixing — all good.'}
                </div>
              )}

              <div className="detail-section detail-section--full">
                <div className="detail-section__title">Revenue by Package</div>
                <BreakdownBarList
                  items={data.by_package}
                  nameKey="package_name"
                  valueKey="revenue"
                  formatValue={(item) => fmt(item.revenue)}
                  subKey="booking_count"
                  formatSub={(item) => `${item.booking_count} booking${item.booking_count === 1 ? '' : 's'}`}
                />
              </div>

              <div className="detail-section">
                <div className="detail-section__title">By Payment Status</div>
                <BreakdownBarList
                  items={data.by_payment_status}
                  nameKey="payment_status"
                  labelMap={PAYMENT_STATUS_LABEL}
                  valueKey="revenue"
                  formatValue={(item) => fmt(item.revenue)}
                  subKey="booking_count"
                  formatSub={(item) => `${item.booking_count} booking${item.booking_count === 1 ? '' : 's'}`}
                />
              </div>
              <div className="detail-section">
                <div className="detail-section__title">By Booking Status</div>
                <BreakdownBarList
                  items={data.by_status}
                  nameKey="status"
                  labelMap={BOOKING_STATUS_LABEL}
                  valueKey="revenue"
                  formatValue={(item) => fmt(item.revenue)}
                  subKey="booking_count"
                  formatSub={(item) => `${item.booking_count} booking${item.booking_count === 1 ? '' : 's'}`}
                />
              </div>

              <div className="detail-section detail-section--full">
                <div className="detail-section__title">Bookings Contributing Revenue ({data.bookings.length})</div>
                {data.bookings.length === 0 ? (
                  <p className="rev-empty-note">No revenue-generating bookings yet.</p>
                ) : (
                  <div className="rev-table-wrap">
                    <table className="rev-table">
                      <thead>
                        <tr>
                          <th>Reference</th>
                          <th>Guest</th>
                          <th>Package</th>
                          <th>Status</th>
                          <th>Payment</th>
                          <th>Total</th>
                          <th>Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.bookings.map((b) => (
                          <tr key={b.id} className={b.is_mismatched ? 'rev-row--mismatch' : ''}>
                            <td>{b.booking_reference}</td>
                            <td>{b.guest_name}</td>
                            <td>{b.package_name}</td>
                            <td><StatusBadge status={b.status} /></td>
                            <td><PayBadge status={b.payment_status} /></td>
                            <td>{fmt(b.total_price)}</td>
                            <td>
                              {fmt(b.revenue)}
                              {b.is_mismatched && (
                                <span
                                  className="rev-mismatch-flag"
                                  title={`Stored paid amount: ${fmt(b.paid_amount)} → expected: ${fmt(b.expected_paid_amount)}`}
                                >
                                  {' '}⚠
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <p className="rev-legend">
                Completed bookings count their full price. Partially paid bookings count only what's been paid so far.
                Refunded bookings count what was paid minus what was refunded. Draft bookings and anything in the
                recycle bin are excluded entirely — but a cancelled or no-show booking still counts here if it was
                already paid and never refunded (see "By Booking Status" above).
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
