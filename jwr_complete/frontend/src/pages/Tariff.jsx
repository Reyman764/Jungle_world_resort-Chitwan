import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero'
import { usePackages, FALLBACK_RATES } from '../hooks/usePackages'
import './Tariff.css'

const roomRates = [
  { type:'Single Room', price:'NPR 3,990' },
  { type:'Double Room', price:'NPR 4,655' },
  { type:'Triple Room', price:'NPR 5,985' },
]
const includes = [
  'Accommodation in 24 hr AC Deluxe Cottage with attached bathroom',
  'Meals as per packages (breakfast, lunch & dinner)',
  'National Park Permit & entry fees',
  'Programs and activities as listed in the package',
  'Expert naturalist guide throughout the stay',
  'Welcome drink & cultural program on arrival',
]
const excludes = [
  'Programs other than those listed in the package',
  'Beverages (alcoholic & non-alcoholic)',
  'Personal expenses & tips',
  'Travel insurance',
  'Transport to/from Sauraha (unless specified)',
]

function fmtUSD(nprVal, rate) {
  return `USD ${(Number(nprVal) / (rate || 132)).toFixed(2)}`
}
function fmtINR(nprVal, rate) {
  return `INR ${Math.round(Number(nprVal) / (rate || 1.58)).toLocaleString('en-IN')}`
}
function fmtNPR(val) {
  return `NPR ${Math.round(Number(val)).toLocaleString('en-IN')}`
}

export default function Tariff() {
  const { packages, currencyRates, loading } = usePackages()
  const rates = currencyRates || FALLBACK_RATES

  // Price Calculator Widget
  const [calcPkg, setCalcPkg] = useState(0)
  const [calcCat, setCalcCat] = useState('foreigner') // foreigner | saarc | nepali
  const [calcPax, setCalcPax] = useState(2)

  // Build display rows from API packages
  const tariffRows = packages.map(pkg => ({
    name:     pkg.name,
    popular:  pkg.popular,
    foreigner: fmtUSD(pkg.prices.foreigner, rates.usd_to_npr),
    saarc:     fmtINR(pkg.prices.saarc,     rates.inr_to_npr),
    nepali:    fmtNPR(pkg.prices.nepali),
    fVal:     pkg.prices.foreigner,  // NPR
    sVal:     pkg.prices.saarc,      // NPR
    nVal:     pkg.prices.nepali,     // NPR
    id:       pkg.id,
  }))

  const selected   = tariffRows[calcPkg] || tariffRows[0]
  const unitNPR    = selected ? (calcCat === 'foreigner' ? selected.fVal : calcCat === 'saarc' ? selected.sVal : selected.nVal) : 0
  const total      = unitNPR * calcPax
  const vatAmount  = Math.round(total * 0.13)
  const svcAmount  = Math.round(total * 0.10)
  const grandTotal = total + vatAmount + svcAmount

  // Display unit price in proper currency
  function unitDisplay() {
    if (!selected) return { native: '—', npr: '' }
    if (calcCat === 'foreigner') return { native: `USD ${(unitNPR / rates.usd_to_npr).toFixed(2)}`, npr: `NPR ${unitNPR.toLocaleString('en-IN')}` }
    if (calcCat === 'saarc')     return { native: `INR ${Math.round(unitNPR / rates.inr_to_npr).toLocaleString('en-IN')}`, npr: `NPR ${unitNPR.toLocaleString('en-IN')}` }
    return { native: `NPR ${unitNPR.toLocaleString('en-IN')}`, npr: '' }
  }
  const { native: unitNative, npr: unitNprLabel } = unitDisplay()

  return (
    <main>
      <PageHero
        title="Tariff & Rates"
        subtitle="Transparent pricing for every traveller"
        bgImage="/images/gallery/resort-pool-day2.jpg"
        breadcrumbs={[{ label:'Tariff' }]}
      />

      {/* ── PACKAGE RATES TABLE ── */}
      <section className="tariff-section">
        <div className="container">
          <div className="text-center reveal" style={{ marginBottom:'52px' }}>
            <span className="section-tag">Package Rates</span>
            <h2 className="section-title">Per Person Pricing</h2>
            <span className="section-divider center" />
            <p style={{ color:'var(--text-secondary)', fontSize:'0.87rem', marginTop:12 }}>
              International prices in USD · SAARC in INR · All totals settled in NPR
            </p>
          </div>
          <div className="tariff-table-wrap reveal">
            {loading ? (
              <p style={{ textAlign:'center', color:'var(--text-secondary)', padding:'32px 0' }}>Loading rates…</p>
            ) : (
              <table className="tariff-table">
                <thead>
                  <tr>
                    <th>Package</th>
                    <th>International <span className="tariff-th-sub">(USD)</span></th>
                    <th>SAARC <span className="tariff-th-sub">(INR)</span></th>
                    <th>Nepali <span className="tariff-th-sub">(NPR)</span></th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {tariffRows.map((row, i) => (
                    <tr key={i} className={row.popular ? 'featured-row' : ''}>
                      <td className="pkg-name-cell">
                        {row.name}
                        {row.popular && <span className="table-badge">Most Popular</span>}
                      </td>
                      <td className="price-cell">
                        <span className="price-cell__main">{row.foreigner}</span>
                        <span className="price-cell__sub">≈ {fmtNPR(row.fVal)}</span>
                      </td>
                      <td className="price-cell">
                        <span className="price-cell__main">{row.saarc}</span>
                        <span className="price-cell__sub">≈ {fmtNPR(row.sVal)}</span>
                      </td>
                      <td className="price-cell">
                        <span className="price-cell__main">{row.nepali}</span>
                      </td>
                      <td><Link to="/contact" className="table-book-btn">Book</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      <hr className="gradient-divider" />

      {/* ── PRICE CALCULATOR WIDGET ── */}
      <section className="calculator-section">
        <div className="container">
          <div className="calc-inner">
            <div className="calc-info reveal-left">
              <span className="section-tag">Instant Estimate</span>
              <h2 className="section-title">Price Calculator</h2>
              <span className="section-divider left" />
              <p style={{ color:'var(--text-secondary)', marginBottom:'24px', lineHeight:'1.8' }}>
                Select your package, category, and number of guests to get an instant price estimate including taxes.
              </p>
              <div className="incl-excl">
                <div>
                  <h4 style={{ color:'var(--forest-light)', marginBottom:'12px', fontSize:'13px', textTransform:'uppercase', letterSpacing:'0.1em' }}>Includes</h4>
                  {includes.slice(0,3).map((item, i) => <p key={i} style={{ fontSize:'13px', color:'var(--text-secondary)', marginBottom:'6px' }}>• {item}</p>)}
                </div>
              </div>
            </div>
            <div className="calc-widget reveal-right">
              <h3 className="calc-title">Calculate Your Trip Cost</h3>

              <label className="calc-label">Package</label>
              <select className="calc-select" value={calcPkg} onChange={e => setCalcPkg(Number(e.target.value))}>
                {tariffRows.map((t, i) => <option key={i} value={i}>{t.name}</option>)}
              </select>

              <label className="calc-label">Guest Category</label>
              <div className="calc-cat-group">
                {[['foreigner','International (USD)'],['saarc','SAARC (INR)'],['nepali','Nepali (NPR)']].map(([val, label]) => (
                  <button key={val} className={`calc-cat-btn ${calcCat === val ? 'active' : ''}`} onClick={() => setCalcCat(val)}>{label}</button>
                ))}
              </div>

              <label className="calc-label">Number of Guests</label>
              <div className="calc-counter">
                <button className="counter-btn" onClick={() => setCalcPax(p => Math.max(1, p - 1))}>−</button>
                <span className="counter-val">{calcPax}</span>
                <button className="counter-btn" onClick={() => setCalcPax(p => p + 1)}>+</button>
              </div>

              <div className="calc-result">
                <div className="calc-line">
                  <span>
                    Base ({calcPax} × {unitNative}
                    {unitNprLabel && <span className="calc-npr-eq"> = {unitNprLabel}</span>})
                  </span>
                  <span>NPR {total.toLocaleString('en-IN')}</span>
                </div>
                <div className="calc-line">
                  <span>Service Charge (10%)</span>
                  <span>NPR {svcAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="calc-line">
                  <span>VAT (13%)</span>
                  <span>NPR {vatAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="calc-total">
                  <span>Total Estimate</span>
                  <span className="calc-total-amount">NPR {grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <Link to="/contact" className="btn-primary" style={{ width:'100%', justifyContent:'center', marginTop:'16px' }}>
                <span>Book This Package</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <hr className="gradient-divider" />

      {/* ── ROOM RATES + INCLUDES/EXCLUDES ── */}
      <section className="tariff-bottom">
        <div className="container">
          <div className="tariff-bottom-grid">
            <div className="reveal">
              <span className="section-tag">Room Only</span>
              <h3 className="section-title" style={{ fontSize:'1.6rem' }}>Room Rates</h3>
              <span className="section-divider left" />
              <div className="room-rates">
                {roomRates.map((r, i) => (
                  <div key={i} className="room-rate-row">
                    <span>{r.type}</span>
                    <span className="room-price">{r.price} <small>/ night</small></span>
                  </div>
                ))}
              </div>
            </div>
            <div className="reveal reveal-delay-1">
              <span className="section-tag">Inclusions</span>
              <h3 className="section-title" style={{ fontSize:'1.6rem' }}>What's Included</h3>
              <span className="section-divider left" />
              <ul className="incl-list">
                {includes.map((item, i) => (
                  <li key={i}>
                    <span className="incl-icon" aria-hidden="true">
                      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
                        <polyline points="3,8 6.5,11.5 13,4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="reveal reveal-delay-2">
              <span className="section-tag">Exclusions</span>
              <h3 className="section-title" style={{ fontSize:'1.6rem' }}>Not Included</h3>
              <span className="section-divider left" />
              <ul className="excl-list">
                {excludes.map((item, i) => (
                  <li key={i}>
                    <span className="excl-icon" aria-hidden="true">
                      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
                        <line x1="4" y1="4" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <line x1="12" y1="4" x2="4" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
