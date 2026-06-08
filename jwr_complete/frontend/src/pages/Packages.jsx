import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero'
import CountdownTimer from '../components/CountdownTimer'
import PackageBadges from '../components/PackageBadges'
import { usePackages } from '../hooks/usePackages'
import './Packages.css'

const COMPARE_FEATURES = [
  'Welcome drink & cultural program',
  'Jeep safari in National Park',
  'Canoe safari on Rapti River',
  'Tharu village walk',
  'All meals (breakfast, lunch, dinner)',
  'Guided jungle walk at dawn',
  'Bird watching with naturalist',
  'Elephant safari (optional)',
  'Sunset viewpoint trek',
  'Airport transfers',
]

export default function Packages() {
  const [view, setView] = useState('detail')
  const { packages, promo, loading } = usePackages()

  return (
    <main>
      <PageHero
        title="Stays in the Wild"
        subtitle="Three stays. One wilderness."
        bgImage="/images/gallery/resort-pool-day1.jpg"
        breadcrumbs={[{ label: 'Packages' }]}
      />

      {promo.showCountdown && (
        <div className="pkg-countdown-bar" role="banner" aria-label="Limited time offer">
          <CountdownTimer targetDate={promo.endsAt} label={promo.label} />
        </div>
      )}

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
              <button className={`toggle-btn ${view === 'detail'  ? 'active' : ''}`} onClick={() => setView('detail')}>Detail View</button>
              <button className={`toggle-btn ${view === 'compare' ? 'active' : ''}`} onClick={() => setView('compare')}>Comparison View</button>
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
              <div key={pkg.id} className={`pkg-detail reveal ${i % 2 === 1 ? 'pkg-detail--reverse' : ''}`} style={{ transitionDelay: `${i * 0.12}s` }}>
                <div className="pkg-detail__image">
                  <img
                    src={pkg.img}
                    srcSet={pkg.img?.includes('w=900') ? `${pkg.img.replace('w=900', 'w=450')} 450w, ${pkg.img} 900w` : undefined}
                    sizes="(max-width: 768px) 100vw, 50vw"
                    alt={`${pkg.name} — ${pkg.duration}`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                  {pkg.popular && <div className="pkg-detail__popular" aria-label="Signature stay package">Signature Stay</div>}
                  <div className="pkg-detail__badge">{pkg.badge}</div>
                  <PackageBadges urgency={pkg.urgency} discount={pkg.discount} />
                </div>
                <div className="pkg-detail__content">
                  <span className="section-tag">{pkg.duration}</span>
                  <h2 className="pkg-detail__name">{pkg.name}</h2>
                  <PackageBadges urgency={pkg.urgency} discount={pkg.discount} variant="inline" />
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
                    {[
                      ['International', pkg.price, pkg.priceOriginal],
                      ['SAARC', pkg.priceINR, pkg.priceINROriginal],
                      ['Nepali', pkg.priceNPR, null],
                    ].map(([label, amt, original]) => (
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
                    <Link to="/contact#booking-section" className="btn-primary" aria-label={`Reserve ${pkg.name}`} onClick={() => sessionStorage.setItem('jwrPreselect', pkg.id)}>
                      <span>Reserve This Stay</span>
                    </Link>
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
            <div className="compare-wrapper reveal">
              {/* ── Package header row ── */}
              <div className="compare-header-row">
                <div className="compare-label-col compare-label-col--header" aria-hidden="true" />
                {packages.map(pkg => (
                  <div key={pkg.id} className={`compare-pkg-col ${pkg.popular ? 'compare-pkg-col--featured' : ''}`}>
                    {pkg.popular && <div className="compare-pkg-crown">MOST POPULAR</div>}
                    <div className="compare-pkg-img-wrap">
                      <img src={pkg.img} alt={`${pkg.name} package`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                      <div className="compare-pkg-img-overlay" />
                    </div>
                    <div className="compare-pkg-info">
                      <span className="compare-pkg-duration">{pkg.duration}</span>
                      <h3 className="compare-pkg-name">{pkg.name}</h3>
                      <div className="compare-pkg-price">{pkg.price}</div>
                      <div className="compare-pkg-price-sub">
                        <span>SAARC <strong>{pkg.priceINR}</strong></span>
                        <span className="compare-pkg-price-sep">·</span>
                        <span>Nepali <strong>{pkg.priceNPR}</strong></span>
                      </div>
                      <PackageBadges urgency={pkg.urgency} discount={pkg.discount} variant="compare" />
                      <Link
                        to="/contact#booking-section"
                        className={pkg.popular ? 'compare-book-btn compare-book-btn--featured' : 'compare-book-btn'}
                        aria-label={`Book ${pkg.name}`}
                        onClick={() => sessionStorage.setItem('jwrPreselect', pkg.id)}
                      >
                        Reserve This Stay
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Feature rows ── */}
              <div className="compare-features-table">
                <div className="compare-features-section-label">What's Included</div>
                {COMPARE_FEATURES.map((feature, fi) => (
                  <div key={feature} className={`compare-feature-row ${fi % 2 === 0 ? 'compare-feature-row--even' : ''}`}>
                    <div className="compare-label-col">{feature}</div>
                    {packages.map((pkg, i) => {
                      const included = pkg.includes.some(inc => inc.toLowerCase().includes(feature.toLowerCase().split(' ')[0]))
                        || i >= (feature.includes('Elephant') || feature.includes('Sunset') || feature.includes('Airport') ? 2
                               : feature.includes('Bird') || feature.includes('Guided') ? 1 : 0)
                      return (
                        <div key={pkg.id} className={`compare-check-col ${pkg.popular ? 'compare-check-col--featured' : ''}`} aria-label={included ? 'Included' : 'Not included'}>
                          {included ? (
                            <span className="compare-tick" aria-hidden="true">
                              <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
                                <circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.12"/>
                                <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5"/>
                                <polyline points="6,10.5 9,13.5 14,7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </span>
                          ) : (
                            <span className="compare-cross" aria-hidden="true">
                              <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
                                <line x1="6" y1="6" x2="14" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                                <line x1="14" y1="6" x2="6" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                              </svg>
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <hr className="gradient-divider" />

      <section className="pkg-note">
        <div className="container">
          <div className="pkg-note__box reveal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22" style={{ color: 'var(--gold-rich)', flexShrink: 0 }} aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>
              <strong>Please note:</strong> Rates are per-person on twin/triple sharing. Children 3–10 years: 50% rate. Group leaders (15+ pax) complimentary on meal &amp; accommodation. All rates subject to 10% Service Charge &amp; 13% VAT.
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
