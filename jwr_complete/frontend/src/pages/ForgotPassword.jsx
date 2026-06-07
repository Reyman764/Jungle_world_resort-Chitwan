import React, { useState } from 'react'
import { Link } from 'react-router-dom'
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

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('')
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }

    setLoading(true)
    try {
      const res  = await fetch(`${API}/api/staff/auth/request-password-reset`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()

      // Always show success (server never reveals if email exists)
      setSuccess(data.message || 'If that email is registered, a reset link has been sent.')
      setEmail('')
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

        <div className="staff-auth-title">Reset Password</div>

        {/* Info box */}
        <div className="staff-auth-info" style={{ marginBottom: '20px' }}>
          <span className="staff-auth-info__label">Good to know</span>
          <ul className="staff-auth-info__steps">
            <li>Enter your registered email</li>
            <li>Check your inbox for the reset link</li>
            <li>Link expires in 1 hour</li>
            <li>Check spam if not in inbox</li>
          </ul>
        </div>

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
              <label className="staff-auth-label" htmlFor="email">Email Address</label>
              <input
                id="email" type="email"
                className="staff-auth-input"
                placeholder="you@jungleworldresort.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required autoFocus autoComplete="email"
              />
            </div>

            <button
              type="submit"
              className="staff-auth-btn"
              disabled={loading || !email.trim()}
            >
              {loading ? (
                <><span className="auth-spinner" /> Sending…</>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="staff-auth-footer">
          <Link to="/staff/login" className="staff-auth-link">← Back to Sign In</Link>
          <Link to="/" className="staff-auth-back">Back to website</Link>
        </div>

      </div>
    </div>
  )
}
