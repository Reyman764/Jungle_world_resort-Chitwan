import './PackageBadges.css'
import React from 'react'

/**
 * PackageBadges — shared badge renderer for urgency + discount
 *
 * variant="overlay"  → absolute-positioned overlays on package images
 * variant="inline"   → inline pill row for detail content sections
 * variant="compare"  → stacked small pills for the compare grid
 */
export default function PackageBadges({ urgency, discount, variant = 'overlay' }) {
  if (!urgency && !discount) return null

  if (variant === 'inline') {
    return (
      <div className="pkg-hints">
        {urgency && (
          <span className="pkg-hint pkg-hint--urgency">
            <svg viewBox="0 0 16 16" fill="none" width="11" height="11" aria-hidden="true">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 4v4l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Only {urgency}
          </span>
        )}
        {discount && (
          <span className="pkg-hint pkg-hint--discount">
            <svg viewBox="0 0 16 16" fill="none" width="11" height="11" aria-hidden="true">
              <path d="M13 3L3 13M5.5 4.5a1 1 0 110 2 1 1 0 010-2zm5 5a1 1 0 110 2 1 1 0 010-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {discount}
          </span>
        )}
      </div>
    )
  }

  if (variant === 'compare') {
    return (
      <div className="compare-badges">
        {urgency  && <span className="compare-badge compare-badge--urgency">🔴 {urgency}</span>}
        {discount && <span className="compare-badge compare-badge--discount">✦ {discount}</span>}
      </div>
    )
  }

  // default: overlay on image
  return (
    <>
      {urgency  && <div className="pkg-badge pkg-badge--urgency"  aria-label={`Only ${urgency}`}>Only {urgency}</div>}
      {discount && <div className="pkg-badge pkg-badge--discount" aria-label={`${discount} available`}>✦ {discount}</div>}
    </>
  )
}
