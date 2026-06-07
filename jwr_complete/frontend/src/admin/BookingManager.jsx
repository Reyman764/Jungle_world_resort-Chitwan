import React, { useState, useEffect, useCallback } from 'react'
import BookingDetail from './BookingDetail'
import './admin.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function authHeader() {
  const token = localStorage.getItem('token')
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

function StatusBadge({ status }) {
  return <span className={`status-badge status-${status || 'draft'}`}>{status || 'draft'}</span>
}

function PayBadge({ status }) {
  return <span className={`status-badge pay-${status || 'pending'}`}>{status || 'pending'}</span>
}

export default function BookingManager({ onStatsRefresh, onAuthError }) {
  const [bookings, setBookings] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [toast, setToast] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sort, setSort] = useState('latest')
  const [pageSize, setPageSize] = useState('20')
  const [applied, setApplied] = useState({})

  const loadBookings = useCallback(async (filters = applied, pg = 1) => {
    setLoading(true)
    try {
      const q = new URLSearchParams()
      if (filters.search) q.set('search', filters.search)
      if (filters.status) q.set('status', filters.status)
      if (filters.category) q.set('category', filters.category)
      if (filters.startDate) q.set('startDate', filters.startDate)
      if (filters.endDate) q.set('endDate', filters.endDate)
      if (filters.sort) q.set('sort', filters.sort)
      q.set('limit', filters.pageSize || '20')
      q.set('page', String(pg))

      const res = await fetch(`${API}/api/admin?${q}`, { headers: authHeader() })
      const data = await res.json()

      if (res.ok) {
        setBookings(data.bookings || [])
        setTotal(data.total || 0)
        setPage(pg)
        setTotalPages(data.totalPages || data.total_pages || 1)
      } else if (res.status === 401 || res.status === 403) {
        onAuthError?.()
      }
    } finally {
      setLoading(false)
    }
  }, [applied, onAuthError])

  useEffect(() => {
    const initial = { search: '', status: '', category: '', startDate: '', endDate: '', sort: 'latest', pageSize: '20' }
    setApplied(initial)
    loadBookings(initial, 1)
  }, [])

  function showToast(type, msg) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  function handleApply() {
    const f = { search, status, category, startDate, endDate, sort, pageSize }
    setApplied(f)
    loadBookings(f, 1)
  }

  function handleClear() {
    setSearch(''); setStatus(''); setCategory(''); setStartDate(''); setEndDate('')
    setSort('latest'); setPageSize('20')
    const f = { search: '', status: '', category: '', startDate: '', endDate: '', sort: 'latest', pageSize: '20' }
    setApplied(f)
    loadBookings(f, 1)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`${API}/api/admin/bookings/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: authHeader(),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        setBookings(prev => prev.filter(b => b.id !== deleteTarget.id))
        setTotal(prev => Math.max(prev - 1, 0))
        showToast('success', data.message || 'Booking deleted')
        onStatsRefresh?.()
      } else {
        showToast('error', data.error || 'Could not delete booking')
      }
    } catch {
      showToast('error', 'Network error — try again')
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  return (
    <>
      <div className="admin-filters">
        <div className="admin-filter-group grow">
          <label className="admin-filter-label">Search</label>
          <input
            type="text"
            className="admin-filter-input"
            placeholder="Guest name, email, or reference…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleApply()}
          />
        </div>
        <div className="admin-filter-group">
          <label className="admin-filter-label">Status</label>
          <select className="admin-filter-select" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="confirmed">Confirmed</option>
            <option value="checked_in">Checked In</option>
            <option value="checked_out">Checked Out</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>
        </div>
        <div className="admin-filter-group">
          <label className="admin-filter-label">Category</label>
          <select className="admin-filter-select" value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">All</option>
            <option value="foreigner">Foreigner</option>
            <option value="saarc">SAARC</option>
            <option value="nepali">Nepali</option>
          </select>
        </div>
        <div className="admin-filter-group">
          <label className="admin-filter-label">From</label>
          <input type="date" className="admin-filter-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="admin-filter-group">
          <label className="admin-filter-label">To</label>
          <input type="date" className="admin-filter-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <div className="admin-filter-group">
          <label className="admin-filter-label">Sort</label>
          <select className="admin-filter-select" value={sort} onChange={e => setSort(e.target.value)}>
            <option value="latest">Latest</option>
            <option value="oldest">Oldest</option>
            <option value="highest_value">Highest value</option>
            <option value="lowest_value">Lowest value</option>
          </select>
        </div>
        <div className="admin-filter-group">
          <label className="admin-filter-label">Per page</label>
          <select className="admin-filter-select" value={pageSize} onChange={e => setPageSize(e.target.value)}>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>
        <button type="button" className="admin-filter-btn" onClick={handleApply}>Search</button>
        <button type="button" className="admin-clear-btn" onClick={handleClear}>Clear</button>
      </div>

      <div className="admin-table-wrap">
        <div className="admin-table-header">
          <h3>Bookings</h3>
          <span className="admin-table-count">{total} total</span>
        </div>

        {toast && (
          <div className={`admin-toast admin-toast--${toast.type}`} style={{ margin: '0 16px 12px' }}>
            {toast.msg}
          </div>
        )}

        {loading ? (
          <div className="admin-loading"><div className="admin-spinner" /><p>Loading…</p></div>
        ) : bookings.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty__title">No bookings found</div>
          </div>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Guest</th>
                  <th>Package</th>
                  <th>Check-in</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b.id} className={b.is_spam ? 'admin-table-row--spam' : ''}>
                    <td><strong>{b.booking_reference}</strong></td>
                    <td className="guest-name">{b.guest_name}</td>
                    <td>{b.package?.name || '—'}</td>
                    <td>{b.check_in_date}</td>
                    <td><StatusBadge status={b.status} /></td>
                    <td><PayBadge status={b.payment_status} /></td>
                    <td className="amount">NPR {Math.round(Number(b.total_price || 0)).toLocaleString()}</td>
                    <td className="admin-table-actions">
                      <button type="button" className="admin-view-btn" onClick={() => setSelectedId(b.id)}>View</button>
                      {b.status === 'draft' && (
                        <button
                          type="button"
                          className="admin-delete-btn"
                          onClick={() => setDeleteTarget(b)}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > parseInt(applied.pageSize || 20, 10) && (
          <div className="admin-pagination">
            <span className="admin-pagination__info">Page {page} of {totalPages}</span>
            <div className="admin-pagination__btns">
              <button type="button" className="admin-pagination__btn" disabled={page <= 1} onClick={() => loadBookings(applied, page - 1)}>← Prev</button>
              <button type="button" className="admin-pagination__btn" disabled={page >= totalPages} onClick={() => loadBookings(applied, page + 1)}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {selectedId && (
        <BookingDetail
          bookingId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdate={() => { loadBookings(applied, page); onStatsRefresh?.() }}
        />
      )}

      {deleteTarget && (
        <div className="delete-confirm-overlay">
          <div className="delete-confirm-box">
            <div className="delete-confirm-icon">🗑️</div>
            <h3 className="delete-confirm-title">Delete Draft Booking?</h3>
            <p className="delete-confirm-msg">
              Permanently remove <strong>{deleteTarget.booking_reference}</strong> ({deleteTarget.guest_name})?
              This cannot be undone.
            </p>
            <div className="delete-confirm-actions">
              <button type="button" className="modal-cancel-btn" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button>
              <button type="button" className="modal-delete-confirm-btn" onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
