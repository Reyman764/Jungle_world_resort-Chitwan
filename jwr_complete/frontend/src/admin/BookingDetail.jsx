import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import './admin.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function authHeader() {
  const token = localStorage.getItem('token')
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

function DetailRow({ label, value, valueClass = '' }) {
  return (
    <div className="detail-row">
      <span className="detail-row__key">{label}</span>
      <span className={`detail-row__val ${valueClass}`}>{value ?? '—'}</span>
    </div>
  )
}

function StatusBadge({ status }) {
  return (
    <span className={`status-badge status-${status || 'draft'}`}>{status || 'draft'}</span>
  )
}

function PayBadge({ status }) {
  return (
    <span className={`status-badge pay-${status || 'pending'}`}>{status || 'pending'}</span>
  )
}

// Audit log UI moved to its own page: /admin/bookings/:id/audit-logs

export default function BookingDetail({ bookingId, onClose, onUpdate }) {
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [toast,   setToast]   = useState(null) // { type: 'success'|'error', msg }

  // Editable fields
  const [status,        setStatus]        = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paidAmount,    setPaidAmount]    = useState('')
  const [refundAmount,  setRefundAmount]  = useState('')
  const [adminNotes,    setAdminNotes]    = useState('')

  const navigate = useNavigate()

  // Delete guest or draft booking
  const [deleteMode, setDeleteMode] = useState(null) // 'guest' | 'booking'
  const [deleting, setDeleting] = useState(false)

  // ── Load booking ──────────────────────────────────────
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

  // Audit log is loaded on its own page now (/admin/bookings/:id/audit-logs)

  // ── Lock body scroll while modal open ────────────────
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
    const paid = Number(paidAmount || 0)

    setPaymentStatus(nextStatus)

    if (nextStatus === 'completed') {
      setPaidAmount(String(total))
      setRefundAmount('0')
    } else if (nextStatus === 'pending' || nextStatus === 'failed') {
      setPaidAmount('0')
      setRefundAmount('0')
    } else if (nextStatus === 'partial') {
      setRefundAmount('0')
    } else if (nextStatus === 'refunded' && Number(refundAmount || 0) === 0) {
      setRefundAmount(String(paid > 0 ? paid : total))
    }
  }

  // ── Save booking update ───────────────────────────────
  async function handleSave() {
    setSaving(true)
    try {
      const res  = await fetch(`${API}/api/admin/${bookingId}`, {
        method:  'PATCH',
        headers: authHeader(),
        body: JSON.stringify({
          status,
          payment_status: paymentStatus,
          payment_method: paymentMethod,
          paid_amount:    parseFloat(paidAmount) || 0,
          refund_amount:  parseFloat(refundAmount) || 0,
          admin_notes:    adminNotes,
        }),
      })
      const data = await res.json()

      if (res.ok) {
        setBooking(data.booking)
        setStatus(data.booking.status || 'draft')
        setPaymentStatus(data.booking.payment_status || 'pending')
        setPaymentMethod(data.booking.payment_method || 'pay_at_hotel')
        setPaidAmount(data.booking.paid_amount ?? '0')
        setRefundAmount(data.booking.refund_amount ?? '0')
        setAdminNotes(data.booking.admin_notes || '')
        showToast('success', 'Booking updated successfully')
        // Audit log lives on a separate page now
        if (onUpdate) onUpdate()
      } else {
        showToast('error', data.error || 'Failed to save changes')
      }
    } catch {
      showToast('error', 'Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteGuest() {
    if (!booking?.guest_email) return
    setDeleting(true)
    try {
      const res = await fetch(
        `${API}/api/admin/users/${booking.user?.id || booking.user_id || booking.guest_email}`,
        { method: 'DELETE', headers: authHeader() },
      )
      const data = await res.json()
      if (res.ok) {
        showToast('success', `Guest data anonymized. Booking records preserved.`)
        setDeleteMode(null)
        setTimeout(() => { onUpdate?.(); onClose() }, 1500)
      } else {
        showToast('error', data.error || 'Failed to delete guest account')
        setDeleteMode(null)
      }
    } catch {
      showToast('error', 'Network error — please try again')
      setDeleteMode(null)
    } finally {
      setDeleting(false)
    }
  }

  async function handleDeleteBooking() {
    if (!booking?.id) return
    setDeleting(true)
    try {
      const res = await fetch(`${API}/api/admin/bookings/${booking.id}`, {
        method: 'DELETE',
        headers: authHeader(),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        showToast('success', data.message || 'Booking permanently deleted')
        setDeleteMode(null)
        setTimeout(() => { onUpdate?.(); onClose() }, 1200)
      } else {
        showToast('error', data.error || 'Failed to delete booking')
        setDeleteMode(null)
      }
    } catch {
      showToast('error', 'Network error — please try again')
      setDeleteMode(null)
    } finally {
      setDeleting(false)
    }
  }

  // ─────────────────────────────────────────────────────
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-label="Booking Details">

        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-title">Booking Details</div>
            {booking && <div className="modal-ref">{booking.booking_reference}</div>}
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {loading ? (
          <div className="admin-loading" style={{ padding: '60px 24px' }}>
            <div className="admin-spinner" />
            <p>Loading booking…</p>
          </div>
        ) : !booking ? (
          <div className="admin-empty" style={{ padding: '60px 24px' }}>
            <div className="admin-empty__title">Booking not found</div>
          </div>
        ) : (
          <>
            <div className="modal-body">

              {/* Guest Info */}
              <div className="detail-section">
                <div className="detail-section__title">Guest Information</div>
                <DetailRow label="Full Name"   value={booking.guest_name} />
                <DetailRow label="Email"       value={booking.guest_email} />
                <DetailRow label="Phone"       value={booking.guest_phone} />
                <DetailRow label="Nationality" value={booking.guest_nationality} />
                <DetailRow label="Category"    value={<span style={{ textTransform: 'capitalize' }}>{booking.guest_category}</span>} />
              </div>

              {/* Stay Details */}
              <div className="detail-section">
                <div className="detail-section__title">Stay Details</div>
                <DetailRow label="Package"   value={booking.package?.name} />
                <DetailRow label="Check-in"  value={booking.check_in_date} />
                <DetailRow label="Check-out" value={booking.check_out_date || '—'} />
                <DetailRow label="Adults"    value={booking.num_adults} />
                <DetailRow label="Children"  value={booking.num_children} />
                {booking.special_requests && (
                  <DetailRow label="Requests" value={booking.special_requests} />
                )}
              </div>

              {/* Pricing */}
              <div className="detail-section">
                <div className="detail-section__title">Pricing (NPR)</div>
                <DetailRow label="Base Price"     value={`NPR ${Number(booking.base_price).toLocaleString()}`} />
                <DetailRow label="Service Charge" value={`NPR ${Number(booking.service_charge).toLocaleString()}`} />
                <DetailRow label="VAT"            value={`NPR ${Number(booking.vat).toLocaleString()}`} />
                <DetailRow label="Total Price"    value={`NPR ${Number(booking.total_price).toLocaleString()}`} valueClass="price" />
                <DetailRow label="Paid Amount"    value={`NPR ${Number(booking.paid_amount).toLocaleString()}`} />
                <DetailRow label="Balance Due"    value={`NPR ${Number(booking.balance_due).toLocaleString()}`} />
                {booking.refund_amount && Number(booking.refund_amount) > 0 && (
                  <DetailRow
                    label="Refund Amount"
                    value={`NPR ${Number(booking.refund_amount).toLocaleString()}`}
                    valueClass="refund-amount"
                  />
                )}
              </div>

              {/* Current Status */}
              <div className="detail-section">
                <div className="detail-section__title">Current Status</div>
                <DetailRow label="Booking Status"  value={<StatusBadge status={booking.status} />} />
                <DetailRow label="Payment Status"  value={<PayBadge   status={booking.payment_status} />} />
                <DetailRow label="Payment Method"  value={booking.payment_method || '—'} />
                <DetailRow label="Booking Source"  value={booking.source || 'direct'} />
                <DetailRow
                  label="Created"
                  value={
                    booking.created_at
                      ? new Date(booking.created_at).toLocaleDateString('en-GB', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })
                      : '—'
                  }
                />
                {booking.admin_notes && (
                  <DetailRow label="Internal Notes" value={booking.admin_notes} />
                )}
              </div>

              {/* Edit Form */}
              <div className="edit-section">
                <div className="edit-section__title">Update Booking</div>

                <div className="edit-grid">
                  <div className="edit-form-group">
                    <label className="edit-form-label">Booking Status</label>
                    <select
                      className="edit-form-select"
                      value={status}
                      onChange={e => setStatus(e.target.value)}
                    >
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
                    <select
                      className="edit-form-select"
                      value={paymentStatus}
                      onChange={e => handlePaymentStatusChange(e.target.value)}
                    >
                      <option value="pending">Pending</option>
                      <option value="partial">Partial</option>
                      <option value="completed">Completed</option>
                      <option value="refunded">Refunded</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>

                  <div className="edit-form-group">
                    <label className="edit-form-label">Payment Method</label>
                    <select
                      className="edit-form-select"
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value)}
                    >
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
                      type="number"
                      min="0"
                      step="0.01"
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
                        type="number"
                        min="0"
                        step="0.01"
                        className="edit-form-input"
                        value={refundAmount}
                        onChange={e => setRefundAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  )}

                  <div className="edit-form-group edit-form-group--full">
                    <label className="edit-form-label">
                      Internal Notes (visible to staff only)
                    </label>
                    <textarea
                      className="edit-form-textarea"
                      value={adminNotes}
                      onChange={e => setAdminNotes(e.target.value)}
                      placeholder="Add internal notes about this booking…"
                    />
                  </div>
                </div>

                {/* Payment status hint */}
                <div className="payment-hint">
                  <span className="payment-hint__icon">ℹ️</span>
                  <span>
                    Revenue rule: <strong>Pending / Failed</strong> = NPR 0 counted ·{' '}
                    <strong>Partial</strong> = paid amount only ·{' '}
                    <strong>Completed</strong> = full total ·{' '}
                    <strong>Refunded</strong> = paid amount minus refund amount
                  </span>
                </div>

                {toast && (
                  <div className={`admin-toast admin-toast--${toast.type}`} style={{ marginTop: 8 }}>
                    {toast.msg}
                  </div>
                )}
              </div>

              {/* Audit log moved to its own page */}
              <div className="audit-action" style={{ marginTop: 12 }}>
                <button
                  className="view-audit-btn"
                  onClick={() => navigate(`/admin/bookings/${bookingId}/audit-logs`)}
                >
                  <svg viewBox="0 0 16 16" fill="none" width="14" height="14" style={{ marginRight: 8, verticalAlign: -2 }}>
                    <path d="M8 1v6l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                  View Change History
                </button>
              </div>

            </div>

            {/* Footer */}
            <div className="modal-footer">
              {booking?.status === 'draft' && (
                <button
                  type="button"
                  className="modal-delete-btn"
                  onClick={() => setDeleteMode('booking')}
                  title="Permanently remove this draft booking"
                >
                  Delete Booking
                </button>
              )}
              {booking && booking.status !== 'draft' && (
                <button
                  type="button"
                  className="modal-delete-btn"
                  onClick={() => setDeleteMode('guest')}
                  title="Anonymize guest account"
                >
                  Delete Guest
                </button>
              )}
              <button className="modal-cancel-btn" onClick={onClose}>Close</button>
              <button className="modal-save-btn" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <div
                      className="admin-spinner admin-spinner--sm"
                      style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}
                    />
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

            {/* Delete Confirmation */}
            {deleteMode === 'booking' && (
              <div className="delete-confirm-overlay">
                <div className="delete-confirm-box">
                  <div className="delete-confirm-icon">🗑️</div>
                  <h3 className="delete-confirm-title">Delete Draft Booking?</h3>
                  <p className="delete-confirm-msg">
                    Permanently remove <strong>{booking.booking_reference}</strong> ({booking.guest_name})?
                    This cannot be undone.
                  </p>
                  <div className="delete-confirm-actions">
                    <button type="button" className="modal-cancel-btn" onClick={() => setDeleteMode(null)} disabled={deleting}>Cancel</button>
                    <button type="button" className="modal-delete-confirm-btn" onClick={handleDeleteBooking} disabled={deleting}>
                      {deleting ? 'Deleting…' : 'Yes, Delete Booking'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {deleteMode === 'guest' && (
              <div className="delete-confirm-overlay">
                <div className="delete-confirm-box">
                  <div className="delete-confirm-icon">⚠️</div>
                  <h3 className="delete-confirm-title">Delete Guest Account?</h3>
                  <p className="delete-confirm-msg">
                    Anonymize <strong>{booking.guest_name}</strong> ({booking.guest_email}) across all bookings.
                    Financial records are preserved.
                  </p>
                  <div className="delete-confirm-actions">
                    <button type="button" className="modal-cancel-btn" onClick={() => setDeleteMode(null)} disabled={deleting}>Cancel</button>
                    <button type="button" className="modal-delete-confirm-btn" onClick={handleDeleteGuest} disabled={deleting}>
                      {deleting ? 'Deleting…' : 'Yes, Delete Guest'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
