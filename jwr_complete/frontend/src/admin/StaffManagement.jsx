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

function StatusBadge({ status }) {
  const cls = {
    active:    'sm-badge--active',
    pending:   'sm-badge--pending',
    inactive:  'sm-badge--inactive',
    suspended: 'sm-badge--suspended',
  }[status] || 'sm-badge--inactive'
  return <span className={`sm-badge ${cls}`}>{status || '—'}</span>
}

function RoleBadge({ role }) {
  const cls = {
    admin:   'sm-role-badge--admin',
    manager: 'sm-role-badge--manager',
    staff:   'sm-role-badge--staff',
  }[role] || ''
  return <span className={`sm-role-badge ${cls}`}>{role || '—'}</span>
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
    <div className="sm-modal-overlay" onClick={onClose}>
      <div className="sm-modal" onClick={e => e.stopPropagation()}>
        <div className="sm-modal-header">
          <div>
            <h3 className="sm-modal-title">
              Audit Log · {staffMember.first_name} {staffMember.last_name}
            </h3>
            <div className="sm-modal-sub">{staffMember.email}</div>
          </div>
          <button className="sm-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="sm-modal-body">
          {loading ? (
            <div className="sm-empty">Loading logs…</div>
          ) : logs.length === 0 ? (
            <div className="sm-empty">No log entries found.</div>
          ) : (
            <table className="sm-log-table">
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td className="sm-log-date">{formatDate(log.created_at)}</td>
                    <td className="sm-log-body">
                      <div className="sm-log-action">{log.action}</div>
                      {log.details   && <div className="sm-log-detail">{log.details}</div>}
                      {log.ip_address && <div className="sm-log-ip">IP: {log.ip_address}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Add Staff Modal ────────────────────────────────────────────
function AddStaffModal({ onClose, onCreated }) {
  const [form, setForm]       = useState({
    firstName: '', lastName: '', email: '', password: '', role: 'staff',
  })
  const [showPass, setShowPass] = useState(false)
  const [error,    setError]   = useState('')
  const [loading,  setLoading] = useState(false)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  function generatePassword() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#'
    let pass = ''
    for (let i = 0; i < 12; i++) {
      pass += chars[Math.floor(Math.random() * chars.length)]
    }
    setForm(f => ({ ...f, password: pass }))
    setShowPass(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('First and last name are required.')
      return
    }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('A valid email address is required.')
      return
    }
    if (form.password.length < 6) {
      setError('Temporary password must be at least 6 characters.')
      return
    }

    setLoading(true)
    try {
      const res  = await fetch(`${API}/api/admin/staff`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body:    JSON.stringify({
          email:     form.email.trim(),
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
    <div className="sm-modal-overlay" onClick={onClose}>
      <div className="sm-modal sm-modal--form" onClick={e => e.stopPropagation()}>
        <div className="sm-modal-header">
          <div>
            <h3 className="sm-modal-title">Add Staff Member</h3>
            <div className="sm-modal-sub">
              Account is created active. Staff must change password on first login.
            </div>
          </div>
          <button className="sm-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="sm-modal-body">
          {error && <div className="sm-alert sm-alert--error" style={{ marginBottom: 16 }}>{error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="sm-form-row">
              <div className="sm-form-group">
                <label className="sm-form-label">First Name *</label>
                <input
                  name="firstName" type="text" className="sm-form-input"
                  placeholder="Ramesh" value={form.firstName} onChange={handleChange}
                  autoFocus required
                />
              </div>
              <div className="sm-form-group">
                <label className="sm-form-label">Last Name *</label>
                <input
                  name="lastName" type="text" className="sm-form-input"
                  placeholder="Thapa" value={form.lastName} onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="sm-form-group">
              <label className="sm-form-label">Email Address *</label>
              <input
                name="email" type="email" className="sm-form-input"
                placeholder="staff@jungleworldresort.com" value={form.email} onChange={handleChange}
                required
              />
            </div>

            <div className="sm-form-group">
              <label className="sm-form-label">Role *</label>
              <select name="role" className="sm-select sm-form-input" value={form.role} onChange={handleChange}>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="sm-form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="sm-form-label" style={{ margin: 0 }}>Temporary Password *</label>
                <button type="button" className="sm-gen-btn" onClick={generatePassword}>
                  ⟳ Generate
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  className="sm-form-input"
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={handleChange}
                  required
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  className="sm-show-btn"
                  onClick={() => setShowPass(s => !s)}
                  tabIndex={-1}
                >
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
              {form.password && (
                <div className="sm-pass-hint">
                  Share this password with the staff member via a secure channel.
                  They will be prompted to change it on first login.
                </div>
              )}
            </div>

            <div className="sm-modal-footer">
              <button type="button" className="sm-cancel-btn" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="sm-submit-btn" disabled={loading}>
                {loading ? 'Creating…' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
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

  const [staff,      setStaff]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [message,    setMessage]    = useState('')
  const [msgType,    setMsgType]    = useState('success')
  const [logTarget,  setLogTarget]  = useState(null)
  const [showAdd,    setShowAdd]    = useState(false)
  const [updating,   setUpdating]   = useState({})
  const [deleting,   setDeleting]   = useState(null)

  const loadStaff = useCallback(() => {
    setLoading(true)
    fetch(`${API}/api/admin/staff`, { headers: authHeader() })
      .then(r => r.json())
      .then(d => { setStaff(d.staff || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { loadStaff() }, [loadStaff])

  function showMsg(text, type = 'success') {
    setMessage(text)
    setMsgType(type)
    setTimeout(() => setMessage(''), 3500)
  }

  async function patchStaff(id, endpoint, body, successMsg) {
    const key = id + endpoint
    setUpdating(u => ({ ...u, [key]: true }))
    try {
      const res  = await fetch(`${API}/api/admin/staff/${id}/${endpoint}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body:    JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { showMsg(`❌ ${data.error || 'Update failed'}`, 'error'); return }
      showMsg(`✅ ${successMsg}`, 'success')
      loadStaff()
    } catch {
      showMsg('❌ Network error. Please try again.', 'error')
    } finally {
      setUpdating(u => ({ ...u, [key]: false }))
    }
  }

  async function handleDelete(member) {
    if (!window.confirm(`Delete account for ${member.first_name} ${member.last_name}?\n\nThis cannot be undone.`)) return
    setDeleting(member.id)
    try {
      const res  = await fetch(`${API}/api/admin/staff/${member.id}`, {
        method:  'DELETE',
        headers: authHeader(),
      })
      const data = await res.json()
      if (!res.ok) { showMsg(`❌ ${data.error || 'Delete failed'}`, 'error'); return }
      showMsg(`✅ Account deleted`, 'success')
      loadStaff()
    } catch {
      showMsg('❌ Network error. Please try again.', 'error')
    } finally {
      setDeleting(null)
    }
  }

  function handleStaffCreated(newStaff) {
    setShowAdd(false)
    showMsg(`✅ Account created for ${newStaff?.email || 'staff member'}`, 'success')
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
          <div>
            <h2>Staff Accounts</h2>
            <p>
              {staff.length} {staff.length === 1 ? 'member' : 'members'} ·
              Manage roles and account status
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {isAdmin && (
              <button className="sm-add-btn" onClick={() => setShowAdd(true)}>
                + Add Staff
              </button>
            )}
            <button className="sm-refresh-btn" onClick={loadStaff}>↺ Refresh</button>
          </div>
        </div>

        {/* Alert */}
        {message && <div className={`sm-alert sm-alert--${msgType}`}>{message}</div>}

        {/* Table */}
        {loading ? (
          <div className="sm-empty">Loading staff…</div>
        ) : staff.length === 0 ? (
          <div className="sm-empty">No staff accounts found.</div>
        ) : (
          <div className="sm-table-wrap">
            <table className="sm-table">
              <thead>
                <tr>
                  <th>Name</th>
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
                    <tr key={member.id}>
                      {/* Name */}
                      <td>
                        <span className="sm-name">
                          {member.first_name} {member.last_name}
                        </span>
                        {isSelf && <span className="sm-you">(you)</span>}
                        {member.must_change_password && (
                          <span className="sm-temp-badge" title="Temporary password — must change on login">
                            temp pwd
                          </span>
                        )}
                      </td>

                      {/* Email */}
                      <td><span className="sm-email">{member.email}</span></td>

                      {/* Role */}
                      <td>
                        {isAdmin && !isSelf ? (
                          <select
                            className="sm-select"
                            value={member.role}
                            disabled={!!updating[member.id + 'role']}
                            onChange={e =>
                              patchStaff(member.id, 'role', { role: e.target.value },
                                `Role updated to ${e.target.value}`)
                            }
                          >
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        ) : (
                          <RoleBadge role={member.role} />
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        {isMgr && !isSelf ? (
                          <select
                            className="sm-select"
                            value={member.status || 'active'}
                            disabled={!!updating[member.id + 'status']}
                            onChange={e =>
                              patchStaff(member.id, 'status', { status: e.target.value },
                                `Status updated to ${e.target.value}`)
                            }
                          >
                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : (
                          <StatusBadge status={member.status || 'active'} />
                        )}
                      </td>

                      {/* Last Login */}
                      <td>
                        <span style={{ fontSize: 12, color: 'var(--a-text-4)' }}>
                          {formatDate(member.last_login)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            className="sm-logs-btn"
                            onClick={() => setLogTarget(member)}
                          >
                            Logs
                          </button>
                          {isAdmin && !isSelf && (
                            <button
                              className="sm-delete-btn"
                              disabled={deleting === member.id}
                              onClick={() => handleDelete(member)}
                            >
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
        )}
      </div>
    </>
  )
}
