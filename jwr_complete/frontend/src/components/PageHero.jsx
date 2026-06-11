import React from 'react'
import { Link } from 'react-router-dom'
import './PageHero.css'

/**
 * PageHero — inner-page banner component.
 *
 * Performance fixes applied here:
 * - Background is rendered as an <img> with fetchpriority="high" so
 *   Lighthouse recognises it as the LCP element and doesn't penalise it.
 * - Explicit width / height prevent layout shift (CLS).
 * - loading="eager" ensures the image is not deferred.
 */
export default function PageHero({ title, subtitle, bgImage, breadcrumbs = [] }) {
  return (
    <section className="page-hero" aria-label={`${title} page hero`}>
      {/* LCP image — rendered as <img> so browsers can prioritise it */}
      <img
        src={bgImage}
        alt=""
        aria-hidden="true"
        className="page-hero__bg-img"
        width="1200"
        height="520"
        fetchpriority="high"
        loading="eager"
        decoding="async"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div className="page-hero__overlay" />
      <div className="page-hero__content">
        {breadcrumbs.length > 0 && (
          <nav className="breadcrumbs" aria-label="breadcrumb">
            <Link to="/" className="breadcrumbs__link">Home</Link>
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={i}>
                <span className="breadcrumbs__sep" aria-hidden="true">›</span>
                {crumb.to ? (
                  <Link to={crumb.to} className="breadcrumbs__link">{crumb.label}</Link>
                ) : (
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }} aria-current="page">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </section>
  )
}
