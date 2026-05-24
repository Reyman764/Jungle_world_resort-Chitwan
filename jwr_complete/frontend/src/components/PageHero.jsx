import React from 'react'
import { Link } from 'react-router-dom'
import './PageHero.css'

export default function PageHero({ title, subtitle, bgImage, breadcrumbs = [] }) {
  return (
    <section className="page-hero" style={{ backgroundImage: `url(${bgImage})` }}>
      <div className="page-hero__overlay" />
      <div className="page-hero__content">
        {/* Persistent Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <nav className="breadcrumbs" aria-label="breadcrumb">
            <Link to="/" className="breadcrumbs__link">Home</Link>
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={i}>
                <span className="breadcrumbs__sep">›</span>
                {crumb.to ? (
                  <Link to={crumb.to} className="breadcrumbs__link">{crumb.label}</Link>
                ) : (
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize:'12px' }}>{crumb.label}</span>
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
