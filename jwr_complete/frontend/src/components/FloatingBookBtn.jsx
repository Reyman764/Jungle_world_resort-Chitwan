import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import './FloatingBookBtn.css'

export default function FloatingBookBtn() {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [pulse, setPulse] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 320)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Pulse every 8 seconds to attract attention
  useEffect(() => {
    const id = setInterval(() => {
      setPulse(true)
      setTimeout(() => setPulse(false), 700)
    }, 8000)
    return () => clearInterval(id)
  }, [])

  // Re-show if dismissed and user navigates to a new page
  useEffect(() => {
    setDismissed(false)
  }, [location.pathname])

  if (dismissed || !visible) return null

  const scrollToBooking = () => {
    const el = document.getElementById('booking-section')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      window.location.href = '/contact#booking'
    }
  }

  return (
    <div className={`float-btn ${pulse ? 'float-btn--pulse' : ''}`}>
      <button
        className="float-btn__main"
        onClick={scrollToBooking}
        aria-label="Open booking form"
      >
        <span className="float-btn__icon">
          <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
            <path d="M17 3H3C2.4 3 2 3.4 2 4v13l3-3h12c.6 0 1-.4 1-1V4c0-.6-.4-1-1-1z" fill="currentColor" opacity="0.9"/>
            <path d="M6 9h8M6 12h5" stroke="var(--forest-deep)" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </span>
        <div className="float-btn__text">
          <span className="float-btn__label">Book Your Stay</span>
          <span className="float-btn__sub">From USD 120 · No card needed</span>
        </div>
      </button>
      <button
        className="float-btn__close"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss booking button"
      >
        <svg viewBox="0 0 14 14" fill="none" width="10" height="10">
          <line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  )
}
