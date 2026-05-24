import React from 'react'

/**
 * SkipLink — Phase 6 Accessibility Enhancement
 * Visible on keyboard focus, jumps to main content.
 * WCAG 2.4.1 — Bypass Blocks (Level A)
 */
export default function SkipLink() {
  return (
    <a href="#main-content" className="skip-link">
      Skip to main content
    </a>
  )
}
