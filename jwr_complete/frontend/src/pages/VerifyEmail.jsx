import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import './staff-auth.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function VerifyEmail() {
  const navigate       = useNavigate()
  const [searchParams] = useSearchParams()
  const token          = searchParams.get('token') || ''

  // status: 'verifying' | 'success' | 'error'
  const [status,  setStatus]  = useState('verifying')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('No verification token found in the link. Please check your email and try again.')
      return
    }

    async function verify() {
      try {
        const res  = await fetch(`${API}/api/staff/auth/verify-email?token=${encodeURIComponent(token)}`)
        const data = await res.json()

        if (res.ok && data.success) {
          setStatus('success')
          setMessage(data.message || 'Your email has been verified! You can now log in.')
          setTimeout(() => navigate('/staff/login'), 3000)
        } else {
          setStatus('error')
          setMessage(data.error || 'Verification failed. The link may have expired or already been used.')
        }
      } catch {
        setStatus('error')
        setMessage('Unable to connect to the server. Please try again or request a new verification email.')
      }
    }

    verify()
  }, [token, navigate])

  return (
    <div className="staff-auth-page">
      <div className="staff-auth-card">

        {/* Brand */}
        <div className="staff-auth-brand">
          <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" width="38" height="38">
            <circle cx="28" cy="28" r="26.5" stroke="var(--gold-rich)" strokeWidth="1.2" fill="none"/>
            <circle cx="28" cy="28" r="24" fill="var(--forest-deep)"/>
            <ellipse cx="18" cy="26" rx="9" ry="12" fill="var(--forest-light)" opacity="0.75"/>
            <ellipse cx="38" cy="26" rx="9" ry="12" fill="var(--forest-light)" opacity="0.75"/>
            <ellipse cx="28" cy="22" rx="7.5" ry="13" fill="var(--forest-pale)" opacity="0.9"/>
            <rect x="26" y="33" width="4" height="11" rx="1" fill="var(--forest-mid)"/>
            <circle cx="28" cy="11" r="3" fill="var(--gold-rich)" opacity="0.85"/>
          </svg>
          <div>
            <div className="staff-auth-name">Jungle World Resort</div>
            <div className="staff-auth-sub">Staff Portal · Chitwan</div>
          </div>
        </div>

        {/* State display */}
        {status === 'verifying' && (
          <div className="staff-auth-state">
            <div className="staff-auth-state__spinner" />
            <h2 className="staff-auth-state__title">Verifying Email…</h2>
            <p className="staff-auth-state__msg">
              Please wait while we confirm your email address.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="staff-auth-state">
            <div className="staff-auth-state__icon">✅</div>
            <h2 className="staff-auth-state__title">Email Verified!</h2>
            <p className="staff-auth-state__msg">{message}</p>
            <p className="staff-auth-state__msg" style={{ fontSize: '12px', opacity: 0.6 }}>
              Redirecting to sign in in a moment…
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="staff-auth-state">
            <div className="staff-auth-state__icon">❌</div>
            <h2 className="staff-auth-state__title">Verification Failed</h2>
            <p className="staff-auth-state__msg">{message}</p>
          </div>
        )}

        {/* Footer actions */}
        <div className="staff-auth-footer">
          {status === 'error' && (
            <Link to="/staff/login" className="staff-auth-btn" style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center', padding: '13px 24px' }}>
              Back to Sign In
            </Link>
          )}
          {status !== 'verifying' && (
            <Link to="/staff/signup" className="staff-auth-link">
              Create a new account
            </Link>
          )}
          <Link to="/" className="staff-auth-back">← Back to website</Link>
        </div>

      </div>
    </div>
  )
}
