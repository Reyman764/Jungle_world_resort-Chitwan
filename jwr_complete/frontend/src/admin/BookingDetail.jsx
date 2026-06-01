import React, { useState, useEffect } from 'react'
import './admin.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function authHeader() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
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
  return <span className={`status-badge status-${status || 'draft'}`}>{status || 'draft'}</span>
}

function PayBadge({ status }) {
  return <span className={`status-badge pay-${status || 'pending'}`}>{status || 'pending'}</span>
}

export default function BookingDetail({ bookingId, onClose, onUpdate }) {
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [toast,   setToast]   = useState(null)   // { type: 'success'|'error', msg }
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Editable fields
  const [status,        setStatus]        = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [paidAmount,    setPaidAmount]    = useState('')
  const [adminNotes,    setAdminNotes]    = useState('')

  useEffect(() => {
    if (!bookingId) return
    setLoading(true)
    fetch(`${API}/api/admin/${bookingId}`, { headers: authHeader() })
      .then(r => r.json())
      .then(d => {
        if (d.booking) {
          setBooking(d.booking)
          setStatus(d.booking.status        || 'draft')
          setPaymentStatus(d.booking.payment_status || 'pending')
          setPaidAmount(d.booking.paid_amount ?? '0')
          setAdminNotes(d.booking.admin_notes || '')
        }
      })
      .finally(() => setLoading(false))
  }, [bookingId])

  function showToast(type, msg) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res  = await fetch(`${API}/api/admin/${bookingId}`, {
        method:  'PATCH',
        headers: authHeader(),
        body: JSON.stringify({
          status,
          payment_status: paymentStatus,
          paid_amount:    parseFloat(paidAmount) || 0,
          admin_notes:    adminNotes,
        }),
      })
      const data = await res.json()

      if (res.ok) {
        setBooking(data.booking)
        showToast('success', 'Booking updated successfully')
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
      const res = await fetch(`${API}/api/admin/users/${booking.user_id || booking.guest_email}`, {
        method: 'DELETE',
        headers: authHeader(),
      })
      const data = await res.json()
      if (res.ok) {
        showToast('success', `Guest account for ${booking.guest_name} has been deleted.`)
        setShowDeleteConfirm(false)
        setTimeout(() => { if (onUpdate) onUpdate(); onClose() }, 1800)
      } else {
        showToast('error', data.error || 'Failed to delete guest account')
        setShowDeleteConfirm(false)
      }
    } catch {
      showToast('error', 'Network error — please try again')
      setShowDeleteConfirm(false)
    } finally {
      setDeleting(false)
    }
  }


  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

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
                <DetailRow label="Package"     value={booking.package?.name} />
                <DetailRow label="Check-in"    value={booking.check_in_date} />
                <DetailRow label="Check-out"   value={booking.check_out_date || '—'} />
                <DetailRow label="Adults"      value={booking.num_adults} />
                <DetailRow label="Children"    value={booking.num_children} />
                {booking.special_requests && (
                  <DetailRow label="Requests"  value={booking.special_requests} />
                )}
              </div>

              {/* Pricing */}
              <div className="detail-section">
                <div className="detail-section__title">Pricing (NPR)</div>
                <DetailRow label="Base Price"      value={`NPR ${Number(booking.base_price).toLocaleString()}`} />
                <DetailRow label="Service Charge"  value={`NPR ${Number(booking.service_charge).toLocaleString()}`} />
                <DetailRow label="VAT"             value={`NPR ${Number(booking.vat).toLocaleString()}`} />
                <DetailRow label="Total Price"     value={`NPR ${Number(booking.total_price).toLocaleString()}`} valueClass="price" />
                <DetailRow label="Paid Amount"     value={`NPR ${Number(booking.paid_amount).toLocaleString()}`} />
                <DetailRow label="Balance Due"     value={`NPR ${Number(booking.balance_due).toLocaleString()}`} />
              </div>

              {/* Current Status */}
              <div className="detail-section">
                <div className="detail-section__title">Current Status</div>
                <DetailRow label="Booking Status"  value={<StatusBadge status={booking.status} />} />
                <DetailRow label="Payment Status"  value={<PayBadge   status={booking.payment_status} />} />
                <DetailRow label="Payment Method"  value={booking.payment_method || '—'} />
                <DetailRow label="Booking Source"  value={booking.source || 'direct'} />
                <DetailRow label="Created"         value={booking.created_at ? new Date(booking.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'} />
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
                    <select className="edit-form-select" value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)}>
                      <option value="pending">Pending</option>
                      <option value="partial">Partial</option>
                      <option value="completed">Completed</option>
                      <option value="refunded">Refunded</option>
                      <option value="failed">Failed</option>
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

                  <div className="edit-form-group edit-form-group--full">
                    <label className="edit-form-label">Internal Notes (visible to staff only)</label>
                    <textarea
                      className="edit-form-textarea"
                      value={adminNotes}
                      onChange={e => setAdminNotes(e.target.value)}
                      placeholder="Add internal notes about this booking, special instructions, payment details, etc…"
                    />
                  </div>
                </div>

                {toast && (
                  <div className={`admin-toast admin-toast--${toast.type}`} style={{ marginTop: 8 }}>
                    {toast.msg}
                  </div>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="modal-footer">
              {/* Delete Guest — only available after checked out */}
              {booking.status === 'checked_out' && (
                <button
                  className="modal-delete-btn"
                  onClick={() => setShowDeleteConfirm(true)}
                  title="Remove guest account from system after checkout"
                >
                  <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
                    <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Delete Guest
                </button>
              )}
              <button className="modal-cancel-btn" onClick={onClose}>
                Close
              </button>
              <button className="modal-save-btn" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <div className="admin-spinner admin-spinner--sm" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />
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

            {/* Delete Confirmation Dialog */}
            {showDeleteConfirm && (
              <div className="delete-confirm-overlay">
                <div className="delete-confirm-box">
                  <div className="delete-confirm-icon">⚠️</div>
                  <h3 className="delete-confirm-title">Delete Guest Account?</h3>
                  <p className="delete-confirm-msg">
                    This will permanently delete the guest account for <strong>{booking.guest_name}</strong> ({booking.guest_email}).
                    Their booking records will be preserved. This action cannot be undone.
                  </p>
                  <div className="delete-confirm-actions">
                    <button
                      className="modal-cancel-btn"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleting}
                    >
                      Cancel
                    </button>
                    <button
                      className="modal-delete-confirm-btn"
                      onClick={handleDeleteGuest}
                      disabled={deleting}
                    >
                      {deleting ? (
                        <>
                          <div className="admin-spinner admin-spinner--sm" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />
                          Deleting…
                        </>
                      ) : (
                        'Yes, Delete Guest'
                      )}
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
