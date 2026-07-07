import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import './admin.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function authHeader() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function currentUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    return null
  }
}

/* ── Safe date helpers (same conventions as AuditLogPage) ─── */
function safeDate(val) {
  if (!val) return null
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d
}

function formatRelative(d) {
  if (!d) return '—'
  const today     = new Date()
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  const t = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === today.toDateString())     return `Today · ${t}`
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday · ${t}`
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ` · ${t}`
}

const STATUS_LABEL = {
  draft:        'Draft',
  confirmed:    'Confirmed',
  checked_in:   'Checked In',
  checked_out:  'Checked Out',
  cancelled:    'Cancelled',
  no_show:      'No Show',
}

const ROLE_LABEL = {
  admin:   'Admin',
  manager: 'Manager',
  staff:   'Staff',
}

/* ── Single recycle-bin row ──────────────────────────────── */
function BinRow({ booking, onRestore, onPermanentDelete, busy }) {
  const deletedAt = safeDate(booking.deleted_at)
  const deleterName = booking.deleted_by_name || 'Unknown'
  const deleterRole = ROLE_LABEL[booking.deleted_by_role] || booking.deleted_by_role || ''

  return (
    <tr className="admin-table-row rb-row">
      <td><strong>{booking.booking_reference}</strong></td>
      <td className="guest-name">{booking.guest_name}</td>
      <td>{booking.package?.name || '—'}</td>
      <td>{booking.check_in_date}</td>
      <td>
        <span className="rb-status-chip">{STATUS_LABEL[booking.status] || booking.status}</span>
      </td>
      <td className="amount">NPR {Math.round(Number(booking.total_price || 0)).toLocaleString()}</td>
      <td>
        <div className="rb-deleter">
          <span className="rb-deleter__name">{deleterName}</span>
          {deleterRole && <span className="rb-deleter__role">{deleterRole}</span>}
        </div>
      </td>
      <td className="rb-when">{formatRelative(deletedAt)}</td>
      <td className="admin-table-actions">
        <button
          type="button"
          className="rb-restore-btn"
          onClick={() => onRestore(booking)}
          disabled={busy}
        >
          Restore
        </button>
        <button
          type="button"
          className="admin-delete-btn"
          onClick={() => onPermanentDelete(booking)}
          disabled={busy}
        >
          Delete Forever
        </button>
      </td>
    </tr>
  )
}

/* ── Page ────────────────────────────────────────────────── */
export default function RecycleBin() {
  const navigate = useNavigate()
  const user = currentUser()

  const [bookings, setBookings] = useState([])
  const [total,    setTotal]    = useState(0)
  const [page,     setPage]     = useState(1)
  const [loading,  setLoading]  = useState(true)
  const [busyId,   setBusyId]   = useState(null)
  const [toast,    setToast]    = useState(null)
  const [confirmTarget, setConfirmTarget] = useState(null) // { booking, action: 'restore' | 'delete' }

  const limit = 20

  const showToast = useCallback((type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const loadBin = useCallback(() => {
    setLoading(true)
    fetch(`${API}/api/admin/recycle-bin?page=${page}&limit=${limit}`, { headers: authHeader() })
      .then(r => {
        if (r.status === 403) throw new Error('forbidden')
        return r.json()
      })
      .then(d => {
        setBookings(d.bookings || [])
        setTotal(d.total || 0)
      })
      .catch(() => setBookings([]))
      .finally(() => setLoading(false))
  }, [page])

  useEffect(() => {
    if (user?.role === 'admin') loadBin()
  }, [loadBin, user?.role])

  async function handleRestore(booking) {
    setBusyId(booking.id)
    try {
      const res = await fetch(`${API}/api/admin/recycle-bin/${booking.id}/restore`, {
        method: 'POST',
        headers: authHeader(),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setBookings(prev => prev.filter(b => b.id !== booking.id))
        setTotal(prev => Math.max(prev - 1, 0))
        showToast('success', data.message || 'Booking restored')
      } else {
        showToast('error', data.error || 'Could not restore booking')
      }
    } catch {
      showToast('error', 'Network error — try again')
    } finally {
      setBusyId(null)
      setConfirmTarget(null)
    }
  }

  async function handlePermanentDelete(booking) {
    setBusyId(booking.id)
    try {
      const res = await fetch(`${API}/api/admin/recycle-bin/${booking.id}`, {
        method: 'DELETE',
        headers: authHeader(),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setBookings(prev => prev.filter(b => b.id !== booking.id))
        setTotal(prev => Math.max(prev - 1, 0))
        showToast('success', data.message || 'Booking permanently deleted')
      } else {
        showToast('error', data.error || 'Could not delete booking')
      }
    } catch {
      showToast('error', 'Network error — try again')
    } finally {
      setBusyId(null)
      setConfirmTarget(null)
    }
  }

  function requestPermanentDelete(booking) {
    setConfirmTarget({ booking, action: 'delete' })
  }

  function requestRestore(booking) {
    // Restoring is low-risk and reversible (can delete again), so it goes
    // straight through — only the irreversible "delete forever" needs the
    // confirm dialog.
    handleRestore(booking)
  }

  const totalPages = Math.max(Math.ceil(total / limit), 1)

  /* ── Non-admin: friendly denial, matching the AdminDashboard
     tab-gating pattern used for Gallery/Offers ── */
  if (user && user.role !== 'admin') {
    return (
      <div className="admin-shell admin-audit-page">
        <header className="admin-topbar">
          <div className="admin-topbar__brand">
            <button type="button" className="admin-back-btn" onClick={() => navigate('/admin/dashboard')}>
              ← Back to Dashboard
            </button>
            <span className="admin-topbar__logo">Recycle Bin</span>
          </div>
        </header>
        <main className="admin-content">
          <div className="admin-empty rb-denied">
            <div className="rb-denied__icon">🔒</div>
            <h2>Admin Access Only</h2>
            <p>The recycle bin is restricted to admin accounts. If you believe you need access, ask an admin to review the deletion for you.</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="admin-shell admin-audit-page">
      <header className="admin-topbar">
        <div className="admin-topbar__brand">
          <button type="button" className="admin-back-btn" onClick={() => navigate('/admin/dashboard')}>
            ← Back to Dashboard
          </button>
          <span className="admin-topbar__logo">Recycle Bin</span>
        </div>
      </header>

      <main className="admin-content">
        <div className="alp-header">
          <div>
            <h1 className="admin-page-title">Deleted Bookings</h1>
            <p className="admin-page-sub">
              {total} booking{total !== 1 ? 's' : ''} in the recycle bin · visible to admins only
            </p>
          </div>
        </div>

        {loading ? (
          <div className="admin-loading">
            <div className="admin-spinner" />
            Loading recycle bin…
          </div>
        ) : bookings.length === 0 ? (
          <div className="admin-empty">
            <div className="rb-empty__icon">🗑️</div>
            <p>The recycle bin is empty. Deleted bookings will show up here.</p>
          </div>
        ) : (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Guest</th>
                    <th>Package</th>
                    <th>Check-in</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Deleted By</th>
                    <th>Deleted</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => (
                    <BinRow
                      key={b.id}
                      booking={b}
                      onRestore={requestRestore}
                      onPermanentDelete={requestPermanentDelete}
                      busy={busyId === b.id}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="rb-pagination">
                <button
                  type="button"
                  className="admin-back-btn"
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  disabled={page <= 1}
                >
                  ← Previous
                </button>
                <span className="rb-pagination__label">Page {page} of {totalPages}</span>
                <button
                  type="button"
                  className="admin-back-btn"
                  onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                  disabled={page >= totalPages}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Permanent-delete confirmation — the one truly irreversible action here */}
      {confirmTarget && (
        <div className="delete-confirm-overlay" style={{ position: 'fixed', zIndex: 1000 }}>
          <div className="delete-confirm-box">
            <div className="delete-confirm-icon">⚠️</div>
            <h3 className="delete-confirm-title">Permanently Delete This Booking?</h3>
            <p className="delete-confirm-msg">
              <strong>{confirmTarget.booking.booking_reference}</strong> ({confirmTarget.booking.guest_name}) will be
              erased completely, including its payment records. This cannot be undone — there is no further recovery
              after this step.
            </p>
            <div className="delete-confirm-actions">
              <button
                type="button"
                className="modal-cancel-btn"
                onClick={() => setConfirmTarget(null)}
                disabled={busyId === confirmTarget.booking.id}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-delete-confirm-btn"
                onClick={() => handlePermanentDelete(confirmTarget.booking)}
                disabled={busyId === confirmTarget.booking.id}
              >
                {busyId === confirmTarget.booking.id ? 'Deleting…' : 'Yes, Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast — same pattern as BookingManager */}
      {toast && (
        <div className={`admin-toast admin-toast--${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
