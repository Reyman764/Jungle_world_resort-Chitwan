import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import './StaffLogin.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// ── Force-change-password modal shown on first login ──────────
function ChangePasswordModal({ token, onSuccess }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [error,       setError]       = useState('')
  const [loading,     setLoading]     = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (newPassword !== confirm)  { setError('Passwords do not match.'); return }

    setLoading(true)
    try {
      const res  = await fetch(`${API}/api/staff/auth/force-change-password`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not change password. Please try again.')
        return
      }
      onSuccess()
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="sl-overlay">
      <div className="sl-change-modal">
        <div className="sl-change-modal__icon">
          <svg viewBox="0 0 24 24" fill="none" width="32" height="32">
            <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z" stroke="var(--gold-rich)" strokeWidth="1.3"/>
            <path d="M12 8v4l3 3" stroke="var(--gold-rich)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <h2 className="sl-change-modal__title">Set Your Password</h2>
        <p className="sl-change-modal__sub">
          You are logging in with a temporary password. Please set a new secure password to continue.
        </p>
        {error && <div className="staff-login-error" role="alert">{error}</div>}
        <form onSubmit={handleSubmit} noValidate>
          <div className="staff-form-group">
            <label className="staff-form-label" htmlFor="np">New Password</label>
            <input
              id="np" type="password" className="staff-form-input"
              placeholder="Minimum 8 characters"
              value={newPassword} onChange={e => setNewPassword(e.target.value)}
              autoFocus required
            />
          </div>
          <div className="staff-form-group">
            <label className="staff-form-label" htmlFor="cp">Confirm Password</label>
            <input
              id="cp" type="password" className="staff-form-input"
              placeholder="Repeat password"
              value={confirm} onChange={e => setConfirm(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="staff-login-btn" disabled={loading || !newPassword || !confirm}>
            {loading ? <><span className="btn-spinner" /> Saving…</> : 'Set Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function StaffLogin() {
  const navigate = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  // Force-change state: set after login when must_change_password is true
  const [forceChange, setForceChange] = useState(null) // null | { token }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res  = await fetch(`${API}/api/staff/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login failed. Please check your credentials.')
        return
      }

      const token = data.access_token || data.token
      const user  = data.staff || data.user

      if (!token || !user) {
        setError('Unexpected server response. Please try again.')
        return
      }

      const validRoles = ['admin', 'manager', 'staff']
      if (!validRoles.includes(user.role)) {
        setError('Access denied. This portal is for resort staff only.')
        return
      }

      // Store credentials
      localStorage.setItem('token',      token)
      localStorage.setItem('user',       JSON.stringify(user))
      localStorage.setItem('staffToken', token)
      localStorage.setItem('staffUser',  JSON.stringify(user))

      // If admin flagged this as a temporary password, force change first
      if (data.must_change_password || user.must_change_password) {
        setForceChange({ token })
        return
      }

      navigate('/admin/dashboard')

    } catch {
      setError('Unable to connect to the server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handlePasswordChanged() {
    // Update local user record to clear the flag
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      user.must_change_password = false
      localStorage.setItem('user', JSON.stringify(user))
    } catch { /* ignore */ }
    navigate('/admin/dashboard')
  }

  return (
    <>
      {forceChange && (
        <ChangePasswordModal
          token={forceChange.token}
          onSuccess={handlePasswordChanged}
        />
      )}

      <div className="staff-login-page">
        <div className="staff-login-card">

          {/* Brand */}
          <div className="staff-login-brand">
            <div className="staff-login-logo">
              <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" width="44" height="44">
                <circle cx="28" cy="28" r="26.5" stroke="var(--gold-rich)" strokeWidth="1.2" fill="none"/>
                <circle cx="28" cy="28" r="24" fill="var(--forest-deep)"/>
                <ellipse cx="18" cy="26" rx="9" ry="12" fill="var(--forest-light)" opacity="0.75"/>
                <ellipse cx="38" cy="26" rx="9" ry="12" fill="var(--forest-light)" opacity="0.75"/>
                <ellipse cx="28" cy="22" rx="7.5" ry="13" fill="var(--forest-pale)" opacity="0.9"/>
                <rect x="16" y="36" width="4" height="8" rx="1" fill="var(--forest-mid)" opacity="0.7"/>
                <rect x="36" y="36" width="4" height="8" rx="1" fill="var(--forest-mid)" opacity="0.7"/>
                <rect x="26" y="33" width="4" height="11" rx="1" fill="var(--forest-mid)"/>
                <path d="M10 42 Q28 38 46 42" stroke="var(--gold-rich)" strokeWidth="1" fill="none" opacity="0.6"/>
                <circle cx="28" cy="11" r="3" fill="var(--gold-rich)" opacity="0.85"/>
              </svg>
            </div>
            <div>
              <div className="staff-login-name">Jungle World Resort</div>
              <div className="staff-login-sub">Staff Portal · Chitwan</div>
            </div>
          </div>

          {/* Form */}
          <form className="staff-login-form" onSubmit={handleSubmit} noValidate>

            {error && (
              <div className="staff-login-error" role="alert">
                <svg viewBox="0 0 16 16" fill="none" width="15" height="15" style={{ flexShrink: 0 }}>
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {error}
              </div>
            )}

            <div className="staff-form-group">
              <label className="staff-form-label" htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                className="staff-form-input"
                placeholder="you@jungleworldresort.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="staff-form-group">
              <label className="staff-form-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="staff-form-input"
                placeholder="••••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {/* Forgot password */}
            <div style={{ textAlign: 'right', marginTop: '-6px' }}>
              <Link
                to="/staff/forgot-password"
                style={{ fontSize: '11px', color: 'rgba(200,151,58,0.6)', textDecoration: 'none' }}
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              className="staff-login-btn"
              disabled={loading || !email || !password}
            >
              {loading ? (
                <>
                  <span className="btn-spinner" />
                  Authenticating…
                </>
              ) : (
                <>
                  <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                    <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  Sign In to Dashboard
                </>
              )}
            </button>
          </form>

          {/* Back link only — no signup */}
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <Link to="/" className="staff-login-back">← Back to main website</Link>
          </div>

        </div>
      </div>
    </>
  )
}
