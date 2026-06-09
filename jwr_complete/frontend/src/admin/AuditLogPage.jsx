import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import './admin.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const ACTION_META = {
  CREATED:                     { icon: '✦', label: 'Booking Created',      color: '#1a4731', group: 'booking' },
  BOOKING_CREATED:             { icon: '✦', label: 'Booking Created',      color: '#1a4731', group: 'booking' },
  DELETED:                     { icon: '✕', label: 'Booking Deleted',      color: '#b91c1c', group: 'booking' },
  SPAM_DETECTED:               { icon: '⚑', label: 'Spam Detected',       color: '#b45309', group: 'booking' },
  BOOKING_STATUS_CHANGED:      { icon: '↻', label: 'Status Changed',      color: '#2563eb', group: 'status'  },
  PAYMENT_STATUS_CHANGED:      { icon: '₹', label: 'Payment Updated',     color: '#16a34a', group: 'payment' },
  PAID_AMOUNT_UPDATED:         { icon: '₹', label: 'Paid Amount',         color: '#0891b2', group: 'payment' },
  REFUND_AMOUNT_UPDATED:       { icon: '↩', label: 'Refund Updated',      color: '#dc2626', group: 'payment' },
  BALANCE_DUE_UPDATED:         { icon: '⊟', label: 'Balance Updated',     color: '#9333ea', group: 'payment' },
  PAYMENT_METHOD_CHANGED:      { icon: '⊞', label: 'Payment Method',      color: '#0f766e', group: 'payment' },
  NOTES_UPDATED:               { icon: '✎', label: 'Notes Updated',       color: '#7c3aed', group: 'other'   },
  CANCELLATION_REASON_UPDATED: { icon: '✕', label: 'Cancellation Noted',  color: '#b45309', group: 'other'   },
  FIELD_UPDATED:               { icon: '✏', label: 'Field Updated',       color: '#6b7280', group: 'other'   },
}

const FILTER_TABS = [
  { id: 'all',     label: 'All Bookings' },
  { id: 'status',  label: 'Status'       },
  { id: 'payment', label: 'Payments'     },
  { id: 'booking', label: 'Created'      },
  { id: 'other',   label: 'Other'        },
]

/* ── Safe date helpers ─────────────────────────────────────── */
function safeDate(val) {
  if (!val) return null
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d
}

function formatTime(d) {
  if (!d) return '—'
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function formatRelative(d) {
  if (!d) return '—'
  const today     = new Date()
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  const t = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === today.toDateString())     return `Today · ${t}`
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday · ${t}`
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ` · ${t}`
}

function authHeader() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/* ── Group all logs by booking reference ─────────────────── */
function groupByRef(logs) {
  const map = new Map()
  for (const log of logs) {
    const key = log.booking_reference || '__no_ref__'
    if (!map.has(key)) {
      map.set(key, { ref: key, isUnknown: !log.booking_reference, events: [] })
    }
    map.get(key).events.push(log)
  }

  for (const grp of map.values()) {
    grp.events.sort((a, b) => {
      const da = safeDate(a.created_at), db = safeDate(b.created_at)
      if (!da && !db) return 0
      if (!da) return  1
      if (!db) return -1
      return db - da
    })
    const top        = grp.events[0]
    grp.latestDate   = safeDate(top.created_at)
    grp.latestMeta   = ACTION_META[top.action] || ACTION_META.FIELD_UPDATED
    grp.latestActor  = top.performed_by?.name || top.changed_by || 'System'
    grp.latestValue  = top.reason || top.new_value || null
  }

  return [...map.values()].sort((a, b) => {
    if (!a.latestDate && !b.latestDate) return 0
    if (!a.latestDate) return  1
    if (!b.latestDate) return -1
    return b.latestDate - a.latestDate
  })
}

/* ── Single event row (inside accordion) ────────────────── */
function EventRow({ log }) {
  const [expanded, setExpanded] = useState(false)
  const meta  = ACTION_META[log.action] || ACTION_META.FIELD_UPDATED
  const d     = safeDate(log.created_at)
  const actor = log.performed_by?.name || log.changed_by || 'System'
  const value = log.reason || log.new_value || null
  const hasDetail = Boolean(log.old_value || log.new_value || log.field_name || log.reason || log.ip_address)

  return (
    <div className="alb-event-wrap">
      <div
        className="alb-event"
        onClick={() => hasDetail && setExpanded(e => !e)}
        style={{ cursor: hasDetail ? 'pointer' : 'default' }}
      >
        <time className="alb-event__time">{formatTime(d)}</time>
        <span className="alb-event__dot"   style={{ background: meta.color }} />
        <span className="alb-event__icon"  style={{ color: meta.color }}>{meta.icon}</span>
        <span className="alb-event__label">{meta.label}</span>
        {value && (
          <span className="alb-event__val">
            {String(value).length > 32 ? String(value).slice(0, 32) + '…' : value}
          </span>
        )}
        <span className="alb-event__spacer" />
        <span className="alb-event__actor">{actor}</span>
        {hasDetail && (
          <span className="alb-event__expand">{expanded ? '▲' : '▼'}</span>
        )}
      </div>

      {expanded && hasDetail && (
        <div className="alb-event__detail">
          {log.field_name && log.field_name !== 'booking' && (
            <div className="alb-detail-item">
              <span className="alb-detail-label">Field</span>
              <span className="alb-detail-val">{log.field_name.replace(/_/g, ' ')}</span>
            </div>
          )}
          {log.old_value && (
            <div className="alb-detail-item">
              <span className="alb-detail-label">From</span>
              <span className="alb-detail-val alb-detail-val--old">{log.old_value}</span>
            </div>
          )}
          {log.new_value && (
            <div className="alb-detail-item">
              <span className="alb-detail-label">To</span>
              <span className="alb-detail-val alb-detail-val--new">{log.new_value}</span>
            </div>
          )}
          {log.reason && !log.new_value && (
            <div className="alb-detail-item">
              <span className="alb-detail-label">Reason</span>
              <span className="alb-detail-val">{log.reason}</span>
            </div>
          )}
          {log.ip_address && (
            <div className="alb-detail-item">
              <span className="alb-detail-label">IP</span>
              <span className="alb-detail-val alb-detail-val--muted">{log.ip_address}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Booking accordion card ──────────────────────────────── */
function BookingCard({ group }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`alb-card ${open ? 'alb-card--open' : ''}`}>

      {/* ── Header — always visible ── */}
      <button type="button" className="alb-card__hdr" onClick={() => setOpen(o => !o)}>

        {/* Left: ref code + event count */}
        <div className="alb-card__left">
          <span className="alb-card__ref">
            {group.isUnknown ? 'No Reference' : group.ref}
          </span>
          <span className="alb-card__count">
            {group.events.length}&nbsp;event{group.events.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Centre: latest action summary */}
        <div className="alb-card__mid">
          <span className="alb-card__mid-icon" style={{ color: group.latestMeta.color }}>
            {group.latestMeta.icon}
          </span>
          <span className="alb-card__mid-label" style={{ color: group.latestMeta.color }}>
            {group.latestMeta.label}
          </span>
          {group.latestValue && (
            <span className="alb-card__mid-val">
              {String(group.latestValue).length > 22
                ? String(group.latestValue).slice(0, 22) + '…'
                : group.latestValue}
            </span>
          )}
        </div>

        {/* Right: actor + time + chevron */}
        <div className="alb-card__right">
          <span className="alb-card__actor">{group.latestActor}</span>
          <time className="alb-card__time">{formatRelative(group.latestDate)}</time>
          <span className={`alb-card__chev ${open ? 'alb-card__chev--open' : ''}`}>›</span>
        </div>
      </button>

      {/* ── Expanded events list ── */}
      {open && (
        <div className="alb-card__body">
          <div className="alb-card__body-inner">
            {group.events.map(log => <EventRow key={log.id} log={log} />)}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────── */
export default function AuditLogPage() {
  const navigate = useNavigate()
  const [logs,    setLogs]    = useState([])
  const [total,   setTotal]   = useState(0)
  const [offset,  setOffset]  = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('all')
  const [search,  setSearch]  = useState('')
  const limit = 100

  useEffect(() => {
    setLoading(true)
    fetch(`${API}/api/admin/audit-logs?limit=${limit}&offset=${offset}`, { headers: authHeader() })
      .then(r => r.json())
      .then(d => {
        if (offset === 0) setLogs(d.logs || [])
        else setLogs(prev => [...prev, ...(d.logs || [])])
        setTotal(d.total || 0)
      })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [offset])

  /* Unique booking counts per filter group */
  const counts = useMemo(() => {
    const sets = { all: new Set(), status: new Set(), payment: new Set(), booking: new Set(), other: new Set() }
    for (const l of logs) {
      const ref = l.booking_reference || '__no_ref__'
      const g   = (ACTION_META[l.action] || ACTION_META.FIELD_UPDATED).group
      sets.all.add(ref)
      sets[g]?.add(ref)
    }
    return {
      all:     sets.all.size,
      status:  sets.status.size,
      payment: sets.payment.size,
      booking: sets.booking.size,
      other:   sets.other.size,
    }
  }, [logs])

  /* Filter + search at event level, then group by ref */
  const filteredLogs = useMemo(() => {
    let r = logs
    if (filter !== 'all') {
      r = r.filter(l => (ACTION_META[l.action] || ACTION_META.FIELD_UPDATED).group === filter)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      r = r.filter(l =>
        (l.booking_reference || '').toLowerCase().includes(q) ||
        (l.action            || '').toLowerCase().includes(q) ||
        (l.performed_by?.name || l.changed_by || '').toLowerCase().includes(q) ||
        (l.new_value         || '').toLowerCase().includes(q) ||
        (l.reason            || '').toLowerCase().includes(q)
      )
    }
    return r
  }, [logs, filter, search])

  const groups = useMemo(() => groupByRef(filteredLogs), [filteredLogs])

  return (
    <div className="admin-shell admin-audit-page">
      <header className="admin-topbar">
        <div className="admin-topbar__brand">
          <button type="button" className="admin-back-btn" onClick={() => navigate('/admin/dashboard')}>
            ← Back to Dashboard
          </button>
          <span className="admin-topbar__logo">Activity Log</span>
        </div>
      </header>

      <main className="admin-content">

        {/* Page header + search */}
        <div className="alp-header">
          <div>
            <h1 className="admin-page-title">Booking Activity Log</h1>
            <p className="admin-page-sub">
              {counts.all} booking{counts.all !== 1 ? 's' : ''} · {total} total events
            </p>
          </div>
          <input
            type="search"
            className="alp-search"
            placeholder="Search by ref, action, or staff…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filter tabs — counts show unique bookings */}
        <div className="alp-tabs">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`alp-tab ${filter === tab.id ? 'alp-tab--active' : ''}`}
              onClick={() => setFilter(tab.id)}
            >
              {tab.label}
              <span className="alp-tab__n">{counts[tab.id] || 0}</span>
            </button>
          ))}
        </div>

        {/* Body */}
        {loading && offset === 0 ? (
          <div className="admin-loading">
            <div className="admin-spinner" />
            Loading activity…
          </div>
        ) : groups.length === 0 ? (
          <div className="audit-empty">
            {search ? `No results for "${search}"` : 'No activity recorded yet.'}
          </div>
        ) : (
          <div className="alb-list">
            {groups.map(grp => <BookingCard key={grp.ref} group={grp} />)}
          </div>
        )}

        {logs.length < total && !loading && (
          <button
            type="button"
            className="admin-audit-load-more"
            onClick={() => setOffset(o => o + limit)}
          >
            Load more · {total - logs.length} remaining
          </button>
        )}

      </main>
    </div>
  )
}
