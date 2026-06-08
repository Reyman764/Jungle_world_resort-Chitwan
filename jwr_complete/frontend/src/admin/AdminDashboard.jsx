import React, { useState, useEffect, useCallback } from 'react'
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

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="stat-card" style={{ '--stat-accent': accent }}>
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value">{value ?? '—'}</div>
      {sub && <div className="stat-card__sub">{sub}</div>}
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
                <label>{label}</label>
                <input
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
  const [activeTab, setActiveTab] = useState('bookings')

  const loadStats = useCallback(() => {
    fetch(`${API}/api/admin/stats`, { headers: authHeader() })
      .then(r => r.json())
      .then(d => { if (!d.error) setStats(d); else setStatsErr(d.error) })
      .catch(() => setStatsErr('Could not load stats'))
  }, [])

  useEffect(() => { loadStats() }, [loadStats])

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
              <div className="admin-stats-grid">
                <StatCard label="Total Bookings" value={stats?.total_bookings} sub="all time" accent="#1a4731" />
                <StatCard label="Pending (Draft)" value={stats?.pending_confirmations} sub="can be deleted" accent="#d97706" />
                <StatCard
                  label="Confirmed / Active"
                  value={stats ? Number(stats.confirmed_bookings) + Number(stats.checked_in) : undefined}
                  sub={stats ? `${stats.confirmed_bookings} confirmed · ${stats.checked_in} checked in` : ''}
                  accent="#16a34a"
                />
                <StatCard
                  label="Total Revenue"
                  value={stats ? `NPR ${Math.round(Number(stats.total_revenue)).toLocaleString()}` : undefined}
                  sub={stats ? `NPR ${Math.round(Number(stats.revenue_this_month)).toLocaleString()} this month` : ''}
                  accent="#2563eb"
                />
              </div>
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
            </div>
          </>
        )}
      </main>
    </div>
  )
}
