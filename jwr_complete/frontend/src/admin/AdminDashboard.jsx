import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import './admin.css'
import BookingDetail from './BookingDetail'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function authHeader() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function StatusBadge({ status }) {
  const cls = `status-badge status-${status?.replace(/ /g, '_') || 'draft'}`
  return <span className={cls}>{status || 'draft'}</span>
}

function StatCard({ label, value, sub, icon, accent }) {
  return (
    <div className="stat-card" style={{ '--stat-accent': accent || 'var(--gold-rich)' }}>
      <span className="stat-card__icon">{icon}</span>
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value">{value}</div>
      {sub && <div className="stat-card__sub">{sub}</div>}
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} } })()

  const [stats,    setStats]    = useState(null)
  const [bookings, setBookings] = useState([])
  const [total,    setTotal]    = useState(0)
  const [page,     setPage]     = useState(1)
  const [loading,  setLoading]  = useState(true)
  const [statsErr, setStatsErr] = useState('')

  // Filters
  const [search,    setSearch]    = useState('')
  const [status,    setStatus]    = useState('')
  const [category,  setCategory]  = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate,   setEndDate]   = useState('')
  const [applied,   setApplied]   = useState({})

  // Modal
  const [selectedId, setSelectedId] = useState(null)

  // ── Load stats ──────────────────────────────────────────
  useEffect(() => {
fetch(`${API}/api/admin/stats`, { headers: authHeader() })     
      .then(r => r.json())
      .then(d => { if (!d.error) setStats(d); else setStatsErr(d.error) })
      .catch(() => setStatsErr('Could not load stats'))
  }, [])

  // ── Load bookings ────────────────────────────────────────
  const loadBookings = useCallback(async (filters = applied, pg = 1) => {
    setLoading(true)
    try {
      const q = new URLSearchParams()
      if (filters.status)    q.set('status',    filters.status)
      if (filters.category)  q.set('category',  filters.category)
      if (filters.startDate) q.set('startDate', filters.startDate)
      if (filters.endDate)   q.set('endDate',   filters.endDate)
      if (filters.search)    q.set('search',    filters.search)
      q.set('page', pg)

const res  = await fetch(`${API}/api/admin?${q}`, { headers: authHeader() }) 
      const data = await res.json()

      if (res.ok) {
        setBookings(data.bookings || [])
        setTotal(data.total || 0)
        setPage(pg)
      } else if (res.status === 401 || res.status === 403) {
        handleLogout()
      }
    } finally {
      setLoading(false)
    }
  }, [applied])

  useEffect(() => { loadBookings({}, 1) }, [])

  function handleApply() {
    const f = { search, status, category, startDate, endDate }
    setApplied(f)
    loadBookings(f, 1)
  }

  function handleClear() {
    setSearch(''); setStatus(''); setCategory(''); setStartDate(''); setEndDate('')
    const f = {}
    setApplied(f)
    loadBookings(f, 1)
  }

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/staff-login')
  }

  const totalPages = Math.ceil(total / 50)

  return (
    <div className="admin-shell">

      {/* Top bar */}
      <header className="admin-topbar">
        <div className="admin-topbar__brand">
          <span className="admin-topbar__logo">Jungle World Resort</span>
          <span className="admin-topbar__badge">Admin</span>
        </div>
        <div className="admin-topbar__right">
          <span className="admin-topbar__user">
            Logged in as <strong>{user.first_name || user.email}</strong>
            {user.role && <> · {user.role}</>}
          </span>
          <button className="admin-logout-btn" onClick={handleLogout}>
            <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
              <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Logout
          </button>
        </div>
      </header>

      <main className="admin-content">
        <h1 className="admin-page-title">Dashboard</h1>
        <p className="admin-page-sub">BOOKING MANAGEMENT · JUNGLE WORLD RESORT, CHITWAN</p>

        {/* Stats */}
        {statsErr ? (
          <p className="text-muted" style={{ marginBottom: 24 }}>{statsErr}</p>
        ) : (
          <div className="admin-stats-grid">
            <StatCard
              label="Total Bookings"
              value={stats ? stats.total_bookings : '—'}
              sub="all time"
              icon="📋"
              accent="#c8973a"
            />
            <StatCard
              label="Pending Confirmation"
              value={stats ? stats.pending_confirmations : '—'}
              sub="require action"
              icon="⏳"
              accent="#fbbf24"
            />
            <StatCard
              label="Confirmed / Active"
              value={stats ? (Number(stats.confirmed_bookings) + Number(stats.checked_in)) : '—'}
              sub={stats ? `${stats.confirmed_bookings} confirmed · ${stats.checked_in} checked in` : ''}
              icon="✅"
              accent="#4ade80"
            />
            <StatCard
              label="Total Revenue"
              value={stats ? `$${Number(stats.total_revenue).toLocaleString()}` : '—'}
              sub={stats ? `$${Number(stats.revenue_this_month).toLocaleString()} this month` : ''}
              icon="💰"
              accent="#a8d8a0"
            />
          </div>
        )}

        {/* Filters */}
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
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="confirmed">Confirmed</option>
              <option value="checked_in">Checked In</option>
              <option value="checked_out">Checked Out</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
          </div>

          <div className="admin-filter-group">
            <label className="admin-filter-label">Guest Category</label>
            <select className="admin-filter-select" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">All categories</option>
              <option value="foreigner">Foreigner</option>
              <option value="saarc">SAARC</option>
              <option value="nepali">Nepali</option>
            </select>
          </div>

          <div className="admin-filter-group">
            <label className="admin-filter-label">Check-in From</label>
            <input type="date" className="admin-filter-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>

          <div className="admin-filter-group">
            <label className="admin-filter-label">Check-in To</label>
            <input type="date" className="admin-filter-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>

          <button className="admin-filter-btn" onClick={handleApply}>
            <svg viewBox="0 0 16 16" fill="none" width="12" height="12">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Search
          </button>

          <button className="admin-clear-btn" onClick={handleClear}>Clear</button>
        </div>

        {/* Table */}
        <div className="admin-table-wrap">
          <div className="admin-table-header">
            <h3>Bookings</h3>
            <span className="admin-table-count">{total} total</span>
          </div>

          {loading ? (
            <div className="admin-loading">
              <div className="admin-spinner" />
              <p>Loading bookings…</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="admin-empty">
              <div className="admin-empty__icon">🌿</div>
              <div className="admin-empty__title">No bookings found</div>
              <div className="admin-empty__sub">Try adjusting your filters or create a test booking via the main site.</div>
            </div>
          ) : (
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Guest Name</th>
                    <th>Package</th>
                    <th>Check-in</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.id} onClick={() => setSelectedId(b.id)}>
                      <td>{b.booking_reference}</td>
                      <td className="guest-name">{b.guest_name}</td>
                      <td>{b.package?.name || '—'}</td>
                      <td>{b.check_in_date}</td>
                      <td style={{ textTransform: 'capitalize' }}>{b.guest_category}</td>
                      <td><StatusBadge status={b.status} /></td>
                      <td className="amount">${Number(b.total_price || 0).toFixed(2)}</td>
                      <td>
                        <button
                          className="admin-view-btn"
                          onClick={e => { e.stopPropagation(); setSelectedId(b.id) }}
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {total > 50 && (
            <div className="admin-pagination">
              <span className="admin-pagination__info">
                Page {page} of {totalPages} · {total} bookings
              </span>
              <div className="admin-pagination__btns">
                <button
                  className="admin-pagination__btn"
                  disabled={page <= 1}
                  onClick={() => loadBookings(applied, page - 1)}
                >← Prev</button>
                <button
                  className="admin-pagination__btn"
                  disabled={page >= totalPages}
                  onClick={() => loadBookings(applied, page + 1)}
                >Next →</button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Booking Detail Modal */}
      {selectedId && (
        <BookingDetail
          bookingId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdate={() => loadBookings(applied, page)}
        />
      )}
    </div>
  )
}
