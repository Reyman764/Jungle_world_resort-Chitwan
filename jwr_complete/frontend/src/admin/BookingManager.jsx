import React, { useState, useEffect, useCallback, useRef, memo } from 'react'
import BookingDetail from './BookingDetail'
import QuickUpdateModal from './QuickUpdateModal'
import ReceiptModal from './ReceiptModal'
import './admin.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function authHeader() {
  const token = localStorage.getItem('token')
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

const StatusBadge = memo(function StatusBadge({ status }) {
  return <span className={`status-badge status-${status || 'draft'}`}>{status || 'draft'}</span>
})

const PayBadge = memo(function PayBadge({ status }) {
  return <span className={`status-badge pay-${status || 'pending'}`}>{status || 'pending'}</span>
})

// Quick filters that map to filter combos
const QUICK_FILTERS = [
  { label: 'All',             key: 'all',            status: '',            extra: {} },
  { label: '⚠ Pending Pay',  key: 'pending_pay',    status: 'confirmed',   extra: { paymentStatus: 'pending' } },
  { label: '✓ Confirmed',    key: 'confirmed',       status: 'confirmed',   extra: {} },
  { label: '🏕 Checked In',   key: 'checked_in',     status: 'checked_in',  extra: {} },
  { label: '✗ Cancelled',    key: 'cancelled',       status: 'cancelled',   extra: {} },
  { label: '⏳ Draft',        key: 'draft',           status: 'draft',       extra: {} },
]

export default function BookingManager({ onStatsRefresh, onAuthError }) {
  const [bookings, setBookings] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [selectedUpdateId, setSelectedUpdateId] = useState(null)
  const [receiptBookingId, setReceiptBookingId] = useState(null)
  const [toast, setToast] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [activeQuick, setActiveQuick] = useState('all')
  const [archiveMode, setArchiveMode] = useState(false)
  const abortRef = useRef(null) // cancel in-flight requests

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sort, setSort] = useState('latest')
  const [pageSize, setPageSize] = useState('20')
  const [applied, setApplied] = useState({})

  const buildFilters = useCallback(() => ({
    search, status, category, startDate, endDate, sort, pageSize,
    ...(archiveMode ? { archiveMode: 'true' } : {}),
  }), [search, status, category, startDate, endDate, sort, pageSize, archiveMode])

  const loadBookings = useCallback(async (filters = applied, pg = 1) => {
    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    try {
      const q = new URLSearchParams()
      if (filters.search)    q.set('search', filters.search)
      if (filters.status)    q.set('status', filters.status)
      if (filters.category)  q.set('category', filters.category)
      if (filters.startDate) q.set('startDate', filters.startDate)
      if (filters.endDate)   q.set('endDate', filters.endDate)
      if (filters.sort)      q.set('sort', filters.sort)
      if (filters.archiveMode) {
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - 90)
        q.set('endDate', q.get('endDate') || cutoff.toISOString().split('T')[0])
        if (!filters.status) q.set('status', 'checked_out')
      }
      q.set('limit', filters.pageSize || '20')
      q.set('page', String(pg))

      const res = await fetch(`${API}/api/admin?${q}`, {
        headers: authHeader(),
        signal: controller.signal,
      })
      const data = await res.json()

      if (res.ok) {
        setBookings(data.bookings || [])
        setTotal(data.total || 0)
        setPage(pg)
        setTotalPages(data.totalPages || data.total_pages || 1)
      } else if (res.status === 401 || res.status === 403) {
        onAuthError?.()
      }
    } catch (err) {
      if (err.name === 'AbortError') return // cancelled — ignore
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
    const f = buildFilters()
    setApplied(f)
    loadBookings(f, 1)
  }

  function handleClear() {
    setSearch(''); setStatus(''); setCategory(''); setStartDate(''); setEndDate('')
    setSort('latest'); setPageSize('20'); setActiveQuick('all'); setArchiveMode(false)
    const f = { search: '', status: '', category: '', startDate: '', endDate: '', sort: 'latest', pageSize: '20' }
    setApplied(f)
    loadBookings(f, 1)
  }

  function handleQuickFilter(qf) {
    setActiveQuick(qf.key)
    setStatus(qf.status)
    setArchiveMode(false)
    const f = { search, status: qf.status, category, startDate, endDate, sort, pageSize }
    setApplied(f)
    loadBookings(f, 1)
  }

  function handleArchiveToggle() {
    const next = !archiveMode
    setArchiveMode(next)
    setActiveQuick('all')
    setStatus('')
    const f = { search, status: '', category, startDate, endDate, sort, pageSize, archiveMode: next ? 'true' : '' }
    setApplied(f)
    loadBookings(f, 1)
  }

  async function handleExportCSV() {
    setExporting(true)
    try {
      const q = new URLSearchParams()
      if (applied.search)    q.set('search', applied.search)
      if (applied.status)    q.set('status', applied.status)
      if (applied.category)  q.set('category', applied.category)
      if (applied.startDate) q.set('startDate', applied.startDate)
      if (applied.endDate)   q.set('endDate', applied.endDate)
      if (applied.sort)      q.set('sort', applied.sort)

      const res = await fetch(`${API}/api/admin/export/csv?${q}`, {
        headers: { Authorization: authHeader().Authorization || '' },
      })

      if (!res.ok) { showToast('error', 'Export failed — please try again'); return }

      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      const cd   = res.headers.get('content-disposition') || ''
      const match = cd.match(/filename="([^"]+)"/)
      a.download = match ? match[1] : `jwr-bookings-${new Date().toISOString().split('T')[0]}.csv`
      a.href = url
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      showToast('success', `Exported ${total} bookings to CSV`)
    } catch {
      showToast('error', 'Export failed — network error')
    } finally {
      setExporting(false)
    }
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

  // Pagination range helper
  function getPageRange() {
    const range = []
    const delta = 2
    const left  = Math.max(1, page - delta)
    const right = Math.min(totalPages, page + delta)
    if (left > 1)          { range.push(1); if (left > 2) range.push('...') }
    for (let i = left; i <= right; i++) range.push(i)
    if (right < totalPages) { if (right < totalPages - 1) range.push('...'); range.push(totalPages) }
    return range
  }

  return (
    <>
      {/* ── Quick Filter Chips ─────────────────────────────────── */}
      <div className="quick-filters-row">
        {QUICK_FILTERS.map(qf => (
          <button
            key={qf.key}
            type="button"
            className={`quick-filter-chip${activeQuick === qf.key && !archiveMode ? ' active' : ''}`}
            onClick={() => handleQuickFilter(qf)}
          >
            {qf.label}
          </button>
        ))}
        <div className="quick-filters-spacer" />
        <button
          type="button"
          className={`quick-filter-chip archive-chip${archiveMode ? ' active' : ''}`}
          onClick={handleArchiveToggle}
          title="Show completed bookings older than 90 days"
        >
          📦 Archive
        </button>
      </div>

      {archiveMode && (
        <div className="archive-banner">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/>
            <line x1="10" y1="12" x2="14" y2="12"/>
          </svg>
          Archive view — showing completed bookings older than 90 days
          <button type="button" onClick={handleArchiveToggle} className="archive-banner-close">
            ✕ Exit archive
          </button>
        </div>
      )}

      {/* ── Filters Bar ───────────────────────────────────────── */}
      <div className="admin-filters">
        <div className="admin-filter-group grow">
          <label htmlFor="bm-search" className="admin-filter-label">Search</label>
          <input
            id="bm-search"
            type="text"
            className="admin-filter-input"
            placeholder="Guest name, email, or reference…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleApply()}
          />
        </div>
        <div className="admin-filter-group">
          <label htmlFor="bm-status" className="admin-filter-label">Status</label>
          <select id="bm-status" className="admin-filter-select" value={status} onChange={e => setStatus(e.target.value)}>
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
          <label htmlFor="bm-category" className="admin-filter-label">Category</label>
          <select id="bm-category" className="admin-filter-select" value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">All</option>
            <option value="foreigner">Foreigner</option>
            <option value="saarc">SAARC</option>
            <option value="nepali">Nepali</option>
          </select>
        </div>
        <div className="admin-filter-group">
          <label htmlFor="bm-from" className="admin-filter-label">From</label>
          <input id="bm-from" type="date" className="admin-filter-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="admin-filter-group">
          <label htmlFor="bm-to" className="admin-filter-label">To</label>
          <input id="bm-to" type="date" className="admin-filter-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <div className="admin-filter-group">
          <label htmlFor="bm-sort" className="admin-filter-label">Sort</label>
          <select id="bm-sort" className="admin-filter-select" value={sort} onChange={e => setSort(e.target.value)}>
            <option value="latest">Latest</option>
            <option value="oldest">Oldest</option>
            <option value="highest_value">Highest value</option>
            <option value="lowest_value">Lowest value</option>
          </select>
        </div>
        <div className="admin-filter-group">
          <label htmlFor="bm-perpage" className="admin-filter-label">Per page</label>
          <select id="bm-perpage" className="admin-filter-select" value={pageSize} onChange={e => setPageSize(e.target.value)}>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
        <button type="button" className="admin-filter-btn" onClick={handleApply}>Search</button>
        <button type="button" className="admin-clear-btn" onClick={handleClear}>Clear</button>
      </div>

      <div className="admin-table-wrap">
        <div className="admin-table-header">
          <div className="admin-table-header-left">
            <h3>
              {archiveMode ? '📦 Archive' : 'Bookings'}
            </h3>
            <span className="admin-table-count">{total} total</span>
          </div>
          <div className="admin-table-header-right">
            <button
              type="button"
              className="export-csv-btn"
              onClick={handleExportCSV}
              disabled={exporting || total === 0}
              title="Download filtered bookings as CSV"
            >
              {exporting ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                  </svg>
                  Exporting…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Export CSV
                </>
              )}
            </button>
          </div>
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
            <div className="admin-empty__icon">
              {archiveMode ? '📦' : '🔍'}
            </div>
            <div className="admin-empty__title">
              {archiveMode ? 'No archived bookings found' : 'No bookings found'}
            </div>
            <div className="admin-empty__sub">
              {archiveMode
                ? 'Bookings older than 90 days that are checked out will appear here.'
                : 'Try adjusting your search or filters.'}
            </div>
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
                      <button type="button" className="admin-update-btn" onClick={() => setSelectedUpdateId(b.id)}>Update</button>
                      {b.payment_status === 'completed' && (
                        <button type="button" className="admin-receipt-btn" onClick={() => setReceiptBookingId(b.id)}>
                          Receipt
                        </button>
                      )}
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

        {/* ── Pagination ──────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="admin-pagination">
            <span className="admin-pagination__info">
              Page {page} of {totalPages}
              <span className="admin-pagination__total"> · {total} bookings</span>
            </span>
            <div className="admin-pagination__btns">
              <button
                type="button"
                className="admin-pagination__btn"
                disabled={page <= 1}
                onClick={() => loadBookings(applied, 1)}
                title="First page"
              >«</button>
              <button
                type="button"
                className="admin-pagination__btn"
                disabled={page <= 1}
                onClick={() => loadBookings(applied, page - 1)}
              >← Prev</button>

              {getPageRange().map((p, i) =>
                p === '...' ? (
                  <span key={`ellipsis-${i}`} className="admin-pagination__ellipsis">…</span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    className={`admin-pagination__btn admin-pagination__page${p === page ? ' active' : ''}`}
                    onClick={() => loadBookings(applied, p)}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                type="button"
                className="admin-pagination__btn"
                disabled={page >= totalPages}
                onClick={() => loadBookings(applied, page + 1)}
              >Next →</button>
              <button
                type="button"
                className="admin-pagination__btn"
                disabled={page >= totalPages}
                onClick={() => loadBookings(applied, totalPages)}
                title="Last page"
              >»</button>
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

      {selectedUpdateId && (
        <QuickUpdateModal
          bookingId={selectedUpdateId}
          onClose={() => setSelectedUpdateId(null)}
          onUpdate={() => { loadBookings(applied, page); onStatsRefresh?.() }}
        />
      )}

      {receiptBookingId && (
        <ReceiptModal
          bookingId={receiptBookingId}
          onClose={() => setReceiptBookingId(null)}
        />
      )}

      {deleteTarget && (
        <div className="delete-confirm-overlay" style={{ position: 'fixed', zIndex: 1000 }}>
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
