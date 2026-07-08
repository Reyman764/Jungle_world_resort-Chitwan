import React from 'react'

export const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export function authHeader() {
  const token = localStorage.getItem('token')
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

export function fmtMoney(n) {
  return `NPR ${Math.round(Number(n || 0)).toLocaleString()}`
}

export function fmtCount(n) {
  const v = Number(n || 0)
  return `${v} booking${v === 1 ? '' : 's'}`
}

export function fmtDate(d) {
  if (!d) return '—'
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

// Small "3 days ago" / "in 5 days" style relative label — used for booking
// age (drafts) and upcoming stays (active bookings).
export function fmtRelative(d) {
  if (!d) return ''
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return ''
  const diffMs = date.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)
  const days = Math.round(diffMs / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  if (days > 1) return `in ${days} days`
  return `${Math.abs(days)} days ago`
}

export const PAYMENT_STATUS_LABEL = {
  completed: 'Completed',
  partial: 'Partially Paid',
  refunded: 'Refunded',
  pending: 'Pending',
  failed: 'Failed',
}

export const BOOKING_STATUS_LABEL = {
  draft: 'Draft',
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  checked_out: 'Checked Out',
  cancelled: 'Cancelled',
  no_show: 'No Show',
}

export const SOURCE_LABEL = {
  direct: 'Direct / Website',
  google: 'Google',
  facebook: 'Facebook',
  referral: 'Referral',
}

export function StatusBadge({ status }) {
  return (
    <span className={`status-badge status-${status || 'draft'}`}>
      {BOOKING_STATUS_LABEL[status] || status}
    </span>
  )
}

export function PayBadge({ status }) {
  if (status === 'completed') {
    return (
      <span className="pay-badge-completed" title="Paid in Full" aria-label="Paid in Full">
        ✓ Paid
      </span>
    )
  }
  return (
    <span className={`status-badge pay-${status || 'pending'}`}>
      {PAYMENT_STATUS_LABEL[status] || status}
    </span>
  )
}

/**
 * Horizontal bar list used for every "breakdown by ___" grouping, in both
 * the revenue modal (bars sized by money) and the bookings modal (bars
 * sized by count). Pass valueKey + formatValue to control what's measured
 * and how it's displayed; subKey/formatSub is an optional smaller line
 * underneath each bar (e.g. booking count, when the main value is money).
 */
export function BreakdownBarList({ items, nameKey, labelMap, valueKey, formatValue, subKey, formatSub }) {
  if (!items || items.length === 0) {
    return <p className="rev-empty-note">Nothing here yet.</p>
  }
  const max = Math.max(...items.map((i) => Number(i[valueKey])), 1)
  return (
    <div className="rev-bar-list">
      {items.map((item, idx) => {
        const raw = Number(item[valueKey])
        const pct = raw > 0 ? Math.max((raw / max) * 100, 3) : 0
        const rawLabel = item[nameKey]
        const label = (labelMap ? labelMap[rawLabel] : null) || rawLabel || 'Unknown'
        return (
          <div className="rev-bar-row" key={`${rawLabel ?? 'x'}-${idx}`}>
            <div className="rev-bar-row__top">
              <span className="rev-bar-row__label">{label}</span>
              <span className="rev-bar-row__value">{formatValue(item)}</span>
            </div>
            <div className="rev-bar-track">
              <div className="rev-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            {subKey && <div className="rev-bar-row__count">{formatSub ? formatSub(item) : item[subKey]}</div>}
          </div>
        )
      })}
    </div>
  )
}
