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
  if (status === 'completed') {
    return (
      <span className="pay-badge-completed" title="Paid in Full" aria-label="Paid in Full">
        <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M2.5 7l3 3.5 6-7" stroke="currentColor" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    )
  }
  return (
    <span className={`status-badge pay-${status || 'pending'}`}>{status || 'pending'}</span>
  )
}

// Audit log UI moved to its own page: /admin/bookings/:id/audit-logs

export default function BookingDetail({ bookingId, onClose, onUpdate }) {
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast,   setToast]   = useState(null) // { type: 'success'|'error', msg }

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

              {/* Audit log page */}
              <div className="audit-action" style={{ marginTop: 4 }}>
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

              {toast && (
                <div className={`admin-toast admin-toast--${toast.type}`} style={{ margin: '10px 0 0' }}>
                  {toast.msg}
                </div>
              )}

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
