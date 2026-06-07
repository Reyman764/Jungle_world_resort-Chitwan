import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import './admin.css'
import BookingManager from './BookingManager'
import PackageManager from './PackageManager'
import GalleryManager from './GalleryManager'
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
    <div style={{ maxWidth: 440, margin: '0 auto', padding: '24px 0' }}>
      <h2 style={{ color: 'var(--a-text)', fontSize: '1.15rem', marginBottom: 6, fontWeight: 600 }}>
        Change My Password
      </h2>
      <p style={{ color: 'var(--a-text-4)', fontSize: '0.82rem', marginBottom: 28 }}>
        After changing your password you will be logged out and must sign in again.
      </p>

      {error   && <div className="sm-alert sm-alert--error"   style={{ marginBottom: 18 }}>{error}</div>}
      {success && <div className="sm-alert sm-alert--success" style={{ marginBottom: 18 }}>{success}</div>}

      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[
          { name: 'oldPassword', label: 'Current Password',     placeholder: '••••••••' },
          { name: 'newPassword', label: 'New Password',         placeholder: 'Min. 8 characters' },
          { name: 'confirm',     label: 'Confirm New Password', placeholder: 'Repeat new password' },
        ].map(({ name, label, placeholder }) => (
          <div key={name}>
            <label style={{
              display: 'block', fontSize: 11, fontWeight: 600,
              color: 'var(--a-text-3)', marginBottom: 6,
              textTransform: 'uppercase', letterSpacing: '.05em',
            }}>
              {label}
            </label>
            <input
              type="password"
              placeholder={placeholder}
              value={form[name]}
              onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
              required
              style={{
                width: '100%', padding: '10px 14px',
                background: 'var(--a-surface)',
                border: '1px solid var(--a-border)',
                borderRadius: 9,
                color: 'var(--a-text)',
                fontSize: 14, boxSizing: 'border-box', outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>
        ))}

        <button
          type="submit"
          disabled={loading || !!success}
          style={{
            marginTop: 8, padding: '11px 0',
            background: 'var(--a-green)',
            color: '#fff', border: 'none', borderRadius: 9,
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            opacity: loading ? .6 : 1, transition: 'opacity .2s',
          }}
        >
          {loading ? 'Saving…' : 'Update Password'}
        </button>
      </form>
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
