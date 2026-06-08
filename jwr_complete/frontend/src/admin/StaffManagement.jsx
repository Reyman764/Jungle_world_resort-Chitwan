import React, { useState, useEffect, useCallback } from 'react'
import './StaffManagement.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function authHeader() {
  const token = localStorage.getItem('token') || localStorage.getItem('staffToken')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

function formatDateShort(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

// ── Initials avatar ────────────────────────────────────────────
function Avatar({ firstName, lastName, role }) {
  const initials = `${(firstName || '?')[0]}${(lastName || '')[0] || ''}`.toUpperCase()
  const colors = {
    admin:   { bg: 'rgba(200,151,58,.15)', text: '#92580c', border: 'rgba(200,151,58,.3)' },
    manager: { bg: 'rgba(139,92,246,.1)',  text: '#6d28d9', border: 'rgba(139,92,246,.25)' },
    staff:   { bg: 'rgba(26,71,49,.1)',    text: '#1a4731', border: 'rgba(26,71,49,.2)' },
  }
  const c = colors[role] || colors.staff
  return (
    <div className="sm-avatar" style={{ background: c.bg, color: c.text, border: `1.5px solid ${c.border}` }}>
      {initials}
    </div>
  )
}

// ── Status Badge ───────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    active:    { cls: 'sm-badge--active',    dot: '#22c55e', label: 'Active' },
    pending:   { cls: 'sm-badge--pending',   dot: '#f59e0b', label: 'Pending' },
    inactive:  { cls: 'sm-badge--inactive',  dot: '#94a3b8', label: 'Inactive' },
    suspended: { cls: 'sm-badge--suspended', dot: '#ef4444', label: 'Suspended' },
  }
  const m = map[status] || map.inactive
  return (
    <span className={`sm-badge ${m.cls}`}>
      <span className="sm-badge-dot" style={{ background: m.dot }} />
      {m.label}
    </span>
  )
}

// ── Role Badge ─────────────────────────────────────────────────
function RoleBadge({ role }) {
  const map = {
    admin:   'sm-role--admin',
    manager: 'sm-role--manager',
    staff:   'sm-role--staff',
  }
  return <span className={`sm-role ${map[role] || ''}`}>{role || '—'}</span>
}

// ── Audit Log Modal ────────────────────────────────────────────
function LogModal({ staffMember, onClose }) {
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!staffMember) return
    setLoading(true)
    fetch(`${API}/api/admin/staff/${staffMember.id}/logs`, { headers: authHeader() })
      .then(r => r.json())
      .then(d => { setLogs(d.logs || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [staffMember])

  if (!staffMember) return null

  return (
    <div className="sm-overlay" onClick={onClose}>
      <div className="sm-modal" onClick={e => e.stopPropagation()}>
        <div className="sm-modal__header">
          <div className="sm-modal__header-left">
            <Avatar firstName={staffMember.first_name} lastName={staffMember.last_name} role={staffMember.role} />
            <div>
              <h3 className="sm-modal__title">Activity Log</h3>
              <div className="sm-modal__sub">{staffMember.first_name} {staffMember.last_name} · {staffMember.email}</div>
            </div>
          </div>
          <button className="sm-close-btn" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="sm-modal__body">
          {loading ? (
            <div className="sm-spinner-wrap"><div className="sm-spinner" /></div>
          ) : logs.length === 0 ? (
            <div className="sm-empty-state">
              <div className="sm-empty-state__icon">📋</div>
              <div>No log entries found.</div>
            </div>
          ) : (
            <div className="sm-log-list">
              {logs.map(log => (
                <div key={log.id} className="sm-log-item">
                  <div className="sm-log-item__dot" />
                  <div className="sm-log-item__body">
                    <div className="sm-log-item__action">{log.action.replace(/_/g, ' ')}</div>
                    {log.details && <div className="sm-log-item__detail">{log.details}</div>}
                    <div className="sm-log-item__meta">
                      {formatDate(log.created_at)}
                      {log.ip_address && <span className="sm-log-item__ip"> · {log.ip_address}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Add Staff Modal ────────────────────────────────────────────
function AddStaffModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', role: 'staff',
  })
  const [showPass, setShowPass] = useState(false)
  const [error,    setError]   = useState('')
  const [loading,  setLoading] = useState(false)
  const [copied,   setCopied]  = useState(false)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  function generatePassword() {
    const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ'
    const lower = 'abcdefghjkmnpqrstuvwxyz'
    const nums  = '23456789'
    const syms  = '!@#$'
    const all   = upper + lower + nums + syms
    let pass = upper[Math.floor(Math.random()*upper.length)]
              + lower[Math.floor(Math.random()*lower.length)]
              + nums[Math.floor(Math.random()*nums.length)]
              + syms[Math.floor(Math.random()*syms.length)]
    for (let i = 4; i < 14; i++) pass += all[Math.floor(Math.random() * all.length)]
    // shuffle
    pass = pass.split('').sort(() => Math.random() - 0.5).join('')
    setForm(f => ({ ...f, password: pass }))
    setShowPass(true)
    setCopied(false)
  }

  async function copyPassword() {
    try { await navigator.clipboard.writeText(form.password); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    catch { /* ignore */ }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.firstName.trim() || !form.lastName.trim()) { setError('First and last name are required.'); return }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError('A valid email address is required.'); return }
    if (form.password.length < 6) { setError('Temporary password must be at least 6 characters.'); return }

    setLoading(true)
    try {
      const res  = await fetch(`${API}/api/admin/staff`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body:    JSON.stringify({
          email:     form.email.trim().toLowerCase(),
          password:  form.password,
          firstName: form.firstName.trim(),
          lastName:  form.lastName.trim(),
          role:      form.role,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to create account.'); return }
      onCreated(data.staff)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="sm-overlay" onClick={onClose}>
      <div className="sm-modal sm-modal--form" onClick={e => e.stopPropagation()}>
        <div className="sm-modal__header sm-modal__header--form">
          <div>
            <h3 className="sm-modal__title">Add Staff Member</h3>
            <div className="sm-modal__sub">Account is active immediately · Staff changes password on first login</div>
          </div>
          <button className="sm-close-btn" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="sm-modal__body">
          {error && (
            <div className="sm-form-error">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="sm-form-row">
              <div className="sm-form-group">
                <label className="sm-label">First Name *</label>
                <input name="firstName" type="text" className="sm-input"
                  placeholder="Ramesh" value={form.firstName} onChange={handleChange}
                  autoFocus required />
              </div>
              <div className="sm-form-group">
                <label className="sm-label">Last Name *</label>
                <input name="lastName" type="text" className="sm-input"
                  placeholder="Thapa" value={form.lastName} onChange={handleChange}
                  required />
              </div>
            </div>

            <div className="sm-form-group">
              <label className="sm-label">Email Address *</label>
              <input name="email" type="email" className="sm-input"
                placeholder="staff@jungleworldresort.com" value={form.email}
                onChange={handleChange} required />
            </div>

            <div className="sm-form-group">
              <label className="sm-label">Role *</label>
              <div className="sm-role-picker">
                {[{ v: 'staff', label: 'Staff', desc: 'View bookings' },
                  { v: 'admin', label: 'Admin', desc: 'Full access' }].map(opt => (
                  <label key={opt.v} className={`sm-role-opt${form.role === opt.v ? ' sm-role-opt--active' : ''}`}>
                    <input type="radio" name="role" value={opt.v}
                      checked={form.role === opt.v}
                      onChange={handleChange} />
                    <div className="sm-role-opt__body">
                      <span className="sm-role-opt__label">{opt.label}</span>
                      <span className="sm-role-opt__desc">{opt.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="sm-form-group">
              <div className="sm-label-row">
                <label className="sm-label">Temporary Password *</label>
                <button type="button" className="sm-gen-btn" onClick={generatePassword}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M2 8a6 6 0 1 1 1 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                    <path d="M2 11V8h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Generate
                </button>
              </div>
              <div className="sm-input-wrap">
                <input name="password"
                  type={showPass ? 'text' : 'password'}
                  className="sm-input sm-input--pass"
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={handleChange} required />
                <div className="sm-input-actions">
                  {form.password && (
                    <button type="button" className="sm-icon-btn" onClick={copyPassword} title={copied ? 'Copied!' : 'Copy password'}>
                      {copied
                        ? <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 8l4 4 8-8" stroke="#22c55e" strokeWidth="2" strokeLinecap="round"/></svg>
                        : <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="5" y="1" width="9" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M2 5h1.5M2 5v9a1 1 0 001 1h7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                      }
                    </button>
                  )}
                  <button type="button" className="sm-icon-btn" onClick={() => setShowPass(s => !s)}>
                    {showPass
                      ? <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.4"/><line x1="1" y1="1" x2="15" y2="15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                      : <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.4"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/></svg>
                    }
                  </button>
                </div>
              </div>
              {form.password && (
                <div className="sm-pass-hint">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM8 7v4M8 5h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Share this password securely. Staff will be prompted to change it on first login.
                </div>
              )}
            </div>

            <div className="sm-modal__footer">
              <button type="button" className="sm-btn sm-btn--ghost" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="sm-btn sm-btn--primary" disabled={loading}>
                {loading
                  ? <><span className="sm-spinner-inline" /> Creating…</>
                  : <>
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                        <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      Create Account
                    </>
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── Staff Card (mobile) ────────────────────────────────────────
function StaffCard({ member, isSelf, isAdmin, isMgr, onLogs, onDelete, onPatch, updating, deleting }) {
  const ROLES    = ['staff', 'admin']
  const STATUSES = ['pending', 'active', 'inactive', 'suspended']

  return (
    <div className={`sm-card${isSelf ? ' sm-card--self' : ''}`}>
      <div className="sm-card__top">
        <div className="sm-card__identity">
          <Avatar firstName={member.first_name} lastName={member.last_name} role={member.role} />
          <div>
            <div className="sm-card__name">
              {member.first_name} {member.last_name}
              {isSelf && <span className="sm-you">you</span>}
              {member.must_change_password && (
                <span className="sm-temp" title="Temporary password — must change on login">temp pwd</span>
              )}
            </div>
            <div className="sm-card__email">{member.email}</div>
          </div>
        </div>
        <div className="sm-card__badges">
          {isAdmin && !isSelf ? (
            <select className="sm-select sm-select--compact"
              value={member.role}
              disabled={!!updating[member.id + 'role']}
              onChange={e => onPatch(member.id, 'role', { role: e.target.value }, `Role updated to ${e.target.value}`)}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          ) : <RoleBadge role={member.role} />}
        </div>
      </div>

      <div className="sm-card__row">
        <div className="sm-card__field">
          <span className="sm-card__field-label">Status</span>
          {isMgr && !isSelf ? (
            <select className="sm-select sm-select--compact"
              value={member.status || 'active'}
              disabled={!!updating[member.id + 'status']}
              onChange={e => onPatch(member.id, 'status', { status: e.target.value }, `Status updated to ${e.target.value}`)}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : <StatusBadge status={member.status || 'active'} />}
        </div>
        <div className="sm-card__field">
          <span className="sm-card__field-label">Last Login</span>
          <span className="sm-card__field-val">{formatDateShort(member.last_login)}</span>
        </div>
      </div>

      <div className="sm-card__actions">
        <button className="sm-btn sm-btn--outline-sm" onClick={() => onLogs(member)}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M2 4h12M2 8h8M2 12h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          View Logs
        </button>
        {isAdmin && !isSelf && (
          <button className="sm-btn sm-btn--danger-sm"
            disabled={deleting === member.id}
            onClick={() => onDelete(member)}>
            {deleting === member.id
              ? <><span className="sm-spinner-inline sm-spinner-inline--sm" /> Deleting…</>
              : <><svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4h12M6 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4M5 4l.75 9.5h4.5L11 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg> Delete</>
            }
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────
const ROLES    = ['staff', 'admin']
const STATUSES = ['pending', 'active', 'inactive', 'suspended']

export default function StaffManagement() {
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}') }
    catch { return {} }
  })()

  const [staff,    setStaff]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [message,  setMessage]  = useState('')
  const [msgType,  setMsgType]  = useState('success')
  const [logTarget, setLogTarget] = useState(null)
  const [showAdd,  setShowAdd]  = useState(false)
  const [updating, setUpdating] = useState({})
  const [deleting, setDeleting] = useState(null)

  const loadStaff = useCallback(() => {
    setLoading(true)
    fetch(`${API}/api/admin/staff`, { headers: authHeader() })
      .then(r => r.json())
      .then(d => { setStaff(d.staff || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { loadStaff() }, [loadStaff])

  function showMsg(text, type = 'success') {
    setMessage(text); setMsgType(type)
    setTimeout(() => setMessage(''), 3500)
  }

  async function patchStaff(id, endpoint, body, successMsg) {
    const key = id + endpoint
    setUpdating(u => ({ ...u, [key]: true }))
    try {
      const res  = await fetch(`${API}/api/admin/staff/${id}/${endpoint}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { showMsg(`${data.error || 'Update failed'}`, 'error'); return }
      showMsg(successMsg, 'success')
      loadStaff()
    } catch { showMsg('Network error. Please try again.', 'error') }
    finally { setUpdating(u => ({ ...u, [key]: false })) }
  }

  async function handleDelete(member) {
    if (!window.confirm(`Delete account for ${member.first_name} ${member.last_name}?\n\nThis cannot be undone.`)) return
    setDeleting(member.id)
    try {
      const res  = await fetch(`${API}/api/admin/staff/${member.id}`, {
        method: 'DELETE', headers: authHeader(),
      })
      const data = await res.json()
      if (!res.ok) { showMsg(data.error || 'Delete failed', 'error'); return }
      showMsg('Account deleted', 'success')
      loadStaff()
    } catch { showMsg('Network error. Please try again.', 'error') }
    finally { setDeleting(null) }
  }

  function handleStaffCreated(newStaff) {
    setShowAdd(false)
    showMsg(`Account created for ${newStaff?.email || 'staff member'}`, 'success')
    loadStaff()
  }

  const isAdmin = currentUser.role === 'admin'
  const isMgr   = currentUser.role === 'manager' || isAdmin

  return (
    <>
      {logTarget && <LogModal staffMember={logTarget} onClose={() => setLogTarget(null)} />}
      {showAdd   && <AddStaffModal onClose={() => setShowAdd(false)} onCreated={handleStaffCreated} />}

      <div className="sm-wrap">
        {/* Header */}
        <div className="sm-header">
          <div className="sm-header__text">
            <h2 className="sm-header__title">Staff Accounts</h2>
            <p className="sm-header__sub">
              {staff.length} {staff.length === 1 ? 'member' : 'members'} · Manage roles and account status
            </p>
          </div>
          <div className="sm-header__actions">
            {isAdmin && (
              <button className="sm-btn sm-btn--primary" onClick={() => setShowAdd(true)}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Add Staff
              </button>
            )}
            <button className="sm-btn sm-btn--ghost" onClick={loadStaff}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M2 8a6 6 0 1 1 1 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                <path d="M2 11V8h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Alert */}
        {message && (
          <div className={`sm-alert sm-alert--${msgType}`}>
            {msgType === 'success'
              ? <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 8l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              : <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4"/><path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            }
            {message}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="sm-loading">
            <div className="sm-spinner" />
            <span>Loading staff…</span>
          </div>
        ) : staff.length === 0 ? (
          <div className="sm-empty-state">
            <div className="sm-empty-state__icon">👥</div>
            <div className="sm-empty-state__text">No staff accounts found.</div>
            {isAdmin && <button className="sm-btn sm-btn--primary" onClick={() => setShowAdd(true)}>Add First Staff Member</button>}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="sm-table-wrap">
              <table className="sm-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map(member => {
                    const isSelf = member.id === currentUser.id
                    return (
                      <tr key={member.id} className={isSelf ? 'sm-row--self' : ''}>
                        <td>
                          <div className="sm-member-cell">
                            <Avatar firstName={member.first_name} lastName={member.last_name} role={member.role} />
                            <div>
                              <div className="sm-name">
                                {member.first_name} {member.last_name}
                                {isSelf && <span className="sm-you">you</span>}
                                {member.must_change_password && (
                                  <span className="sm-temp" title="Temporary password">temp pwd</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td><span className="sm-email">{member.email}</span></td>
                        <td>
                          {isAdmin && !isSelf ? (
                            <select className="sm-select"
                              value={member.role}
                              disabled={!!updating[member.id + 'role']}
                              onChange={e => patchStaff(member.id, 'role', { role: e.target.value }, `Role updated to ${e.target.value}`)}>
                              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                          ) : <RoleBadge role={member.role} />}
                        </td>
                        <td>
                          {isMgr && !isSelf ? (
                            <select className="sm-select"
                              value={member.status || 'active'}
                              disabled={!!updating[member.id + 'status']}
                              onChange={e => patchStaff(member.id, 'status', { status: e.target.value }, `Status updated to ${e.target.value}`)}>
                              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          ) : <StatusBadge status={member.status || 'active'} />}
                        </td>
                        <td><span className="sm-last-login">{formatDate(member.last_login)}</span></td>
                        <td>
                          <div className="sm-actions">
                            <button className="sm-btn sm-btn--outline-sm" onClick={() => setLogTarget(member)}>
                              Logs
                            </button>
                            {isAdmin && !isSelf && (
                              <button className="sm-btn sm-btn--danger-sm"
                                disabled={deleting === member.id}
                                onClick={() => handleDelete(member)}>
                                {deleting === member.id ? '…' : 'Delete'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm-cards">
              {staff.map(member => (
                <StaffCard
                  key={member.id}
                  member={member}
                  isSelf={member.id === currentUser.id}
                  isAdmin={isAdmin}
                  isMgr={isMgr}
                  onLogs={setLogTarget}
                  onDelete={handleDelete}
                  onPatch={patchStaff}
                  updating={updating}
                  deleting={deleting}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}
