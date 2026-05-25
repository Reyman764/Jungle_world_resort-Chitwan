import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import './StaffLogin.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function StaffLogin() {
  const navigate = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res  = await fetch(`${API}/api/auth/login`, {
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
      const user  = data.user

      if (!token || !user) {
        setError('Unexpected server response. Please try again.')
        return
      }

      const validRoles = ['admin', 'manager', 'staff']
      if (!validRoles.includes(user.role)) {
        setError('Access denied. This portal is for resort staff only.')
        return
      }

      localStorage.setItem('token', token)
      localStorage.setItem('user',  JSON.stringify(user))
      navigate('/admin/dashboard')

    } catch {
      setError('Unable to connect to the server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
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
              <svg viewBox="0 0 16 16" fill="none" width="15" height="15" flexShrink="0">
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

        {/* Demo credentials */}
        <div className="staff-login-demo">
          <span className="staff-login-demo__label">Demo Credentials</span>
          <div className="staff-login-demo__creds">
            <p><strong>Email:</strong> manager@jungleworldresort.com</p>
            <p><strong>Password:</strong> Password123!</p>
          </div>
        </div>

        <Link to="/" className="staff-login-back">← Back to main website</Link>
      </div>
    </div>
  )
}
