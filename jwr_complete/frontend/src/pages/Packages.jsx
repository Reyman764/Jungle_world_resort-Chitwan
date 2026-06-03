import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero'
import CountdownTimer from '../components/CountdownTimer'
import { usePackages } from '../hooks/usePackages'
import './Packages.css'

export default function Packages() {
  const [view, setView] = useState('detail')
  const { packages, promo, loading } = usePackages()

  return (
    <main>
      <PageHero
        title="Stays in the Wild"
        subtitle="Three stays. One wilderness."
        bgImage="/images/gallery/resort-pool-day1.jpg"
        breadcrumbs={[{ label:'Packages' }]}
      />

      <div className="pkg-countdown-bar" role="banner" aria-label="Limited time offer">
        <CountdownTimer targetDate={promo.endsAt} label={promo.label} />
      </div>

      <section className="pkg-intro">
        <div className="container">
          <div className="text-center reveal">
            <span className="section-tag">CURATED STAYS</span>
            <h2 className="section-title">Time in the Wild</h2>
            <span className="section-divider center" />
            <p className="pkg-intro__text">
              Three stays, each shaped around the rhythms of Chitwan — from a swift overnight to a full four-day immersion in the forest.
            </p>
            <div className="view-toggle reveal reveal-delay-2">
              <button className={`toggle-btn ${view === 'detail' ? 'active' : ''}`} onClick={() => setView('detail')}>
                Detail View
              </button>
              <button className={`toggle-btn ${view === 'compare' ? 'active' : ''}`} onClick={() => setView('compare')}>
                Comparison View
              </button>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="container" style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading packages…
        </div>
      ) : view === 'detail' ? (
        <section className="pkgs-list">
          <div className="container">
            {packages.map((pkg, i) => (
              <div key={pkg.id} className={`pkg-detail reveal ${i % 2 === 1 ? 'pkg-detail--reverse' : ''}`} style={{ transitionDelay: `${i*0.12}s` }}>
                <div className="pkg-detail__image" style={{ position: 'relative', aspectRatio: '4/3', overflow: 'hidden' }}>
                  <img
                    src={pkg.img}
                    srcSet={pkg.img?.includes('w=900') ? `${pkg.img.replace('w=900', 'w=450')} 450w, ${pkg.img} 900w` : undefined}
                    sizes="(max-width: 768px) 100vw, 50vw"
                    alt={`${pkg.name} — ${pkg.duration}`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {pkg.popular && <div className="pkg-detail__popular" aria-label="Signature stay package">Signature Stay</div>}
                  <div className="pkg-detail__badge">{pkg.badge}</div>
                  {pkg.urgency && (
                    <div className="pkg-badge pkg-badge--urgency" aria-label={`Only ${pkg.urgency}`}>
                      Only {pkg.urgency}
                    </div>
                  )}
                  {pkg.discount && (
                    <div className="pkg-badge pkg-badge--discount" aria-label={`${pkg.discount} available`}>
                      ✦ {pkg.discount}
                    </div>
                  )}
                </div>
                <div className="pkg-detail__content">
                  <span className="section-tag">{pkg.duration}</span>
                  <h2 className="pkg-detail__name">{pkg.name}</h2>
                  <p className="pkg-detail__desc">{pkg.desc}</p>
                  <div className="pkg-detail__includes">
                    <h4>What's Included</h4>
                    <ul>
                      {pkg.includes.map((item, j) => (
                        <li key={j}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14" aria-hidden="true"><polyline points="20,6 9,17 4,12"/></svg>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="pkg-detail__pricing">
                    {[['International (NPR)', pkg.price, pkg.priceOriginal], ['SAARC (NPR)', pkg.priceINR], ['Nepali (NPR)', pkg.priceNPR]].map(([label, amt, original]) => (
                      <div key={label} className="price-tier">
                        <span className="price-label">{label}</span>
                        <span className="price-amount">
                          {original && <s style={{ opacity: 0.55, marginRight: 8, fontSize: '0.85em' }}>{original}</s>}
                          {amt}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="pkg-detail__actions">
                    <Link to="/contact#booking-section" className="btn-primary" aria-label={`Reserve ${pkg.name}`} onClick={() => sessionStorage.setItem('jwrPreselect', pkg.id)}><span>Reserve This Stay</span></Link>
                    <Link to="/tariff" className="btn-ghost-dark">View Rates</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="compare-section">
          <div className="container">
            <div className="compare-grid reveal">
              <div className="compare-col compare-col--label" />
              {packages.map(pkg => (
                <div key={pkg.id} className={`compare-col compare-col--pkg ${pkg.popular ? 'featured' : ''}`}>
                  <div className="compare-pkg-img" style={{ aspectRatio: '16/9', overflow: 'hidden' }}>
                    <img
                      src={pkg.img}
                      alt={`${pkg.name} package`}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  {pkg.popular && <div className="compare-popular">Most Popular</div>}
                  <h3>{pkg.name}</h3>
                  <div className="compare-price">{pkg.price}</div>
                  <div className="compare-price-sub">SAARC: {pkg.priceINR} · Nepali: {pkg.priceNPR}</div>
                  <div className="compare-duration">{pkg.duration}</div>
                  <Link to="/contact" className="btn-primary" style={{ fontSize:'11px', padding:'10px 20px', marginTop:'12px' }} aria-label={`Book ${pkg.name}`} onClick={() => sessionStorage.setItem('jwrPreselect', pkg.id)}>
                    <span>Book</span>
                  </Link>
                </div>
              ))}
              {['Welcome drink & cultural program','Jeep safari in National Park','Canoe safari on Rapti River','Tharu village walk','All meals (breakfast, lunch, dinner)','Guided jungle walk at dawn','Bird watching with naturalist','Elephant safari (optional)','Sunset viewpoint trek','Airport transfers'].map(feature => (
                <React.Fragment key={feature}>
                  <div className="compare-col compare-col--label">{feature}</div>
                  {packages.map((pkg, i) => (
                    <div key={pkg.id} className={`compare-col compare-col--check ${pkg.popular ? 'featured' : ''}`}>
                      {pkg.includes.some(inc => inc.toLowerCase().includes(feature.toLowerCase().split(' ')[0])) || i >= (feature.includes('Elephant') ? 2 : feature.includes('Sunset') ? 2 : feature.includes('Airport') ? 2 : feature.includes('Bird') ? 1 : feature.includes('Guided') ? 1 : 0)
                        ? <span className="check-yes" aria-label="Included">Included</span>
                        : <span className="check-no" aria-label="Not included">–</span>
                      }
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>
      )}

      <hr className="gradient-divider" />

      <section className="pkg-note">
        <div className="container">
          <div className="pkg-note__box reveal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22" style={{ color:'var(--gold-rich)', flexShrink:0 }} aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>
              <strong>Please note:</strong> Rates are per-person on twin/triple sharing. Children 3–10 years: 50% rate. Group leaders (15+ pax) complimentary on meal & accommodation. All rates subject to 10% Service Charge & 13% VAT.
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
