import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './admin.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const ACTION_LABELS = {
  CREATED: 'Booking created',
  BOOKING_CREATED: 'Booking created',
  DELETED: 'Booking deleted',
  SPAM_DETECTED: 'Spam detected',
  BOOKING_STATUS_CHANGED: 'Status changed',
  PAYMENT_STATUS_CHANGED: 'Payment updated',
  FIELD_UPDATED: 'Field updated',
}

const RISK_COLORS = { low: '#16a34a', medium: '#d97706', high: '#dc2626' }

function authHeader() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export default function AuditLogPage() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const limit = 30

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
        <h1 className="admin-page-title">Booking Activity Log</h1>
        <p className="admin-page-sub">{total} events · all booking actions</p>

        {loading && offset === 0 ? (
          <div className="admin-loading"><div className="admin-spinner" /> Loading…</div>
        ) : logs.length === 0 ? (
          <div className="audit-empty">No activity recorded yet.</div>
        ) : (
          <div className="audit-log-page-list">
            {logs.map(log => {
              const risk = log.risk_level || 'low'
              return (
                <article key={log.id} className="audit-log-page-item" style={{ borderLeftColor: RISK_COLORS[risk] }}>
                  <div className="audit-log-page-item__top">
                    <span className="audit-log-page-item__action">
                      {ACTION_LABELS[log.action] || log.action.replace(/_/g, ' ')}
                    </span>
                    {log.booking_reference && (
                      <span className="audit-log-page-item__ref">{log.booking_reference}</span>
                    )}
                    <time className="audit-log-page-item__time">
                      {new Date(log.created_at).toLocaleString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </time>
                  </div>
                  <p className="audit-log-page-item__detail">
                    {log.reason || log.new_value || '—'}
                  </p>
                  <div className="audit-log-page-item__meta">
                    <span>By {log.performed_by?.name || 'System'}</span>
                    <span className={`risk-badge risk-badge--${risk}`}>{risk}</span>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {logs.length < total && !loading && (
          <button
            type="button"
            className="admin-audit-load-more"
            onClick={() => setOffset(o => o + limit)}
          >
            Load more
          </button>
        )}
      </main>
    </div>
  )
}
