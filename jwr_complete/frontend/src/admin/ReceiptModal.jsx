import React, { useState, useEffect } from 'react'
import './admin.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function authHeader() {
  const token = localStorage.getItem('token')
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

function fmt(n) {
  return Math.round(Number(n || 0)).toLocaleString()
}

/**
 * Escape a value for safe injection into an HTML string.
 * Used by buildPrintDoc — guest-supplied fields (name, phone,
 * nationality, special_requests) are returned from the backend
 * and injected into a document.write() HTML template, making any
 * unescaped field a stored-XSS vector.  We escape here (in
 * addition to the backend's validation) following the defence-in-depth
 * principle: the print window is admin-only, but XSS in any context
 * is still a security issue.
 */
function esc(raw) {
  if (raw === null || raw === undefined) return ''
  return String(raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

// Generates a standalone HTML document for printing
function buildPrintDoc(booking) {
  const issueDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  const balance = Number(
    booking.balance_due ?? (Number(booking.total_price || 0) - Number(booking.paid_amount || 0))
  )
  const guests = [
    `${booking.num_adults} adult${Number(booking.num_adults) !== 1 ? 's' : ''}`,
    Number(booking.num_children) > 0
      ? `${booking.num_children} child${Number(booking.num_children) !== 1 ? 'ren' : ''}`
      : null,
  ].filter(Boolean).join(', ')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Receipt — ${booking.booking_reference}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0e1a10; background: #fff; font-size: 13px; }
    /* ─── Dark forest header ─── */
    .hdr {
      background: linear-gradient(135deg, #0b2e1a 0%, #155c31 55%, #0d3320 100%);
      padding: 22px 30px 18px;
      display: flex; align-items: flex-start; justify-content: space-between;
      position: relative; overflow: hidden;
      border-bottom: 2px solid rgba(200,151,58,.5);
    }
    .hdr::before {
      content: ''; position: absolute;
      right: -10px; top: -20px;
      width: 120px; height: 140px;
      border: 1.5px solid rgba(255,255,255,.07);
      border-radius: 60% 40% 70% 30% / 50% 60% 40% 50%;
    }
    .brand { font-size: 15px; font-weight: 900; color: #fff; letter-spacing: .15em; text-transform: uppercase; }
    .brand-sub { font-size: 9px; color: rgba(255,255,255,.5); margin-top: 3px; letter-spacing: .05em; }
    .hdr-meta { text-align: right; }
    .rtitle { font-size: 9px; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; color: rgba(255,255,255,.55); margin-bottom: 6px; }
    .rref { font-family: 'Courier New', monospace; font-size: 13px; color: #f0c25a; font-weight: 800; background: rgba(200,151,58,.15); border: 1px solid rgba(200,151,58,.45); padding: 3px 12px; border-radius: 4px; display: inline-block; letter-spacing: .04em; }
    .issue { font-size: 9px; color: rgba(255,255,255,.45); margin-top: 6px; }
    /* ─── Content area ─── */
    .content { padding: 24px 30px 30px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; border: 1px solid #e2e6ed; border-radius: 6px; overflow: hidden; margin-bottom: 22px; }
    .info-cell { padding: 11px 14px; position: relative; }
    .info-cell::before { content: ''; position: absolute; top: 11px; left: 0; bottom: 11px; width: 2px; background: #1a5c31; border-radius: 1px; }
    .info-cell-mid { border-left: 1px solid #e2e6ed; border-right: 1px solid #e2e6ed; }
    .meta-label { font-size: 8px; text-transform: uppercase; letter-spacing: .13em; color: #94a3b8; font-weight: 700; margin-bottom: 4px; }
    .meta-val { font-size: 11.5px; font-weight: 700; color: #0e1a10; margin-bottom: 1px; }
    .meta-sub { font-size: 10px; color: #637068; margin-top: 2px; }
    .pay-badge { display: inline-block; font-size: 9px; font-weight: 700; text-transform: capitalize; margin: 3px 0 2px; padding: 1.5px 8px; border-radius: 3px; }
    .pay-completed { background: rgba(21,128,61,.13); color: #15803d; }
    .pay-partial   { background: rgba(234,179,8,.13);  color: #92400e; }
    .pay-pending   { background: #f1f5f9; color: #637068; }
    /* ─── Pricing section ─── */
    .pricing-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .section-label { font-size: 8px; text-transform: uppercase; letter-spacing: .13em; font-weight: 700; color: #94a3b8; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; border: 1px solid #e2e6ed; border-radius: 6px; overflow: hidden; }
    thead th { background: linear-gradient(180deg, #0d3320, #1a5c35); font-size: 8.5px; text-transform: uppercase; letter-spacing: .08em; color: rgba(255,255,255,.8); font-weight: 700; padding: 7px 10px; text-align: left; }
    thead th:last-child { text-align: right; }
    tbody tr:nth-child(even) td { background: #f8fafb; }
    tbody td { padding: 7px 10px; font-size: 11px; color: #253328; border-bottom: 1px solid #e2e6ed; font-variant-numeric: tabular-nums; }
    tbody td:last-child { text-align: right; font-weight: 600; }
    tbody tr:last-child td { border-bottom: none; }
    /* ─── Totals ─── */
    .totals { background: #f8fafb; border: 1px solid #e2e6ed; border-radius: 6px; padding: 10px 12px; }
    .trow { display: flex; justify-content: space-between; padding: 3.5px 0; font-size: 11px; color: #637068; font-variant-numeric: tabular-nums; }
    .trow.total { font-size: 12px; font-weight: 800; color: #0e1a10; border-left: 2.5px solid #1a5c31; padding-left: 7px; margin-left: -12px; }
    .trow.paid   { color: #15803d; font-weight: 600; }
    .trow.refund { color: #b91c1c; font-weight: 600; }
    .trow.balance { font-size: 12px; font-weight: 800; color: #1d4ed8; border-left: 2.5px solid #1d4ed8; padding-left: 7px; margin-left: -12px; background: rgba(29,78,216,.04); border-radius: 0 3px 3px 0; margin-bottom: -10px; padding-bottom: 10px; padding-top: 5px; }
    .divider { height: 1px; background: #e2e6ed; margin: 5px 0; }
    /* ─── Footer ─── */
    .footer { text-align: center; margin-top: 24px; padding-top: 14px; border-top: 1px solid #e2e6ed; font-size: 9.5px; color: #94a3b8; line-height: 1.7; }
    @media print { @page { margin: 0; size: A4; } body { } }
  </style>
</head>
<body>
  <div class="hdr">
    <div>
      <div class="brand">JUNGLE WORLD RESORT</div>
      <div class="brand-sub">Sauraha, Chitwan, Bagmati Province, Nepal · jungle-world-resort.com</div>
    </div>
    <div class="hdr-meta">
      <div class="rtitle">Payment Receipt</div>
      <div class="rref">${esc(booking.booking_reference)}</div>
      <div class="issue">Issued · ${issueDate}</div>
    </div>
  </div>
  <div class="content">
  <div class="info-grid">
    <div class="info-cell">
      <div class="meta-label">Guest</div>
      <div class="meta-val">${esc(booking.guest_name)}</div>
      <div class="meta-sub">${esc(booking.guest_email)}</div>
      ${booking.guest_phone ? `<div class="meta-sub">${esc(booking.guest_phone)}</div>` : ''}
      ${booking.guest_nationality ? `<div class="meta-sub">${esc(booking.guest_nationality)}</div>` : ''}
    </div>
    <div class="info-cell info-cell-mid">
      <div class="meta-label">Stay Details</div>
      <div class="meta-val">${esc(booking.package?.name || '—')}</div>
      <div class="meta-sub">Check-in · ${esc(booking.check_in_date)}</div>
      ${booking.check_out_date ? `<div class="meta-sub">Check-out · ${esc(booking.check_out_date)}</div>` : ''}
      <div class="meta-sub">${esc(guests)}</div>
    </div>
    <div class="info-cell">
      <div class="meta-label">Payment</div>
      <div class="meta-val" style="text-transform: capitalize">${esc((booking.payment_method || 'pay_at_hotel').replace(/_/g, ' '))}</div>
      <div class="pay-badge pay-${esc(booking.payment_status)}">${esc(booking.payment_status)}</div>
      <div class="meta-sub">Source · ${esc(booking.source || 'Direct')}</div>
    </div>
  </div>
  <div class="pricing-row">
    <div>
      <div class="section-label">Pricing Breakdown</div>
      <table>
        <thead><tr><th>Description</th><th>Amount (NPR)</th></tr></thead>
        <tbody>
          <tr><td>${esc(booking.package?.name || '—')}</td><td>${fmt(booking.base_price)}</td></tr>
          <tr><td>Service Charge (10%)</td><td>${fmt(booking.service_charge)}</td></tr>
          <tr><td>VAT (13%)</td><td>${fmt(booking.vat)}</td></tr>
        </tbody>
      </table>
    </div>
    <div>
      <div class="section-label">Summary</div>
      <div class="totals">
        <div class="trow"><span>Subtotal</span><span>NPR ${fmt(booking.base_price)}</span></div>
        <div class="trow"><span>Service Charge</span><span>NPR ${fmt(booking.service_charge)}</span></div>
        <div class="trow"><span>VAT (13%)</span><span>NPR ${fmt(booking.vat)}</span></div>
        <div class="divider"></div>
        <div class="trow total"><span>Total</span><strong>NPR ${fmt(booking.total_price)}</strong></div>
        <div class="trow paid"><span>Amount Paid</span><span>NPR ${fmt(booking.paid_amount)}</span></div>
        ${Number(booking.refund_amount || 0) > 0 ? `<div class="trow refund"><span>Refunded</span><span>NPR ${fmt(booking.refund_amount)}</span></div>` : ''}
        <div class="divider"></div>
        <div class="trow balance"><span>Balance Due</span><strong>NPR ${fmt(balance)}</strong></div>
      </div>
    </div>
  </div>
  <div class="footer">
    Thank you for choosing Jungle World Resort — we look forward to welcoming you to Chitwan.<br />
    For any queries regarding this booking, please contact: reservations@jungle-world-resort.com<br />
    <strong>This is a computer-generated receipt and does not require a physical signature.</strong>
  </div>{/* /content */}
</body>
</html>`
}

export default function ReceiptModal({ bookingId, onClose }) {
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!bookingId) return
    setLoading(true)
    fetch(`${API}/api/admin/${bookingId}`, { headers: authHeader() })
      .then(r => r.json())
      .then(d => { if (d.booking) setBooking(d.booking) })
      .finally(() => setLoading(false))
  }, [bookingId])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function handlePrint() {
    if (!booking) return
    const w = window.open('', '_blank', 'width=820,height=920')
    w.document.write(buildPrintDoc(booking))
    w.document.close()
    w.focus()
    setTimeout(() => { w.print() }, 400)
  }

  const issueDate = booking
    ? new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : ''

  const balance = booking
    ? Number(booking.balance_due ?? (Number(booking.total_price || 0) - Number(booking.paid_amount || 0)))
    : 0

  const guests = booking
    ? [
        `${booking.num_adults} adult${Number(booking.num_adults) !== 1 ? 's' : ''}`,
        Number(booking.num_children) > 0
          ? `${booking.num_children} child${Number(booking.num_children) !== 1 ? 'ren' : ''}`
          : null,
      ].filter(Boolean).join(', ')
    : ''

  return (
    <div className="modal-overlay receipt-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card receipt-modal-card" role="dialog" aria-modal="true" aria-label="Payment Receipt">

        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-title">Payment Receipt</div>
            {booking && <div className="modal-ref">{booking.booking_reference}</div>}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!loading && booking && (
              <button type="button" className="receipt-print-btn" onClick={handlePrint}>
                <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
                  <path d="M4 5V2h8v3M2 5h12a1 1 0 011 1v5a1 1 0 01-1 1H2a1 1 0 01-1-1V6a1 1 0 011-1zM4 12v2h8v-2"
                    stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
                Print
              </button>
            )}
            <button className="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        {loading ? (
          <div className="admin-loading" style={{ padding: '60px 24px' }}>
            <div className="admin-spinner" /><p>Loading receipt…</p>
          </div>
        ) : !booking ? (
          <div className="admin-empty" style={{ padding: '60px 24px' }}>
            <div className="admin-empty__title">Booking not found</div>
          </div>
        ) : (
          <>
            <div className="receipt-body">

              {/* ─── Dark Forest Header (bleeds to card edges) ─── */}
              <div className="receipt-hdr-bleed">
                <div className="receipt-hdr">
                  {/* Decorative leaf watermark */}
                  <svg className="receipt-hdr__leaf" viewBox="0 0 80 110" fill="none" aria-hidden="true">
                    <path d="M40 4 C40 4,76 22,76 55 C76 80,60 96,40 100 C20 96,4 80,4 55 C4 22,40 4,40 4Z" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5"/>
                    <line x1="40" y1="10" x2="40" y2="98" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
                    <path d="M22 34 Q30 52,40 98" stroke="rgba(255,255,255,0.03)" strokeWidth="0.8"/>
                    <path d="M58 34 Q50 52,40 98" stroke="rgba(255,255,255,0.03)" strokeWidth="0.8"/>
                  </svg>
                  <div className="receipt-hdr__brand">
                    <div className="receipt-brand">JUNGLE WORLD RESORT</div>
                    <div className="receipt-brand-sub">Sauraha, Chitwan, Bagmati Province, Nepal</div>
                  </div>
                  <div className="receipt-hdr-meta">
                    <div className="receipt-title-text">PAYMENT RECEIPT</div>
                    <span className="receipt-ref-badge">{booking.booking_reference}</span>
                    <div className="receipt-issue-date">Issued · {issueDate}</div>
                  </div>
                </div>
              </div>

              {/* ─── 3-col info strip ─── */}
              <div className="receipt-info-grid">
                <div className="receipt-info-cell">
                  <div className="receipt-meta-label">Guest</div>
                  <div className="receipt-meta-val">{booking.guest_name}</div>
                  <div className="receipt-meta-sub">{booking.guest_email}</div>
                  {booking.guest_phone && <div className="receipt-meta-sub">{booking.guest_phone}</div>}
                  {booking.guest_nationality && <div className="receipt-meta-sub">{booking.guest_nationality}</div>}
                </div>
                <div className="receipt-info-cell receipt-info-cell--mid">
                  <div className="receipt-meta-label">Stay Details</div>
                  <div className="receipt-meta-val">{booking.package?.name || '—'}</div>
                  <div className="receipt-meta-sub">Check-in · {booking.check_in_date}</div>
                  {booking.check_out_date && <div className="receipt-meta-sub">Check-out · {booking.check_out_date}</div>}
                  <div className="receipt-meta-sub">{guests}</div>
                </div>
                <div className="receipt-info-cell">
                  <div className="receipt-meta-label">Payment</div>
                  <div className="receipt-meta-val receipt-capitalize">
                    {(booking.payment_method || 'pay_at_hotel').replace(/_/g, ' ')}
                  </div>
                  <div className={`receipt-pay-badge receipt-pay-${booking.payment_status}`}>
                    {booking.payment_status}
                  </div>
                  <div className="receipt-meta-sub">Source · {booking.source || 'Direct'}</div>
                </div>
              </div>

              {/* ─── Pricing (side-by-side) ─── */}
              <div className="receipt-pricing-row">
                <div className="receipt-pricing-left">
                  <div className="receipt-section-label">Pricing Breakdown</div>
                  <table className="receipt-table">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th className="receipt-th-right">NPR</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{booking.package?.name || 'Package'}</td>
                        <td className="receipt-td-right">{fmt(booking.base_price)}</td>
                      </tr>
                      <tr>
                        <td>Service Charge (10%)</td>
                        <td className="receipt-td-right">{fmt(booking.service_charge)}</td>
                      </tr>
                      <tr>
                        <td>VAT (13%)</td>
                        <td className="receipt-td-right">{fmt(booking.vat)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="receipt-pricing-right">
                  <div className="receipt-section-label">Summary</div>
                  <div className="receipt-totals">
                    <div className="receipt-trow">
                      <span>Subtotal</span>
                      <span>NPR {fmt(booking.base_price)}</span>
                    </div>
                    <div className="receipt-trow">
                      <span>Service Charge</span>
                      <span>NPR {fmt(booking.service_charge)}</span>
                    </div>
                    <div className="receipt-trow">
                      <span>VAT (13%)</span>
                      <span>NPR {fmt(booking.vat)}</span>
                    </div>
                    <div className="receipt-total-divider" />
                    <div className="receipt-trow receipt-trow--total">
                      <span>Total</span>
                      <strong>NPR {fmt(booking.total_price)}</strong>
                    </div>
                    <div className="receipt-trow receipt-trow--paid">
                      <span>Amount Paid</span>
                      <span>NPR {fmt(booking.paid_amount)}</span>
                    </div>
                    {Number(booking.refund_amount || 0) > 0 && (
                      <div className="receipt-trow receipt-trow--refund">
                        <span>Refunded</span>
                        <span>NPR {fmt(booking.refund_amount)}</span>
                      </div>
                    )}
                    <div className="receipt-total-divider" />
                    <div className="receipt-trow receipt-trow--balance">
                      <span>Balance Due</span>
                      <strong>NPR {fmt(balance)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── Footer ─── */}
              <div className="receipt-footer-note">
                Thank you for choosing Jungle World Resort — we look forward to welcoming you to Chitwan.<br />
                Queries: reservations@jungle-world-resort.com · jungle-world-resort.com
              </div>

            </div>{/* /receipt-body */}

            {/* Modal footer */}
            <div className="modal-footer">
              <span />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="modal-cancel-btn" onClick={onClose}>Close</button>
                <button type="button" className="receipt-print-btn receipt-print-btn--lg" onClick={handlePrint}>
                  <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                    <path d="M4 5V2h8v3M2 5h12a1 1 0 011 1v5a1 1 0 01-1 1H2a1 1 0 01-1-1V6a1 1 0 011-1zM4 12v2h8v-2"
                      stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                  </svg>
                  Print Receipt
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
