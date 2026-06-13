import React, { useState, useEffect } from 'react'
import './admin.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function authHeader() {
  const token = localStorage.getItem('token')
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

export default function QuickUpdateModal({ bookingId, onClose, onUpdate }) {
  const [booking,       setBooking]       = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [toast,         setToast]         = useState(null)

  const [status,        setStatus]        = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paidAmount,    setPaidAmount]    = useState('')
  const [refundAmount,  setRefundAmount]  = useState('')
  const [adminNotes,    setAdminNotes]    = useState('')

  // ── Load booking ─────────────────────────────────────
  useEffect(() => {
    if (!bookingId) return
    setLoading(true)
    fetch(`${API}/api/admin/${bookingId}`, { headers: authHeader() })
      .then(r => r.json())
      .then(d => {
        if (d.booking) {
          setBooking(d.booking)
          setStatus(d.booking.status         || 'draft')
          setPaymentStatus(d.booking.payment_status || 'pending')
          setPaymentMethod(d.booking.payment_method || 'pay_at_hotel')
          setPaidAmount(d.booking.paid_amount  ?? '0')
          setRefundAmount(d.booking.refund_amount ?? '0')
          setAdminNotes(d.booking.admin_notes  || '')
        }
      })
      .finally(() => setLoading(false))
  }, [bookingId])

  // ── Lock body scroll ──────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function showToast(type, msg) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  function handlePaymentStatusChange(nextStatus) {
    const total = Number(booking?.total_price || 0)
    const paid  = Number(paidAmount || 0)
    setPaymentStatus(nextStatus)
    if (nextStatus === 'completed') {
      setPaidAmount(String(total)); setRefundAmount('0')
    } else if (nextStatus === 'pending' || nextStatus === 'failed') {
      setPaidAmount('0'); setRefundAmount('0')
    } else if (nextStatus === 'partial') {
      setRefundAmount('0')
    } else if (nextStatus === 'refunded' && Number(refundAmount || 0) === 0) {
      setRefundAmount(String(paid > 0 ? paid : total))
    }
  }

  // ── Save ──────────────────────────────────────────────
  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/admin/${bookingId}`, {
        method: 'PATCH',
        headers: authHeader(),
        body: JSON.stringify({
          status,
          payment_status: paymentStatus,
          payment_method: paymentMethod,
          paid_amount:    parseFloat(paidAmount)   || 0,
          refund_amount:  parseFloat(refundAmount) || 0,
          admin_notes:    adminNotes,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        showToast('success', 'Booking updated successfully')
        onUpdate?.()
        setTimeout(() => onClose(), 1000)
      } else {
        showToast('error', data.error || 'Failed to save changes')
      }
    } catch {
      showToast('error', 'Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card qum-card" role="dialog" aria-modal="true" aria-label="Update Booking">

        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-title">Update Booking</div>
            {booking && (
              <div className="modal-ref">
                {booking.booking_reference} · {booking.guest_name}
              </div>
            )}
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {loading ? (
          <div className="admin-loading" style={{ padding: '48px 24px' }}>
            <div className="admin-spinner" /><p>Loading booking…</p>
          </div>
        ) : !booking ? (
          <div className="admin-empty" style={{ padding: '48px 24px' }}>
            <div className="admin-empty__title">Booking not found</div>
          </div>
        ) : (
          <>
            <div className="qum-body">

              {/* Quick summary bar */}
              <div className="qum-summary-row">
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" className="qum-summary-icon">
                  <path d="M3 3h10a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                  <path d="M5 3V2M11 3V2M1 7h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <span className="qum-summary-pkg">{booking.package?.name || '—'}</span>
                <span className="qum-summary-meta">Check-in: {booking.check_in_date}</span>
                <span className="qum-summary-price">
                  NPR {Math.round(Number(booking.total_price || 0)).toLocaleString()}
                </span>
              </div>

              {/* Edit form */}
              <div className="edit-section" style={{ margin: 0 }}>
                <div className="edit-section__title">Update Booking</div>

                <div className="edit-grid">
                  <div className="edit-form-group">
                    <label className="edit-form-label">Booking Status</label>
                    <select className="edit-form-select" value={status} onChange={e => setStatus(e.target.value)}>
                      <option value="draft">Draft</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="checked_in">Checked In</option>
                      <option value="checked_out">Checked Out</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="no_show">No Show</option>
                    </select>
                  </div>

                  <div className="edit-form-group">
                    <label className="edit-form-label">Payment Status</label>
                    <select className="edit-form-select" value={paymentStatus} onChange={e => handlePaymentStatusChange(e.target.value)}>
                      <option value="pending">Pending</option>
                      <option value="partial">Partial</option>
                      <option value="completed">Completed</option>
                      <option value="refunded">Refunded</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>

                  <div className="edit-form-group">
                    <label className="edit-form-label">Payment Method</label>
                    <select className="edit-form-select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                      <option value="pay_at_hotel">Pay At Hotel</option>
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="khalti">Khalti</option>
                      <option value="stripe">Stripe</option>
                    </select>
                  </div>

                  <div className="edit-form-group">
                    <label className="edit-form-label">Paid Amount (NPR)</label>
                    <input
                      type="number" min="0" step="0.01"
                      className="edit-form-input"
                      value={paidAmount}
                      onChange={e => setPaidAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  {paymentStatus === 'refunded' && (
                    <div className="edit-form-group">
                      <label className="edit-form-label">Refund Amount (NPR)</label>
                      <input
                        type="number" min="0" step="0.01"
                        className="edit-form-input"
                        value={refundAmount}
                        onChange={e => setRefundAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  )}

                  <div className="edit-form-group edit-form-group--full">
                    <label className="edit-form-label">Internal Notes (visible to staff only)</label>
                    <textarea
                      className="edit-form-textarea"
                      value={adminNotes}
                      onChange={e => setAdminNotes(e.target.value)}
                      placeholder="Add internal notes about this booking…"
                    />
                  </div>
                </div>

                <div className="payment-hint" style={{ marginTop: 14 }}>
                  <span className="payment-hint__icon">ℹ️</span>
                  <span>
                    Revenue rule: <strong>Pending / Failed</strong> = NPR 0 ·{' '}
                    <strong>Partial</strong> = paid amount ·{' '}
                    <strong>Completed</strong> = full total ·{' '}
                    <strong>Refunded</strong> = paid minus refund
                  </span>
                </div>

                {toast && (
                  <div className={`admin-toast admin-toast--${toast.type}`} style={{ marginTop: 10 }}>
                    {toast.msg}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <span />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="modal-cancel-btn" onClick={onClose}>Close</button>
                <button className="modal-save-btn" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <div className="admin-spinner admin-spinner--sm"
                        style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />
                      Saving…
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
                        <path d="M13 4L6.5 11 3 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
