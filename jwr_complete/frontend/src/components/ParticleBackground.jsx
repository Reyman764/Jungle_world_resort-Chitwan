import React, { useMemo } from 'react'

/**
 * ParticleBackground — Phase 2 Enhancement
 * 16 pure-CSS gold ambient particles, no JS animation loop.
 * Only renders in dark mode for luxury jungle-night atmosphere.
 */
const particles = [
  { size: 2, x: 8,  y: 15, delay: 0,    duration: 28 },
  { size: 1, x: 22, y: 72, delay: 4,    duration: 35 },
  { size: 3, x: 38, y: 33, delay: 7,    duration: 24 },
  { size: 1, x: 55, y: 88, delay: 2,    duration: 32 },
  { size: 2, x: 67, y: 12, delay: 9,    duration: 27 },
  { size: 1, x: 78, y: 55, delay: 5,    duration: 38 },
  { size: 2, x: 91, y: 28, delay: 12,   duration: 22 },
  { size: 3, x: 14, y: 91, delay: 6,    duration: 30 },
  { size: 1, x: 45, y: 47, delay: 15,   duration: 26 },
  { size: 2, x: 83, y: 80, delay: 3,    duration: 33 },
  { size: 1, x: 30, y: 62, delay: 11,   duration: 29 },
  { size: 2, x: 62, y: 38, delay: 8,    duration: 36 },
  { size: 1, x: 5,  y: 50, delay: 14,   duration: 25 },
  { size: 3, x: 72, y: 95, delay: 1,    duration: 31 },
  { size: 1, x: 48, y: 8,  delay: 17,   duration: 23 },
  { size: 2, x: 95, y: 65, delay: 10,   duration: 34 },
]

export default function ParticleBackground() {
  return (
    <div
      className="particle-bg"
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'hidden',
      }}
    >
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(200,151,58,0.55), rgba(200,151,58,0.04))',
            animation: `particleFloat ${p.duration}s ease-in-out ${p.delay}s infinite`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  )
}
