import React, { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import './staff-auth.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function JWRLogo() {
  return (
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" width="38" height="38">
      <circle cx="28" cy="28" r="26.5" stroke="var(--gold-rich)" strokeWidth="1.2" fill="none"/>
      <circle cx="28" cy="28" r="24" fill="var(--forest-deep)"/>
      <ellipse cx="18" cy="26" rx="9" ry="12" fill="var(--forest-light)" opacity="0.75"/>
      <ellipse cx="38" cy="26" rx="9" ry="12" fill="var(--forest-light)" opacity="0.75"/>
      <ellipse cx="28" cy="22" rx="7.5" ry="13" fill="var(--forest-pale)" opacity="0.9"/>
      <rect x="26" y="33" width="4" height="11" rx="1" fill="var(--forest-mid)"/>
      <circle cx="28" cy="11" r="3" fill="var(--gold-rich)" opacity="0.85"/>
    </svg>
  )
}

export default function ResetPassword() {
  const navigate        = useNavigate()
  const [searchParams]  = useSearchParams()
  const token           = searchParams.get('token') || ''

  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState('')
  const [loading,   setLoading]   = useState(false)

  // No token in URL
  if (!token) {
    return (
      <div className="staff-auth-page">
        <div className="staff-auth-card">
          <div className="staff-auth-brand">
            <div className="staff-auth-logo"><JWRLogo /></div>
            <div>
              <div className="staff-auth-name">Jungle World Resort</div>
              <div className="staff-auth-sub">Staff Portal · Chitwan</div>
            </div>
          </div>
          <div className="staff-auth-alert staff-auth-alert--error">
            <svg viewBox="0 0 16 16" fill="none" width="15" height="15" style={{ flexShrink: 0 }}>
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Invalid reset link. Please request a new password reset.
          </div>
          <div className="staff-auth-footer">
            <Link to="/staff/forgot-password" className="staff-auth-link">Request new reset link</Link>
            <Link to="/staff/login" className="staff-auth-back">← Back to Sign In</Link>
          </div>
        </div>
      </div>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const res  = await fetch(`${API}/api/staff/auth/reset-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Password reset failed. The link may have expired.')
        return
      }

      setSuccess('Password reset successfully. Redirecting to sign in…')
      setTimeout(() => navigate('/staff/login'), 2000)
    } catch {
      setError('Unable to connect to the server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="staff-auth-page">
      <div className="staff-auth-card">

        {/* Brand */}
        <div className="staff-auth-brand">
          <div className="staff-auth-logo"><JWRLogo /></div>
          <div>
            <div className="staff-auth-name">Jungle World Resort</div>
            <div className="staff-auth-sub">Staff Portal · Chitwan</div>
          </div>
        </div>

        <div className="staff-auth-title">Set New Password</div>

        {/* Alerts */}
        {error && (
          <div className="staff-auth-alert staff-auth-alert--error" role="alert">
            <svg viewBox="0 0 16 16" fill="none" width="15" height="15" style={{ flexShrink: 0 }}>
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {error}
          </div>
        )}
        {success && (
          <div className="staff-auth-alert staff-auth-alert--success" role="alert">
            <svg viewBox="0 0 16 16" fill="none" width="15" height="15" style={{ flexShrink: 0 }}>
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M5 8l2.5 2.5L11 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {success}
          </div>
        )}

        {/* Form */}
        {!success && (
          <form className="staff-auth-form" onSubmit={handleSubmit} noValidate>
            <div className="staff-auth-group">
              <label className="staff-auth-label" htmlFor="password">New Password</label>
              <input
                id="password" type="password"
                className="staff-auth-input"
                placeholder="8+ characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required autoFocus autoComplete="new-password"
              />
              {password.length > 0 && password.length < 8 && (
                <div className="staff-auth-hint">
                  {8 - password.length} more character{8 - password.length !== 1 ? 's' : ''} needed
                </div>
              )}
            </div>

            <div className="staff-auth-group">
              <label className="staff-auth-label" htmlFor="confirm">Confirm Password</label>
              <input
                id="confirm" type="password"
                className={`staff-auth-input${confirm && confirm !== password ? ' error' : ''}`}
                placeholder="Repeat new password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="staff-auth-btn"
              disabled={loading || !password || !confirm}
            >
              {loading ? (
                <><span className="auth-spinner" /> Resetting…</>
              ) : (
                'Set New Password'
              )}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="staff-auth-footer">
          <Link to="/staff/login" className="staff-auth-back">← Back to Sign In</Link>
        </div>

      </div>
    </div>
  )
}
