import React, { useEffect, useState } from 'react'

/**
 * CountdownTimer — Phase 4 Enhancement
 * Shows countdown to targetDate for urgency / early-bird offers.
 */
export default function CountdownTimer({ targetDate, label = 'Offer expires in' }) {
  const [time, setTime] = useState({ days: 0, hours: 0, mins: 0, secs: 0, expired: false })

  useEffect(() => {
    const tick = () => {
      const now = Date.now()
      const distance = new Date(targetDate).getTime() - now
      if (distance <= 0) {
        setTime({ days: 0, hours: 0, mins: 0, secs: 0, expired: true })
        return
      }
      setTime({
        days:  Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        mins:  Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        secs:  Math.floor((distance % (1000 * 60)) / 1000),
        expired: false,
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetDate])

  if (time.expired) return null

  return (
    <div className="countdown-wrap" role="timer" aria-label={`${label} countdown`}>
      <span className="countdown-label">{label}</span>
      <div className="countdown-units">
        {[
          { val: time.days,  unit: 'd' },
          { val: time.hours, unit: 'h' },
          { val: time.mins,  unit: 'm' },
          { val: time.secs,  unit: 's' },
        ].map(({ val, unit }) => (
          <div key={unit} className="countdown-unit">
            <span className="countdown-num">{String(val).padStart(2, '0')}</span>
            <span className="countdown-sym">{unit}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
