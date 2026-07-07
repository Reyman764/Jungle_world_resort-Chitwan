import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import './admin.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function authHeader() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const ACTION_META = {
  BOOKING_CREATED:          { icon: '+', label: 'Booking created',           color: '#1a4731' },
  BOOKING_STATUS_CHANGED:  { icon: '🔄', label: 'Booking status changed',  color: '#2563eb' },
  PAYMENT_STATUS_CHANGED:  { icon: '💳', label: 'Payment status changed',  color: '#16a34a' },
  PAYMENT_METHOD_CHANGED:  { icon: 'PM', label: 'Payment method changed',  color: '#0f766e' },
  PAID_AMOUNT_UPDATED:     { icon: '💰', label: 'Paid amount updated',     color: '#0891b2' },
  REFUND_AMOUNT_UPDATED:   { icon: 'RF', label: 'Refund amount updated',   color: '#dc2626' },
  BALANCE_DUE_UPDATED:     { icon: 'BD', label: 'Balance due updated',     color: '#9333ea' },
  NOTES_UPDATED:           { icon: '📝', label: 'Internal notes updated',  color: '#7c3aed' },
  CANCELLATION_REASON_UPDATED: { icon: 'CR', label: 'Cancellation reason updated', color: '#b45309' },
  BOOKING_SOFT_DELETED:        { icon: '🗑️', label: 'Moved to recycle bin',        color: '#b91c1c' },
  BOOKING_RESTORED:            { icon: '♻️', label: 'Restored from recycle bin',   color: '#0d9488' },
  BOOKING_PERMANENTLY_DELETED: { icon: '⛔', label: 'Permanently deleted',          color: '#7f1d1d' },
  FIELD_UPDATED:           { icon: '✏️', label: 'Field updated',           color: '#6b7280' },
}

const FIELD_LABELS = {
  booking:        'Booking',
  status:         'Booking Status',
  payment_status: 'Payment Status',
  payment_method: 'Payment Method',
  paid_amount:    'Paid Amount (NPR)',
  refund_amount:  'Refund Amount (NPR)',
  balance_due:    'Balance Due (NPR)',
  admin_notes:    'Internal Notes',
  cancellation_reason: 'Cancellation Reason',
}

function formatAuditValue(field, val) {
  if (val === null || val === undefined || val === '') return '—'
  if (['paid_amount', 'refund_amount', 'balance_due'].includes(field)) {
    return `NPR ${Number(val).toLocaleString()}`
  }
  if (field === 'admin_notes' && val.length > 80) return val.slice(0, 80) + '…'
  return val
}

function AuditEntry({ log }) {
  const meta = ACTION_META[log.action] || ACTION_META.FIELD_UPDATED
  const ts   = new Date(log.created_at)

  return (
    <div className="audit-entry">
      <div className="audit-entry__dot" style={{ background: meta.color }} />
      <div className="audit-entry__body">
        <div className="audit-entry__header">
          <span className="audit-entry__icon">{meta.icon}</span>
          <span className="audit-entry__action">{meta.label}</span>
          <span className="audit-entry__time">
            {ts.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}{' '}
            {ts.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="audit-entry__detail">
          <span className="audit-entry__field">
            {FIELD_LABELS[log.field_name] || log.field_name}
          </span>
          <span className="audit-entry__change">
            <span className="audit-val audit-val--old">
              {formatAuditValue(log.field_name, log.old_value)}
            </span>
            <span className="audit-arrow">→</span>
            <span className="audit-val audit-val--new">
              {formatAuditValue(log.field_name, log.new_value)}
            </span>
          </span>
        </div>

        <div className="audit-entry__by">
          Changed by <strong>{log.changed_by || 'Unknown'}</strong>
          {log.changed_by_role && <span className="audit-role-badge">{log.changed_by_role}</span>}
          {log.ip_address && <span className="audit-ip">IP {log.ip_address}</span>}
        </div>
      </div>
    </div>
  )
}

export default function AuditLogs() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`${API}/api/admin/${id}/audit-logs`, { headers: authHeader() })
      .then(r => r.json())
      .then(d => {
        if (d.logs) setLogs(d.logs)
        else setError(d.error || 'Could not load audit logs')
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div className="admin-shell admin-audit-page">
      <header className="admin-topbar">
        <div className="admin-topbar__brand">
          <button className="admin-back-btn" onClick={() => navigate(-1)}>← Back</button>
          <span className="admin-topbar__logo">Change History</span>
        </div>
        <div className="admin-topbar__right">
          <button className="admin-logout-btn" onClick={() => navigate('/admin/dashboard')}>Dashboard</button>
        </div>
      </header>

      <main className="admin-content">
        <h1 className="admin-page-title">Change History</h1>
        <p className="admin-page-sub">Audit trail for booking {id}</p>

        {loading ? (
          <div className="admin-loading"><div className="admin-spinner"/> Loading history…</div>
        ) : error ? (
          <div className="text-muted">{error}</div>
        ) : logs.length === 0 ? (
          <div className="audit-empty">No changes recorded yet.</div>
        ) : (
          <div className="audit-timeline">
            {logs.map(l => <AuditEntry key={l.id} log={l} />)}
          </div>
        )}
      </main>
    </div>
  )
}
