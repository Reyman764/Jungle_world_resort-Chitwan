import React, { useState, useEffect, useRef } from 'react'
import './OfferPopup.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const SESSION_KEY = 'jwr_offer_seen'
// Auto-dismiss popup after this many seconds of display
const DISPLAY_SECONDS = 20

export default function OfferPopup() {
  const [offer,    setOffer]    = useState(null)
  const [visible,  setVisible]  = useState(false)
  const [hiding,   setHiding]   = useState(false)
  const [timeLeft, setTimeLeft]  = useState(DISPLAY_SECONDS)
  const timerRef = useRef(null)

  // Fetch active offer once on mount
  useEffect(() => {
    // Only show once per session
    if (sessionStorage.getItem(SESSION_KEY)) return

    fetch(`${API}/api/offer`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.offer && data.offer.url) {
          setOffer(data.offer)
          setVisible(true)
          setTimeLeft(DISPLAY_SECONDS)
        }
      })
      .catch(() => {})
  }, [])

  // Countdown + auto-dismiss
  useEffect(() => {
    if (!visible) return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          dismiss()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [visible]) // eslint-disable-line

  function dismiss() {
    clearInterval(timerRef.current)
    setHiding(true)
    sessionStorage.setItem(SESSION_KEY, '1')
    setTimeout(() => {
      setVisible(false)
      setHiding(false)
    }, 380)
  }

  if (!visible || !offer) return null

  const progress = ((DISPLAY_SECONDS - timeLeft) / DISPLAY_SECONDS) * 100

  return (
    <div
      className={`offer-popup-overlay${hiding ? ' is-hiding' : ''}`}
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
      aria-label="Special offer"
    >
      {/* Timer progress bar at very top */}
      <div className="offer-popup__progress-wrap" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10001 }}>
        <div className="offer-popup__progress" style={{ width: `${progress}%` }} />
      </div>

      <div
        className={`offer-popup${hiding ? ' is-hiding' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button className="offer-popup__close" onClick={dismiss} aria-label="Close offer">✕</button>

        {/* Offer image */}
        <div className="offer-popup__img-wrap">
          <img
            src={offer.url}
            alt={offer.title || 'Special offer at Jungle World Resort'}
            referrerPolicy="no-referrer-when-downgrade"
          />
          {offer.title && (
            <span className="offer-popup__label">{offer.title}</span>
          )}
        </div>

        {/* Footer */}
        <div className="offer-popup__footer">
          <span className="offer-popup__tag">Special Offer · Jungle World Resort</span>
          <div className="offer-popup__timer">
            <span className="offer-popup__timer-dot" />
            <span>Closing in {timeLeft}s</span>
          </div>
        </div>
      </div>
    </div>
  )
}
