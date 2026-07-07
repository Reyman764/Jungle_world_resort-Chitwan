import React, { useState, useEffect, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import './admin.css'
import BookingManager from './BookingManager'
import PackageManager from './PackageManager'
import GalleryManager from './GalleryManager'
import OfferManager from './OfferManager'
import StaffManagement from './StaffManagement'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function authHeader() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const StatCard = memo(function StatCard({ label, value, sub, accent, icon }) {
  return (
    <div className="stat-card" style={{ '--stat-accent': accent }}>
      {icon && <div className="stat-card__icon">{icon}</div>}
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value">{value ?? '—'}</div>
      {sub && <div className="stat-card__sub">{sub}</div>}
    </div>
  )
})

// ── Monthly Trend Chart (pure SVG, no deps) ───────────────────────
function TrendChart({ data }) {
  const [hovered, setHovered] = useState(null)
  const [activeMetric, setActiveMetric] = useState('bookings') // 'bookings' | 'revenue'

  if (!data || data.length === 0) return null

  const W = 780
  const H = 160
  const PAD = { top: 16, right: 20, bottom: 36, left: 52 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const values = data.map(d => activeMetric === 'bookings' ? d.bookings : d.revenue)
  const maxVal = Math.max(...values, 1)
  const minVal = 0

  const xStep = chartW / Math.max(data.length - 1, 1)

  const toY = v => PAD.top + chartH - ((v - minVal) / (maxVal - minVal)) * chartH
  const toX = i => PAD.left + i * xStep

  // Build SVG path
  const points = data.map((d, i) => `${toX(i)},${toY(values[i])}`)
  const linePath = `M${points.join(' L')}`
  const areaPath = `M${PAD.left},${PAD.top + chartH} L${points.join(' L')} L${toX(data.length - 1)},${PAD.top + chartH} Z`

  // Y-axis labels
  const ySteps = 4
  const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => {
    const v = (maxVal / ySteps) * i
    return {
      y: toY(v),
      label: activeMetric === 'revenue'
        ? (v >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v)))
        : String(Math.round(v)),
    }
  })

  const accentColor = activeMetric === 'bookings' ? '#1a4731' : '#2563eb'
  const areaColor   = activeMetric === 'bookings' ? 'rgba(26,71,49,0.08)' : 'rgba(37,99,235,0.08)'

  return (
    <div className="trend-chart-wrap">
      <div className="trend-chart-header">
        <div>
          <h3 className="trend-chart-title">Booking Trend</h3>
          <p className="trend-chart-sub">Last 12 months (confirmed + paid bookings)</p>
        </div>
        <div className="trend-metric-toggle">
          <button
            type="button"
            className={`trend-toggle-btn${activeMetric === 'bookings' ? ' active' : ''}`}
            onClick={() => setActiveMetric('bookings')}
          >
            Bookings
          </button>
          <button
            type="button"
            className={`trend-toggle-btn${activeMetric === 'revenue' ? ' active' : ''}`}
            onClick={() => setActiveMetric('revenue')}
          >
            Revenue
          </button>
        </div>
      </div>

      <div className="trend-chart-svg-wrap">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="chartArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={accentColor} stopOpacity="0.18" />
              <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {yLabels.map((yl, i) => (
            <line
              key={i}
              x1={PAD.left} y1={yl.y}
              x2={PAD.left + chartW} y2={yl.y}
              stroke="#e2e6ed" strokeWidth="1"
            />
          ))}

          {/* Area fill */}
          <path d={areaPath} fill="url(#chartArea)" />

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke={accentColor}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Y-axis labels */}
          {yLabels.map((yl, i) => (
            <text
              key={i}
              x={PAD.left - 8}
              y={yl.y + 4}
              textAnchor="end"
              fontSize="10"
              fill="#637068"
              fontFamily="Raleway, sans-serif"
            >
              {yl.label}
            </text>
          ))}

          {/* X-axis labels */}
          {data.map((d, i) => {
            const showEvery = data.length > 8 ? 2 : 1
            if (i % showEvery !== 0 && i !== data.length - 1) return null
            return (
              <text
                key={i}
                x={toX(i)}
                y={H - 4}
                textAnchor="middle"
                fontSize="10"
                fill="#637068"
                fontFamily="Raleway, sans-serif"
              >
                {d.label}
              </text>
            )
          })}

          {/* Hover dots + tooltips */}
          {data.map((d, i) => {
            const x = toX(i)
            const y = toY(values[i])
            const isHovered = hovered === i
            return (
              <g key={i}>
                <rect
                  x={x - 16}
                  y={PAD.top - 4}
                  width={32}
                  height={chartH + 8}
                  fill="transparent"
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: 'crosshair' }}
                />
                <circle
                  cx={x} cy={y}
                  r={isHovered ? 5 : 3}
                  fill={accentColor}
                  stroke="white"
                  strokeWidth="2"
                  style={{ transition: 'r 0.12s' }}
                />
                {isHovered && (
                  <g>
                    <rect
                      x={Math.min(Math.max(x - 48, PAD.left), PAD.left + chartW - 96)}
                      y={y - 34}
                      width={96}
                      height={28}
                      rx={6}
                      fill="#0e1a10"
                      opacity="0.92"
                    />
                    <text
                      x={Math.min(Math.max(x, PAD.left + 48), PAD.left + chartW - 48)}
                      y={y - 22}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#fff"
                      fontFamily="Raleway, sans-serif"
                      fontWeight="700"
                    >
                      {d.label}
                    </text>
                    <text
                      x={Math.min(Math.max(x, PAD.left + 48), PAD.left + chartW - 48)}
                      y={y - 11}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#86efac"
                      fontFamily="Raleway, sans-serif"
                    >
                      {activeMetric === 'revenue'
                        ? `NPR ${values[i].toLocaleString()}`
                        : `${values[i]} booking${values[i] !== 1 ? 's' : ''}`}
                    </text>
                  </g>
                )}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

// ── Change My Password ─────────────────────────────────────────
function ChangeMyPassword() {
  const navigate = useNavigate()
  const [form,    setForm]    = useState({ oldPassword: '', newPassword: '', confirm: '' })
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (form.newPassword.length < 8) { setError('New password must be at least 8 characters.'); return }
    if (form.newPassword !== form.confirm) { setError('Passwords do not match.'); return }

    setLoading(true)
    try {
      const res  = await fetch(`${API}/api/staff/auth/change-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body:    JSON.stringify({ oldPassword: form.oldPassword, newPassword: form.newPassword }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Could not change password.'); return }

      setSuccess('Password changed successfully. You will be logged out.')
      setTimeout(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.removeItem('staffToken')
        localStorage.removeItem('staffUser')
        navigate('/staff/login')
      }, 2200)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pwd-panel">
      <div className="pwd-panel__header">
        <div className="pwd-panel__icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <h2 className="pwd-panel__title">Change My Password</h2>
      </div>
      <p className="pwd-panel__subtitle">
        After changing your password you will be signed out and must log in again.
      </p>

      {error   && <div className="sm-alert sm-alert--error"   style={{ marginBottom: 20 }}>{error}</div>}
      {success && <div className="sm-alert sm-alert--success" style={{ marginBottom: 20 }}>{success}</div>}

      <div className="pwd-panel__card">
        <form onSubmit={handleSubmit} noValidate>
          <div className="pwd-panel__fields">
            {[
              { name: 'oldPassword', label: 'Current Password',     placeholder: '••••••••' },
              { name: 'newPassword', label: 'New Password',         placeholder: 'Minimum 8 characters' },
              { name: 'confirm',     label: 'Confirm New Password', placeholder: 'Repeat new password' },
            ].map(({ name, label, placeholder }) => (
              <div className="pwd-panel__field" key={name}>
                <label htmlFor={`pwd-${name}`}>{label}</label>
                <input
                  id={`pwd-${name}`}
                  type="password"
                  className="pwd-panel__input"
                  placeholder={placeholder}
                  value={form[name]}
                  onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
                  required
                />
              </div>
            ))}
          </div>

          <div className="pwd-panel__divider" />

          <div className="pwd-panel__footer">
            <button
              type="submit"
              className="pwd-panel__submit"
              disabled={loading || !!success}
            >
              {loading ? 'Saving…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      <div className="pwd-panel__hint">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        Use a strong password with letters, numbers, and symbols. Never share it with others.
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} } })()

  const [stats, setStats] = useState(null)
  const [statsErr, setStatsErr] = useState('')
  const [trend, setTrend] = useState(null)
  const [activeTab, setActiveTab] = useState('bookings')

  const loadStats = useCallback(() => {
    fetch(`${API}/api/admin/stats`, { headers: authHeader() })
      .then(r => r.json())
      .then(d => { if (!d.error) setStats(d); else setStatsErr(d.error) })
      .catch(() => setStatsErr('Could not load stats'))
  }, [])

  const loadTrend = useCallback(() => {
    fetch(`${API}/api/admin/stats/monthly`, { headers: authHeader() })
      .then(r => r.json())
      .then(d => { if (d.trend) setTrend(d.trend) })
      .catch(() => {}) // non-critical
  }, [])

  useEffect(() => {
    loadStats()
    loadTrend()
  }, [loadStats, loadTrend])

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/staff/login')
  }

  return (
    <div className="admin-shell">
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
          <a href="/" className="admin-view-site-btn">View Website</a>
          <button type="button" className="admin-logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main className="admin-content">
        <h1 className="admin-page-title">Dashboard</h1>
        <p className="admin-page-sub">BOOKING MANAGEMENT · JUNGLE WORLD RESORT, CHITWAN</p>

        <div className="admin-tabs">
          <button type="button" className={`admin-tab${activeTab === 'bookings' ? ' admin-tab--active' : ''}`} onClick={() => setActiveTab('bookings')}>
            Bookings
          </button>
          {(user.role === 'admin' || user.role === 'manager') && (
            <button type="button" className={`admin-tab${activeTab === 'packages' ? ' admin-tab--active' : ''}`} onClick={() => setActiveTab('packages')}>
              Packages &amp; Pricing
            </button>
          )}
          {user.role === 'admin' && (
            <button type="button" className={`admin-tab${activeTab === 'gallery' ? ' admin-tab--active' : ''}`} onClick={() => setActiveTab('gallery')}>
              Gallery
            </button>
          )}
          {user.role === 'admin' && (
            <button type="button" className={`admin-tab${activeTab === 'offers' ? ' admin-tab--active' : ''}`} onClick={() => setActiveTab('offers')}>
              Offers
            </button>
          )}
          {(user.role === 'admin' || user.role === 'manager') && (
            <button type="button" className={`admin-tab${activeTab === 'staff' ? ' admin-tab--active' : ''}`} onClick={() => setActiveTab('staff')}>
              Staff
            </button>
          )}
          <button type="button" className={`admin-tab${activeTab === 'password' ? ' admin-tab--active' : ''}`} onClick={() => setActiveTab('password')}>
            My Password
          </button>
        </div>

        {activeTab === 'gallery' ? (
          <GalleryManager />
        ) : activeTab === 'offers' ? (
          <OfferManager />
        ) : activeTab === 'packages' ? (
          <PackageManager />
        ) : activeTab === 'staff' ? (
          <StaffManagement />
        ) : activeTab === 'password' ? (
          <ChangeMyPassword />
        ) : (
          <>
            {statsErr ? (
              <p className="text-muted" style={{ marginBottom: 24 }}>{statsErr}</p>
            ) : (
              <>
                <div className="admin-stats-grid">
                  <StatCard label="Total Bookings" value={stats?.total_bookings} sub="all time" accent="#1a4731" icon="📋" />
                  <StatCard label="Pending (Draft)" value={stats?.pending_confirmations} sub="can be deleted" accent="#d97706" icon="⏳" />
                  <StatCard
                    label="Confirmed / Active"
                    value={stats ? Number(stats.confirmed_bookings) + Number(stats.checked_in) : undefined}
                    sub={stats ? `${stats.confirmed_bookings} confirmed · ${stats.checked_in} checked in` : ''}
                    accent="#16a34a"
                    icon="✓"
                  />
                  <StatCard
                    label="Total Revenue"
                    value={stats ? `NPR ${Math.round(Number(stats.total_revenue)).toLocaleString()}` : undefined}
                    sub={stats ? `NPR ${Math.round(Number(stats.revenue_this_month)).toLocaleString()} this month` : ''}
                    accent="#2563eb"
                    icon="₨"
                  />
                </div>

                {trend && trend.length > 0 && <TrendChart data={trend} />}
              </>
            )}

            <BookingManager onStatsRefresh={loadStats} onAuthError={handleLogout} />

            <div className="admin-footer-actions">
              <button
                type="button"
                className="admin-audit-link-btn"
                onClick={() => navigate('/admin/audit-logs')}
              >
                View Activity Log →
              </button>
              {user.role === 'admin' && (
                <button
                  type="button"
                  className="admin-audit-link-btn admin-recyclebin-link-btn"
                  onClick={() => navigate('/admin/recycle-bin')}
                >
                  🗑️ Recycle Bin →
                </button>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
