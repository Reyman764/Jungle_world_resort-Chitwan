import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import './LeafIntro.css'

/*
 * LeafIntro
 * ─────────
 * Entire viewport tiled wall-to-wall with small SVG leaves (24 cols × 20 rows = 480).
 * On click: each leaf computes its fly-direction away from the click point and
 * launches outward — the whole carpet explodes open, revealing the website beneath.
 */

const COLS = 24
const ROWS = 20
const TOTAL = COLS * ROWS  // 480

const SHAPES = [
  { path: 'M12,2 C18,3 22,7 21,13 C20,18 16,22 12,22 C8,22 4,18 3,13 C2,7 6,3 12,2Z', vein: 'M12,3 L11,21' },
  { path: 'M12,1 C17,4 21,9 20,15 C19,20 15,23 12,23 C9,23 5,20 4,15 C3,9 7,4 12,1Z', vein: 'M12,2 L12,22' },
  { path: 'M12,3 C17,2 22,7 21,12 C20,17 17,21 12,22 C7,21 4,17 3,12 C2,7 7,2 12,3Z', vein: 'M12,3 L12,21' },
  { path: 'M12,4 C20,3 23,8 22,13 C21,18 17,21 12,21 C7,21 3,18 2,13 C1,8 4,3 12,4Z',  vein: 'M12,4 L12,20' },
  { path: 'M12,1 C15,5 17,10 16,15 C15,20 13,24 12,24 C11,24 9,20 8,15 C7,10 9,5 12,1Z', vein: 'M12,2 L12,23' },
  { path: 'M12,2 C16,4 20,9 19,14 C18,19 15,22 12,22 C9,22 6,19 5,14 C4,9 8,4 12,2Z', vein: 'M12,3 L12,21' },
]

const FILL_COLORS = [
  '#091a0e','#0a1e12','#0d2218','#0f261a','#112819',
  '#152d1e','#183320','#1a3a2a','#1d3f2d','#1f4530',
  '#234a33','#264035','#2d5a3d','#28482f','#304d38',
]

const VEIN_COLORS = [
  'rgba(74,124,92,0.35)','rgba(45,90,61,0.3)','rgba(60,110,80,0.32)',
  'rgba(40,80,55,0.28)','rgba(55,100,72,0.3)','rgba(80,130,95,0.32)',
]

// Seed per-leaf static attributes once (stable — not recalculated on re-render)
const LEAF_DATA = Array.from({ length: TOTAL }, (_, i) => ({
  shape: i % SHAPES.length,
  fill: FILL_COLORS[i % FILL_COLORS.length],
  veinColor: VEIN_COLORS[i % VEIN_COLORS.length],
  rot: (i * 47 + (i % 7) * 23) % 360,         // pseudo-random rotation
  sc: 0.80 + ((i * 31) % 100) / 500,           // 0.80 – 1.00
  op: 0.78 + ((i * 17) % 100) / 450,           // 0.78 – 1.00
}))

export default function LeafIntro({ onComplete }) {
  const [phase, setPhase] = useState('entering')  // entering | ready | opening | done
  const [flyStyles, setFlyStyles] = useState(null) // array of {tx,ty} per leaf when opening
  const containerRef = useRef(null)

  // Trigger entry animation: leaves scale in from 0
  useEffect(() => {
    // Next tick so CSS transition fires
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase('ready'))
    })
    return () => cancelAnimationFrame(t)
  }, [])

  const handleClick = useCallback((e) => {
    if (phase !== 'ready') return

    // Get click coords normalised to grid fraction
    const el = containerRef.current
    const rect = el ? el.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
    const cx = (e.clientX - rect.left) / rect.width   // 0–1
    const cy = (e.clientY - rect.top) / rect.height   // 0–1

    // Per-leaf fly vector: direction away from click, magnitude 120–200vw
    const styles = LEAF_DATA.map((_, i) => {
      const col = i % COLS
      const row = Math.floor(i / COLS)
      const lx = col / (COLS - 1)  // leaf centre x 0–1
      const ly = row / (ROWS - 1)  // leaf centre y 0–1
      let dx = lx - cx
      let dy = ly - cy
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01
      // Normalise then multiply by fly distance (px based on viewport)
      const fly = (180 + Math.random() * 120) * Math.max(window.innerWidth, window.innerHeight) / 100
      const tx = (dx / dist) * fly
      const ty = (dy / dist) * fly
      const r = 120 + Math.random() * 300
      return { tx, ty, r }
    })
    setFlyStyles(styles)
    setPhase('opening')

    setTimeout(() => {
      setPhase('done')
      onComplete?.()
    }, 950)
  }, [phase, onComplete])

  if (phase === 'done') return null

  return (
    <div
      ref={containerRef}
      className={`lfi lfi--${phase}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label="Enter Jungle World Resort — click to open"
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleClick({ clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 })}
    >
      {/* Dense leaf grid */}
      <div className="lfi__grid">
        {LEAF_DATA.map((leaf, i) => {
          const col = i % COLS
          const row = Math.floor(i / COLS)
          const lx = col / (COLS - 1)
          const ly = row / (ROWS - 1)

          // Stagger delay based on distance from center for entry, from click for exit
          const entryDelay = (Math.abs(lx - 0.5) + Math.abs(ly - 0.5)) * 0.12 + (i % 5) * 0.008

          let cellStyle = {
            '--rot': `${leaf.rot}deg`,
            '--sc': leaf.sc,
            '--op': leaf.op,
          }

          if (phase === 'opening' && flyStyles) {
            const f = flyStyles[i]
            const flyDelay = Math.sqrt((lx - 0.5) ** 2 + (ly - 0.5) ** 2) * 0.05 + (i % 7) * 0.006
            cellStyle = {
              ...cellStyle,
              transform: `rotate(${leaf.rot + f.r}deg) translate(${f.tx}px, ${f.ty}px) scale(0.3)`,
              opacity: 0,
              transition: `transform 0.7s cubic-bezier(0.2,0,0.8,1) ${flyDelay}s, opacity 0.5s ease ${flyDelay}s`,
            }
          } else if (phase === 'entering') {
            cellStyle = {
              ...cellStyle,
              transform: `rotate(${leaf.rot}deg) scale(0)`,
              opacity: 0,
              transition: 'none',
            }
          } else if (phase === 'ready') {
            cellStyle = {
              ...cellStyle,
              transform: `rotate(${leaf.rot}deg) scale(${leaf.sc})`,
              opacity: leaf.op,
              transition: `transform 0.55s cubic-bezier(0.34,1.15,0.64,1) ${entryDelay}s, opacity 0.45s ease ${entryDelay}s`,
            }
          }

          const { path, vein } = SHAPES[leaf.shape]
          return (
            <div key={i} className="lfi__cell" style={cellStyle}>
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d={path} fill={leaf.fill} stroke={leaf.fill} strokeWidth="0.3" />
                <path d={vein} fill="none" stroke={leaf.veinColor} strokeWidth="0.65" strokeLinecap="round" />
                {/* Sheen highlight */}
                <path d={path.replace('Z','').split('C')[0] + ' L' + path.match(/C[\d,. ]+$/)?.[0]?.replace(/[^\d, .]/g,'').split(' ')[0]}
                  fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
          )
        })}
      </div>

      {/* Brand card */}
      <div className={`lfi__brand${phase === 'opening' ? ' lfi__brand--exit' : ''}`}>
        <p className="lfi__eyebrow">Welcome to</p>
        <h1 className="lfi__title">Jungle World Resort</h1>
        <p className="lfi__sub">Sauraha · Chitwan National Park · Nepal</p>
        <div className="lfi__cta">
          <span className="lfi__cta-line" />
          <span className="lfi__cta-text">Click anywhere to enter</span>
          <span className="lfi__cta-line" />
        </div>
      </div>
    </div>
  )
}
