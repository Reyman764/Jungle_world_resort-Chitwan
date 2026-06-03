import React, { useState, useEffect, useRef, useCallback } from 'react'
import GoogleSignIn from './GoogleSignIn'
import { usePackages } from '../hooks/usePackages'
import './BookingWizard.css'

const PACKAGE_NIGHTS = { glance: 1, closeup: 2, explore: 3 }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidEmail(email) {
  return EMAIL_RE.test((email || '').trim())
}

function addDays(dateStr, nights) {
  if (!dateStr || !nights) return ''
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + nights)
  return d.toISOString().split('T')[0]
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

/** Six-box OTP input with paste support and auto-advance */
function OtpDigits({ value, onChange, onComplete, disabled, autoFocus }) {
  const refs = useRef([])
  const digits = Array.from({ length: 6 }, (_, i) => (value[i] || ''))

  const update = useCallback((next) => {
    const clean = next.replace(/\D/g, '').slice(0, 6)
    onChange(clean)
    if (clean.length === 6) onComplete?.(clean)
  }, [onChange, onComplete])

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus()
  }

  const handleInput = (i, raw) => {
    const clean = raw.replace(/\D/g, '')
    if (clean.length > 1) {
      update((value.slice(0, i) + clean).slice(0, 6))
      const focusIdx = Math.min(i + clean.length, 5)
      refs.current[focusIdx]?.focus()
      return
    }
    const next = value.split('')
    while (next.length < 6) next.push('')
    next[i] = clean
    update(next.join(''))
    if (clean && i < 5) refs.current[i + 1]?.focus()
  }

  const handlePaste = (e) => {
    e.preventDefault()
    update(e.clipboardData.getData('text'))
  }

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus()
  }, [autoFocus])

  return (
    <div className="otp-digits" role="group" aria-label="6-digit verification code">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          className={`otp-digit ${d ? 'otp-digit--filled' : ''}`}
          value={d}
          disabled={disabled}
          aria-label={`Digit ${i + 1}`}
          onChange={e => handleInput(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={e => e.target.select()}
        />
      ))}
    </div>
  )
}

/* ── Guest categories ── */
const CATEGORIES = [
  { id: 'foreigner', label: 'International', desc: 'Outside SAARC countries' },
  { id: 'saarc',     label: 'SAARC',         desc: 'India, Bangladesh, Sri Lanka…' },
  { id: 'nepali',    label: 'Nepali',         desc: 'Nepalese nationals' },
]

const STEPS = ['Package', 'Guests', 'Details', 'Review']
const isDev = import.meta.env.DEV

function fmtPrice(amount) {
  return `NPR ${Number(amount).toLocaleString()}`
}

function PriceBreakdown({ pkg, category, adults, children, compact }) {
  if (!pkg) return null
  const unitPrice  = pkg.prices[category]
  const childPrice = Math.round(unitPrice * 0.5)
  const base       = unitPrice * adults + childPrice * children
  const service    = Math.round(base * 0.10)
  const vat        = Math.round(base * 0.13)
  const grand      = base + service + vat

  if (compact) return (
    <div className="price-compact">
      <span className="price-compact__total">{fmtPrice(grand)}</span>
      <span className="price-compact__label">total est.</span>
    </div>
  )

  return (
    <div className="price-breakdown">
      <div className="pb-title">Price Breakdown</div>
      <div className="pb-rows">
        <div className="pb-row">
          <span>{adults} Adult{adults > 1 ? 's' : ''} × {fmtPrice(unitPrice)}</span>
          <span>{fmtPrice(unitPrice * adults)}</span>
        </div>
        {children > 0 && (
          <div className="pb-row">
            <span>{children} Child{children > 1 ? 'ren' : ''} × {fmtPrice(childPrice)} <em>(50%)</em></span>
            <span>{fmtPrice(childPrice * children)}</span>
          </div>
        )}
        <div className="pb-divider" />
        <div className="pb-row pb-row--sub">
          <span>Subtotal</span>
          <span>{fmtPrice(base)}</span>
        </div>
        <div className="pb-row pb-row--sub">
          <span>Service charge (10%)</span>
          <span>{fmtPrice(service)}</span>
        </div>
        <div className="pb-row pb-row--sub">
          <span>VAT (13%)</span>
          <span>{fmtPrice(vat)}</span>
        </div>
        <div className="pb-divider" />
        <div className="pb-row pb-row--total">
          <span>Total Estimate</span>
          <span>{fmtPrice(grand)}</span>
        </div>
      </div>
      <p className="pb-note">Prices per person · twin/triple sharing</p>
    </div>
  )
}

export default function BookingWizard({ preselect }) {
  const { packages: PACKAGES, loading: packagesLoading } = usePackages()
  const [step, setStep]         = useState(0)
  const [pkg, setPkg]           = useState(null)
  const [category, setCategory] = useState('nepali')
  const [adults, setAdults]     = useState(2)
  const [children, setChildren] = useState(0)
  const [form, setForm]         = useState({
    name: '', email: '', phone: '', arrival: '', departure: '', requests: ''
  })
  const [sent, setSent]         = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [bookingDone, setBookingDone] = useState(false)
  const [bookingRef, setBookingRef] = useState(null)
  const [errors, setErrors]     = useState({})
  const resendTimerRef = useRef(null)

  const initialVerif = {
    sessionId:     null,
    emailSent:     false,
    emailOtp:      '',
    emailVerified: false,
    emailLoading:  false,
    emailError:    '',
    emailResendIn: 0,
    devOtp:        null,
    token:         null,
    authMethod:    null,
    googleProfile: null,
  }

  const [verif, setVerif] = useState(initialVerif)
  const [emailCheck, setEmailCheck] = useState({ status: 'idle', message: '' })
  const [googleError, setGoogleError] = useState('')

  const apiUrl      = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  const selectedCat = CATEGORIES.find(c => c.id === category)
  const computedDeparture = pkg && form.arrival
    ? addDays(form.arrival, PACKAGE_NIGHTS[pkg.id])
    : ''

  useEffect(() => () => {
    if (resendTimerRef.current) clearInterval(resendTimerRef.current)
  }, [])

  useEffect(() => {
    if (preselect && PACKAGES.length && !pkg) {
      const found = PACKAGES.find(p => p.id === preselect)
      if (found) setPkg(found)
    }
  }, [preselect, PACKAGES, pkg])

  /* Auto-set departure from package length when arrival is chosen */
  useEffect(() => {
    if (!pkg || !form.arrival) return
    const dep = addDays(form.arrival, PACKAGE_NIGHTS[pkg.id])
    if (dep && dep !== form.departure) {
      setForm(f => ({ ...f, departure: dep }))
    }
  }, [pkg?.id, form.arrival])

  const startResendCountdown = () => {
    if (resendTimerRef.current) clearInterval(resendTimerRef.current)
    setVerif(v => ({ ...v, emailResendIn: 60 }))
    let secs = 60
    resendTimerRef.current = setInterval(() => {
      secs -= 1
      setVerif(v => ({ ...v, emailResendIn: secs }))
      if (secs <= 0) {
        clearInterval(resendTimerRef.current)
        resendTimerRef.current = null
      }
    }, 1000)
  }

  const resetVerif = () => setVerif(initialVerif)

  /* ── Validation ── */
  const validateStep = () => {
    if (step === 0 && !pkg) return { pkg: 'Please select a package to continue.' }
    if (step === 2) {
      const e = {}
      if (!form.name.trim())  e.name    = 'Full name is required.'
      if (!form.email.trim()) e.email   = 'Email address is required.'
      else if (!isValidEmail(form.email)) e.email = 'Enter a valid email address.'
      if (!form.arrival)      e.arrival = 'Please pick your arrival date.'
      if (!verif.emailVerified) {
        e.emailVerify = verif.emailSent
          ? 'Enter the 6-digit code sent to your email to continue.'
          : 'Verify your email — we send a quick code so we can confirm your booking.'
      }
      return e
    }
    return {}
  }

  const next = () => {
    const e = validateStep()
    if (Object.keys(e).length) { setErrors(e); return }
    setErrors({})
    setStep(s => Math.min(s + 1, 3))
  }
  const back = () => { setErrors({}); setStep(s => Math.max(s - 1, 0)) }

  const handleChange = e => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
    // Reset email verification if the email field changes
    if (name === 'email') {
      setEmailCheck({ status: 'idle', message: '' })
      setGoogleError('')
      setVerif(v => ({
        ...initialVerif,
        emailResendIn: v.emailResendIn,
      }))
    }
  }

  const handleEmailBlur = async () => {
    const email = form.email.trim().toLowerCase()
    if (!email || !isValidEmail(email) || verif.emailVerified) return

    setEmailCheck({ status: 'checking', message: 'Checking if this inbox can receive mail…' })
    try {
      const r = await fetch(`${apiUrl}/api/verify/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const d = await r.json()
      if (!r.ok) {
        setEmailCheck({ status: 'invalid', message: d.error || 'This email does not look valid.' })
        return
      }
      setEmailCheck({ status: 'valid', message: d.message || 'Email looks good — we can send your code here.' })
    } catch {
      setEmailCheck({ status: 'idle', message: '' })
    }
  }

  const handleGoogleCredential = async (credential) => {
    setGoogleError('')
    setVerif(v => ({ ...v, emailLoading: true, emailError: '' }))
    try {
      const r = await fetch(`${apiUrl}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Google sign-in failed')

      const profile = d.profile || {}
      const fullName = profile.name || [d.user?.first_name, d.user?.last_name].filter(Boolean).join(' ')

      setForm(f => ({
        ...f,
        name:  f.name.trim() || fullName || f.name,
        email: profile.email || d.user?.email || f.email,
      }))

      if (d.access_token) localStorage.setItem('jwr_guest_token', d.access_token)
      if (d.user) localStorage.setItem('jwr_guest_user', JSON.stringify(d.user))

      setVerif(v => ({
        ...v,
        emailVerified: true,
        token: d.verification_token,
        authMethod: 'google',
        googleProfile: profile,
        emailLoading: false,
        emailError: '',
      }))
      setEmailCheck({ status: 'valid', message: 'Signed in with Google — your email is verified.' })
      setErrors(prev => ({ ...prev, emailVerify: '', email: '' }))
    } catch (err) {
      setGoogleError(err.message)
      setVerif(v => ({ ...v, emailLoading: false }))
    }
  }

  // ── OTP handlers ─────────────────────────────────────────

  const handleSendEmailOtp = async () => {
    const email = form.email.trim().toLowerCase()
    if (!email) { setErrors(prev => ({ ...prev, email: 'Enter your email address first.' })); return }
    if (!isValidEmail(email)) { setErrors(prev => ({ ...prev, email: 'Enter a valid email address.' })); return }
    if (emailCheck.status === 'invalid') {
      setVerif(v => ({ ...v, emailError: emailCheck.message || 'Please use a real email address.' }))
      return
    }
    setVerif(v => ({ ...v, emailLoading: true, emailError: '', emailOtp: '', devOtp: null }))
    startResendCountdown()
    try {
      // Uses the new /api/otp/send-code endpoint (SendGrid-powered, email-based lookup)
      const r = await fetch(`${apiUrl}/api/otp/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Failed to send verification code')
      setVerif(v => ({
        ...v,
        emailLoading: false,
        emailSent:   true,
        sessionId:   null,   // new /api/otp routes use email-based lookup, no session_id
        authMethod:  'otp',
        emailError:  '',
        devOtp: isDev && d.dev_otp ? d.dev_otp : null,
      }))
      setEmailCheck({
        status:  'valid',
        message: d.success
          ? 'Verification code sent — check your inbox and spam folder.'
          : 'Email not configured on server — use the dev code below or add SendGrid to backend .env.',
      })
    } catch (err) {
      if (resendTimerRef.current) clearInterval(resendTimerRef.current)
      setVerif(v => ({ ...v, emailLoading: false, emailError: err.message, emailResendIn: 0 }))
    }
  }

  const handleVerifyEmailOtp = async (code) => {
    const otp   = (code || verif.emailOtp).trim()
    const email = form.email.trim().toLowerCase()
    if (otp.length !== 6) {
      setVerif(v => ({ ...v, emailError: 'Enter all 6 digits.' })); return
    }
    setVerif(v => ({ ...v, emailLoading: true, emailError: '' }))
    try {
      // Uses the new /api/otp/verify-code endpoint (email + code, no session_id needed)
      const r = await fetch(`${apiUrl}/api/otp/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otp }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Incorrect code')
      // Persist the verification token in sessionStorage for this tab's lifetime
      try { sessionStorage.setItem('jwr_verification_token', d.verification_token) } catch (_) {}
      setVerif(v => ({
        ...v,
        emailLoading:  false,
        emailVerified: true,
        emailOtp:      otp,
        token:         d.verification_token,
        authMethod:    'otp',
        emailError:    '',
        devOtp:        null,
      }))
      setErrors(prev => ({ ...prev, emailVerify: '' }))
    } catch (err) {
      setVerif(v => ({ ...v, emailLoading: false, emailError: err.message, emailOtp: '' }))
    }
  }


  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setErrors({})

    try {
      // ── Calculate price (mirrors PriceBreakdown logic) ──────
      const unitPrice   = pkg.prices[category]
      const childPrice  = Math.round(unitPrice * 0.5)
      const base        = unitPrice * adults + childPrice * children
      const service     = Math.round(base * 0.10)
      const vatAmt      = Math.round(base * 0.13)
      const total       = base + service + vatAmt

      const payload = {
        package_slug:       pkg.id,
        guest_name:         form.name.trim(),
        guest_email:        form.email.trim(),
        guest_phone:        form.phone.trim().replace(/[\s\-\(\)\.]/g, '') || null,
        guest_category:     category,
        check_in_date:      form.arrival,
        check_out_date:     form.departure || computedDeparture || null,
        num_adults:         adults,
        num_children:       children,
        special_requests:   form.requests.trim() || null,
        currency:           'NPR',
        base_price:         base,
        service_charge:     service,
        vat:                vatAmt,
        total_price:        total,
        verification_token: verif.token,   // ← required by backend
      }

      const res    = await fetch(`${apiUrl}/api/bookings`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Server error (${res.status})`)
      }

      const data = await res.json()
      setBookingRef(data.booking_reference || null)

      setSubmitting(false)
      setBookingDone(true)
      setTimeout(() => {
        setSent(true)
        setBookingDone(false)
      }, 1600)

    } catch (err) {
      setSubmitting(false)
      setErrors({ submit: err.message || 'Something went wrong. Please try again.' })
    }
  }

  const counter = (val, set, min, max) => (
    <div className="counter">
      <button type="button" className="counter__btn" onClick={() => set(v => Math.max(min, v - 1))} aria-label="decrease">−</button>
      <span className="counter__val">{val}</span>
      <button type="button" className="counter__btn" onClick={() => set(v => Math.min(max, v + 1))} aria-label="increase">+</button>
    </div>
  )

  /* ── Submitted state ── */
  if (sent) {
    const unitPrice = pkg.prices[category]
    const childP    = Math.round(unitPrice * 0.5)
    const base      = unitPrice * adults + childP * children
    const grand     = base + Math.round(base * 0.10) + Math.round(base * 0.13)

    return (
      <div className="wizard-success">
        <div className="wizard-success__icon">
          <svg viewBox="0 0 48 48" fill="none" width="48" height="48" aria-hidden="true">
            <circle cx="24" cy="24" r="22" stroke="var(--gold-rich)" strokeWidth="2"/>
            <polyline points="14,25 21,32 34,17" stroke="var(--gold-light)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="wizard-success__badge">Request received</span>
        <h3>You're on the list!</h3>
        <p>
          Thank you, <strong>{form.name}</strong>. Your enquiry for <strong>{pkg.name}</strong> is in our inbox.
          We'll confirm within <strong>24 hours</strong> at <strong>{form.email}</strong>.
        </p>
        {bookingRef && (
          <div className="success-ref">
            <span>Your reference</span>
            <strong>{bookingRef}</strong>
            <p>Save this to check your booking status or when you contact us.</p>
          </div>
        )}
        <div className="success-summary">
          <div className="success-row"><span>Package</span><strong>{pkg.name}</strong></div>
          <div className="success-row"><span>Guests</span><strong>{adults} adult{adults > 1 ? 's' : ''}{children > 0 ? ` · ${children} child${children > 1 ? 'ren' : ''}` : ''}</strong></div>
          <div className="success-row"><span>Arrival</span><strong>{formatDisplayDate(form.arrival)}</strong></div>
          {form.departure && (
            <div className="success-row"><span>Departure</span><strong>{formatDisplayDate(form.departure)}</strong></div>
          )}
          <div className="success-row"><span>Estimate</span><strong>{fmtPrice(grand)}</strong></div>
          <div className="success-row success-row--verified">
            <span>Email</span>
            <strong className="verified-pill">Verified</strong>
          </div>
        </div>
        <ul className="success-next-steps">
          <li>Check your inbox for a confirmation email from our team</li>
          <li>No payment is required now — pay at the resort on arrival</li>
          <li>Questions? Call us at +977 9851198992</li>
        </ul>
        <button
          type="button"
          className="btn-primary wizard-success__cta"
          onClick={() => {
            setSent(false)
            setStep(0)
            setPkg(null)
            setBookingRef(null)
            setForm({ name:'', email:'', phone:'', arrival:'', departure:'', requests:'' })
            resetVerif()
          }}
        >
          <span>Make Another Enquiry</span>
        </button>
      </div>
    )
  }

  return (
    <div className="wizard">
      {/* ── Progress bar ── */}
      <div className="wizard__steps">
        {STEPS.map((label, i) => (
          <div key={i} className={`wizard__step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
            <div className="wizard__step-dot">
              {i < step
                ? <svg viewBox="0 0 16 16" fill="none" width="12" height="12"><polyline points="3,8 7,12 13,4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                : <span>{i + 1}</span>}
            </div>
            <span className="wizard__step-label">{label}</span>
          </div>
        ))}
        <div className="wizard__progress-track">
          <div className="wizard__progress-fill" style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} />
        </div>
      </div>

      <div className="wizard__body">
        {/* ── LEFT: Steps ── */}
        <div className="wizard__main">

          {/* STEP 0 — Package */}
          {step === 0 && (
            <div className="wizard__panel">
              <div className="wizard__panel-header">
                <span className="wizard__step-tag">Step 1 of 4</span>
                <h3>Choose Your Package</h3>
                <p>Select the adventure that suits your schedule and spirit.</p>
              </div>
              <div className="pkg-cards">
                {packagesLoading ? (
                  <p style={{ color: 'var(--text-secondary)', padding: '12px 0' }}>Loading packages…</p>
                ) : PACKAGES.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    className={`pkg-card-pick ${pkg?.id === p.id ? 'selected' : ''}`}
                    onClick={() => setPkg(p)}
                    aria-pressed={pkg?.id === p.id}
                  >
                    <div className="pkg-card-pick__img">
                      <img src={p.img} alt={p.name} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                      {p.popular && <span className="pkg-pop-badge">Most Popular</span>}
                      <span className="pkg-dur-badge">{p.badge}</span>
                    </div>
                    <div className="pkg-card-pick__body">
                      <h4>{p.name}</h4>
                      <p className="pkg-duration">{p.duration}</p>
                      <ul className="pkg-mini-includes">
                        {p.includes.slice(0, 3).map((inc, j) => (
                          <li key={j}>
                            <svg viewBox="0 0 16 16" fill="none" width="10" height="10"><polyline points="2,8 6,12 14,4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            {inc}
                          </li>
                        ))}
                        {p.includes.length > 3 && <li className="more-items">+{p.includes.length - 3} more included</li>}
                      </ul>
                      <div className="pkg-card-pick__price-row">
                        <span className="pkg-from">From</span>
                        <span className="pkg-price">{fmtPrice(p.prices[category])}</span>
                        <span className="pkg-per">/ person</span>
                      </div>
                    </div>
                    <div className="pkg-card-pick__check">
                      <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5"/>
                        <polyline points="5,10 9,14 15,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
              {errors.pkg && <div className="field-error">{errors.pkg}</div>}
            </div>
          )}

          {/* STEP 1 — Guests */}
          {step === 1 && (
            <div className="wizard__panel">
              <div className="wizard__panel-header">
                <span className="wizard__step-tag">Step 2 of 4</span>
                <h3>Guest Details</h3>
                <p>Tell us who's coming — rates vary by nationality category.</p>
              </div>

              <div className="guest-section">
                <div className="guest-label">Nationality / Rate Category</div>
                <div className="category-cards">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      className={`cat-card ${category === cat.id ? 'selected' : ''}`}
                      onClick={() => setCategory(cat.id)}
                      aria-pressed={category === cat.id}
                    >
                      <div>
                        <strong>{cat.label}</strong>
                        <span>{cat.desc}</span>
                      </div>
                      {pkg && (
                        <span className="cat-price">
                          NPR {pkg.prices[cat.id].toLocaleString()}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="guest-section">
                <div className="guest-counters">
                  <div className="guest-counter-row">
                    <div className="guest-counter-info">
                      <strong>Adults</strong>
                      <span>Age 10 and above</span>
                    </div>
                    {counter(adults, setAdults, 1, 20)}
                  </div>
                  <div className="guest-counter-row">
                    <div className="guest-counter-info">
                      <strong>Children</strong>
                      <span>Age 3–9 · 50% rate</span>
                    </div>
                    {counter(children, setChildren, 0, 10)}
                  </div>
                </div>
                <div className="guest-note">
                  <svg viewBox="0 0 16 16" fill="none" width="13" height="13"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/><path d="M8 7v4M8 5.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                  Children below 3 travel free. Group leaders with 15+ guests receive complimentary accommodation.
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — Details */}
          {step === 2 && (
            <div className="wizard__panel">
              <div className="wizard__panel-header">
                <span className="wizard__step-tag">Step 3 of 4</span>
                <h3>Travel Details</h3>
                <p>A few more details so we can prepare everything perfectly.</p>
              </div>
              <div className="form-fields">
                <div className="form-row-2">
                  <div className={`form-group ${errors.name ? 'has-error' : ''}`}>
                    <label htmlFor="wiz-name">Full Name *</label>
                    <input id="wiz-name" type="text" name="name" value={form.name} onChange={handleChange} placeholder="Your full name" />
                    {errors.name && <span className="field-error">{errors.name}</span>}
                  </div>
                  <div className={`form-group ${errors.email || emailCheck.status === 'invalid' ? 'has-error' : ''} ${emailCheck.status === 'valid' ? 'has-valid' : ''}`}>
                    <label htmlFor="wiz-email">Email Address *</label>
                    <input
                      id="wiz-email"
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      onBlur={handleEmailBlur}
                      placeholder="your@email.com"
                      autoComplete="email"
                      readOnly={verif.emailVerified && verif.authMethod === 'google'}
                    />
                    {errors.email && <span className="field-error">{errors.email}</span>}
                    {!errors.email && emailCheck.status === 'checking' && (
                      <span className="field-hint field-hint--checking">{emailCheck.message}</span>
                    )}
                    {!errors.email && emailCheck.status === 'valid' && (
                      <span className="field-hint field-hint--valid">{emailCheck.message}</span>
                    )}
                    {!errors.email && emailCheck.status === 'invalid' && (
                      <span className="field-error">{emailCheck.message}</span>
                    )}
                  </div>
                </div>
                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="wiz-phone">Phone / WhatsApp <span className="label-optional">optional</span></label>
                    <input id="wiz-phone" type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="+977 98XXXXXXXX" />
                  </div>
                  <div className={`form-group ${errors.arrival ? 'has-error' : ''}`}>
                    <label htmlFor="wiz-arrival">Arrival Date *</label>
                    <input id="wiz-arrival" type="date" name="arrival" value={form.arrival} onChange={handleChange} min={new Date().toISOString().split('T')[0]} />
                    {errors.arrival && <span className="field-error">{errors.arrival}</span>}
                  </div>
                </div>
                {pkg && form.arrival && computedDeparture && (
                  <div className="departure-hint">
                    <svg viewBox="0 0 16 16" fill="none" width="14" height="14" aria-hidden="true">
                      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M8 7v4M8 5.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                    <span>
                      Suggested departure for <strong>{pkg.name}</strong>:{' '}
                      <strong>{formatDisplayDate(computedDeparture)}</strong>
                      {form.departure !== computedDeparture && ' (updated automatically)'}
                    </span>
                  </div>
                )}
                <div className="form-group">
                  <label htmlFor="wiz-requests">Special Requests</label>
                  <textarea id="wiz-requests" name="requests" value={form.requests} onChange={handleChange} rows={4} placeholder="Dietary needs, room preferences, celebrations, accessibility requirements…" />
                </div>
              </div>

              {/* ── Sign in & email verification ── */}
              <div className={`verif-section ${verif.emailVerified ? 'verif-section--complete' : ''}`}>
                <div className="verif-section__header">
                  <div className="verif-section__title">
                    <svg viewBox="0 0 20 20" fill="none" width="18" height="18" aria-hidden="true">
                      <path d="M10 2L3 6v4c0 4.418 3.134 7.979 7 8.944C13.866 17.979 17 14.418 17 10V6l-7-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                      {verif.emailVerified && <polyline points="7,10 9,12 13,8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>}
                    </svg>
                    <div>
                      <span>Confirm it's really you</span>
                      <p>
                        {verif.emailVerified && verif.authMethod === 'google'
                          ? 'Signed in with Google — your email is verified by Google.'
                          : 'Sign in with Google for instant verification, or we send a 6-digit code to your inbox.'}
                      </p>
                    </div>
                  </div>
                  {verif.emailVerified && (
                    <span className="verif-badge">
                      {verif.authMethod === 'google' ? 'Google' : 'Verified'}
                    </span>
                  )}
                </div>

                {!verif.emailVerified && (
                  <div className="auth-block">
                    <GoogleSignIn
                      onCredential={handleGoogleCredential}
                      onError={setGoogleError}
                      disabled={verif.emailLoading}
                    />
                    {googleError && <p className="verif-error" role="alert">{googleError}</p>}
                    <div className="auth-divider" aria-hidden="true">
                      <span>or verify with email code</span>
                    </div>
                  </div>
                )}

                {verif.emailVerified && verif.authMethod === 'google' && verif.googleProfile && (
                  <div className="verif-card verif-card--done verif-card--google">
                    <div className="google-profile">
                      {verif.googleProfile.picture && (
                        <img src={verif.googleProfile.picture} alt="" width={40} height={40} className="google-profile__img" />
                      )}
                      <div>
                        <strong>{verif.googleProfile.name}</strong>
                        <span>{verif.googleProfile.email}</span>
                      </div>
                    </div>
                  </div>
                )}

                {verif.authMethod !== 'google' && (
                <>
                <div className="verif-steps" aria-label="Verification progress">
                  <div className={`verif-step-pill ${!verif.emailSent && !verif.emailVerified ? 'active' : verif.emailVerified || verif.emailSent ? 'done' : ''}`}>
                    <span>1</span> Enter email
                  </div>
                  <div className={`verif-step-pill ${verif.emailSent && !verif.emailVerified ? 'active' : verif.emailVerified ? 'done' : ''}`}>
                    <span>2</span> Confirm code
                  </div>
                  <div className={`verif-step-pill ${verif.emailVerified ? 'active done' : ''}`}>
                    <span>3</span> Ready
                  </div>
                </div>

                <div className={`verif-card ${verif.emailVerified ? 'verif-card--done' : ''}`}>
                  {!verif.emailVerified ? (
                    <>
                      <div className="verif-card__email">
                        <span className="verif-card__label">Sending code to</span>
                        <strong>{form.email.trim() || 'Enter your email above'}</strong>
                      </div>

                      {!verif.emailSent ? (
                        <button
                          type="button"
                          className="verif-btn verif-btn--primary"
                          onClick={handleSendEmailOtp}
                          disabled={verif.emailLoading || !isValidEmail(form.email)}
                        >
                          {verif.emailLoading ? <span className="verif-spinner" /> : 'Send verification code'}
                        </button>
                      ) : (
                        <div className="verif-card__otp-block">
                          <p className="verif-card__otp-label">Enter the 6-digit code from your inbox</p>
                          <OtpDigits
                            value={verif.emailOtp}
                            onChange={code => setVerif(v => ({ ...v, emailOtp: code, emailError: '' }))}
                            onComplete={handleVerifyEmailOtp}
                            disabled={verif.emailLoading}
                            autoFocus
                          />
                          <div className="verif-card__otp-actions">
                            <button
                              type="button"
                              className="verif-btn verif-btn--primary"
                              onClick={() => handleVerifyEmailOtp()}
                              disabled={verif.emailLoading || verif.emailOtp.length !== 6}
                            >
                              {verif.emailLoading ? <span className="verif-spinner" /> : 'Confirm code'}
                            </button>
                            <button
                              type="button"
                              className="verif-btn verif-btn--ghost"
                              onClick={handleSendEmailOtp}
                              disabled={verif.emailLoading || verif.emailResendIn > 0}
                            >
                              {verif.emailResendIn > 0 ? `Resend in ${verif.emailResendIn}s` : 'Resend code'}
                            </button>
                            <button
                              type="button"
                              className="verif-btn verif-btn--text"
                              onClick={() => setVerif(v => ({ ...v, emailSent: false, emailOtp: '', emailError: '', devOtp: null }))}
                            >
                              Change email
                            </button>
                          </div>
                          {verif.emailSent && !verif.emailError && (
                            <p className="verif-hint">Check your inbox and spam folder. Code expires in 10 minutes.</p>
                          )}
                          {isDev && verif.devOtp && (
                            <p className="verif-dev-hint" role="status">
                              Dev mode — your code is <strong>{verif.devOtp}</strong>
                            </p>
                          )}
                        </div>
                      )}
                      {verif.emailError && <p className="verif-error" role="alert">{verif.emailError}</p>}
                    </>
                  ) : (
                    <div className="verif-card__success">
                      <svg viewBox="0 0 24 24" fill="none" width="22" height="22" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" fill="var(--forest-light)"/>
                        <polyline points="8,12 11,15 16,9" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <div>
                        <strong>Email verified</strong>
                        <span>{form.email}</span>
                      </div>
                    </div>
                  )}
                </div>


                {errors.emailVerify && (
                  <p className="field-error verif-section__error" role="alert">{errors.emailVerify}</p>
                )}
                </>
                )}
              </div>
            </div>
          )}

          {/* STEP 3 — Review */}
          {step === 3 && (
            <div className="wizard__panel">
              <div className="wizard__panel-header">
                <span className="wizard__step-tag">Step 4 of 4</span>
                <h3>Review & Confirm</h3>
                <p>Please check everything before sending your booking request.</p>
              </div>
              <div className="review-sections">
                <div className="review-block">
                  <div className="review-block__header">
                    <span>Package</span>
                    <button type="button" className="review-edit" onClick={() => setStep(0)}>Edit</button>
                  </div>
                  <div className="review-row">
                    <span>{pkg?.name}</span>
                    <strong>{pkg?.duration}</strong>
                  </div>
                </div>
                <div className="review-block">
                  <div className="review-block__header">
                    <span>Guests & Category</span>
                    <button type="button" className="review-edit" onClick={() => setStep(1)}>Edit</button>
                  </div>
                  <div className="review-row">
                    <span>{selectedCat?.label}</span>
                  </div>
                  <div className="review-row">
                    <span>{adults} Adult{adults > 1 ? 's' : ''}{children > 0 ? `, ${children} Child${children > 1 ? 'ren' : ''}` : ''}</span>
                  </div>
                </div>
                <div className="review-block">
                  <div className="review-block__header">
                    <span>Contact & Travel</span>
                    <button type="button" className="review-edit" onClick={() => setStep(2)}>Edit</button>
                  </div>
                  <div className="review-row"><span>Name</span><strong>{form.name}</strong></div>
                  <div className="review-row">
                    <span>Email</span>
                    <strong className="review-verified">
                      {form.email}
                      <span className="verified-pill">
                        {verif.authMethod === 'google' ? 'Google verified' : 'Verified'}
                      </span>
                    </strong>
                  </div>
                  {form.phone && <div className="review-row"><span>Phone</span><strong>{form.phone}</strong></div>}
                  <div className="review-row"><span>Arrival</span><strong>{formatDisplayDate(form.arrival)}</strong></div>
                  {form.departure && <div className="review-row"><span>Departure</span><strong>{formatDisplayDate(form.departure)}</strong></div>}
                  {form.requests && <div className="review-row review-row--requests"><span>Requests</span><em>{form.requests}</em></div>}
                </div>
              </div>
              <div className="review-price-full">
                <PriceBreakdown pkg={pkg} category={category} adults={adults} children={children} />
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="wizard__nav">
            {step > 0
              ? <button type="button" className="wizard__nav-back" onClick={back}>
                  <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><polyline points="10,3 5,8 10,13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Back
                </button>
              : <span />}
            {step < 3
              ? <button type="button" className="btn-primary wizard__nav-next" onClick={next}>
                  <span>
                    {step === 0 ? 'Select Guests' : step === 1 ? 'Your Details' : 'Review Booking'}
                    {step === 2 && !verif.emailVerified && ' (verify email first)'}
                  </span>
                  <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><polyline points="5,3 11,8 5,13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              : <button
                  type="button"
                  className={`wizard__nav-submit ${submitting ? 'is-submitting' : ''} ${bookingDone ? 'is-booked' : ''}`}
                  onClick={handleSubmit}
                  disabled={submitting || bookingDone}
                  aria-label="Send booking request"
                >
                  {/* Idle state */}
                  <span className="submit-idle">
                    <span>Send Booking Request</span>
                    <svg className="submit-send-icon" viewBox="0 0 18 18" fill="none" width="15" height="15">
                      <path d="M15.5 2.5L8 10M15.5 2.5L10.5 16L8 10M15.5 2.5L2 7L8 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  {/* Submitting state */}
                  <span className="submit-loading" aria-hidden="true">
                    <span className="submit-dot" /><span className="submit-dot" /><span className="submit-dot" />
                  </span>
                  {/* Booked state */}
                  <span className="submit-booked" aria-hidden="true">
                    <svg className="submit-check" viewBox="0 0 28 28" fill="none" width="22" height="22">
                      <circle className="submit-check__ring" cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="2"/>
                      <polyline className="submit-check__tick" points="8,14 12,18 20,10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Booked</span>
                  </span>
                  {/* Ripple burst */}
                  <span className="submit-ripple" aria-hidden="true" />
                </button>}
                {errors.submit && (
                  <p role="alert" style={{ color: '#c0392b', fontSize: '0.85rem', marginTop: '8px', textAlign: 'center' }}>
                    Error: {errors.submit}
                  </p>
                )}
          </div>
        </div>

        {/* ── RIGHT: Live Summary ── */}
        <aside className="wizard__sidebar">
          <div className="sidebar-sticky">
            {pkg ? (
              <>
                <div className="sidebar-pkg">
                  <img src={pkg.img} alt={pkg.name} className="sidebar-pkg__img" referrerPolicy="no-referrer-when-downgrade" />
                  <div className="sidebar-pkg__info">
                    <h4>{pkg.name}</h4>
                    <p>{pkg.duration}</p>
                  </div>
                </div>

                <div className="sidebar-guests">
                  <div className="sg-row">
                    <span>{selectedCat?.label}</span>
                    <span>{adults} adult{adults > 1 ? 's' : ''}{children > 0 ? `, ${children} child${children > 1 ? 'ren' : ''}` : ''}</span>
                  </div>
                  {form.arrival && (
                    <div className="sg-row">
                      <span>Arrival</span>
                      <span>{formatDisplayDate(form.arrival)}</span>
                    </div>
                  )}
                  {step >= 2 && (
                    <div className={`sg-row sg-row--verify ${verif.emailVerified ? 'is-verified' : ''}`}>
                      <span>Email status</span>
                      <span>
                        {verif.emailVerified
                          ? (verif.authMethod === 'google' ? 'Google' : 'Verified')
                          : verif.emailSent ? 'Awaiting code' : 'Not verified'}
                      </span>
                    </div>
                  )}
                </div>

                <PriceBreakdown pkg={pkg} category={category} adults={adults} children={children} />

                <div className="sidebar-trust">
                  <div className="trust-row">
                    <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M8 2L9.8 6.2H14L10.6 8.8L12 13L8 10.4L4 13L5.4 8.8L2 6.2H6.2Z" fill="var(--gold-rich)"/></svg>
                    <span>4.9/5 from 487 reviews</span>
                  </div>
                  <div className="trust-row">
                    <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M8 2l1 3.5H13L10 8l1 3.5L8 9.5 5 11.5 6 8 3 5.5h4z" stroke="var(--forest-light)" strokeWidth="1.2" fill="none"/></svg>
                    <span>Free cancellation up to 72 hrs</span>
                  </div>
                  <div className="trust-row">
                    <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><rect x="2" y="5" width="12" height="9" rx="1.5" stroke="var(--forest-light)" strokeWidth="1.2"/><path d="M5 5V4a3 3 0 016 0v1" stroke="var(--forest-light)" strokeWidth="1.2"/></svg>
                    <span>Secure enquiry · No payment now</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="sidebar-empty">
                <div className="sidebar-empty__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
                    <path d="M20 4c-6 1-10 5-11.5 10.5C7.5 17.2 7 20 7 20s2.8-.5 5.5-1.5C18 17 22 13 20 4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
                    <path d="M8 19c2-6 6-10 12-13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                  </svg>
                </div>
                <p>Select a package to see your price estimate here.</p>
                <div className="sidebar-teaser">
                  <div>From <strong>NPR 15,960</strong> per person</div>
                  <div>All meals included</div>
                  <div>No upfront payment</div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
