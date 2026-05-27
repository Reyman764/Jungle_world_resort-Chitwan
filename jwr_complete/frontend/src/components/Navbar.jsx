import React, { useState, useEffect } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import './Navbar.css'

const links = [
  { to: '/', label: 'Home' },
  { to: '/packages', label: 'Packages' },
  { to: '/tariff', label: 'Tariff' },
  { to: '/about-chitwan', label: 'About Chitwan' },
  { to: '/activities', label: 'Activities' },
  { to: '/contact', label: 'Contact Us' },
  { to: '/gallery', label: 'Gallery' },
]

export default function Navbar({ theme, toggleTheme }) {
  const [scrolled, setScrolled]   = useState(false)
  const [menuOpen, setMenuOpen]   = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // Staff login state
  const isLoggedIn = !!localStorage.getItem('token')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setMenuOpen(false) }, [location])

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/staff-login')
  }

  return (
    <>
      {/* ── Top Bar ── */}
      <div className="topbar">
        <div className="topbar__inner">
          <div className="topbar__items">
            <span className="topbar__item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                <circle cx="12" cy="9" r="2.5"/>
              </svg>
              Sauraha, Chitwan
            </span>
            <span className="topbar__sep" aria-hidden="true" />
            <span className="topbar__item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012.18 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.16a16 16 0 006.93 6.93l1.52-1.52a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
              </svg>
              +977 056-580100 / 58006
            </span>
            <span className="topbar__sep topbar__sep--hide" aria-hidden="true" />
            <span className="topbar__item topbar__item--hide">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              jungleworldchitwan@gmail.com
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Navbar ── */}
      <nav className={`navbar${scrolled ? ' navbar--scrolled' : ''}${menuOpen ? ' navbar--open' : ''}`}
           role="navigation" aria-label="Main navigation">
        <div className="navbar__inner">

          {/* Logo */}
          <Link to="/" className="navbar__logo" aria-label="Jungle World Resort — Home">
            <div className="logo-mark" aria-hidden="true">
              <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" width="52" height="52">
                {/* Outer ring */}
                <circle cx="28" cy="28" r="26.5" stroke="var(--gold-rich)" strokeWidth="1.2" fill="none"/>
                {/* Inner fill */}
                <circle cx="28" cy="28" r="24" fill="var(--forest-deep)"/>
                {/* Tree canopy left */}
                <ellipse cx="18" cy="26" rx="9" ry="12" fill="var(--forest-light)" opacity="0.75"/>
                {/* Tree canopy right */}
                <ellipse cx="38" cy="26" rx="9" ry="12" fill="var(--forest-light)" opacity="0.75"/>
                {/* Tree canopy centre (taller) */}
                <ellipse cx="28" cy="22" rx="7.5" ry="13" fill="var(--forest-pale)" opacity="0.9"/>
                {/* Trunks */}
                <rect x="16" y="36" width="4" height="8" rx="1" fill="var(--forest-mid)" opacity="0.7"/>
                <rect x="36" y="36" width="4" height="8" rx="1" fill="var(--forest-mid)" opacity="0.7"/>
                <rect x="26" y="33" width="4" height="11" rx="1" fill="var(--forest-mid)"/>
                {/* Ground line */}
                <path d="M10 42 Q28 38 46 42" stroke="var(--gold-rich)" strokeWidth="1" fill="none" opacity="0.6"/>
                {/* Sun / moon accent */}
                <circle cx="28" cy="11" r="3" fill="var(--gold-rich)" opacity="0.85"/>
              </svg>
            </div>
            <div className="logo-wordmark">
              <span className="logo-wordmark__name">Jungle World</span>
              <span className="logo-wordmark__tagline">Resort · Chitwan</span>
            </div>
          </Link>

          {/* Desktop links */}
          <ul className="navbar__links" role="list">
            {links.map(l => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}
                  end={l.to === '/'}
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>

          {/* Actions */}
          <div className="navbar__actions">
            <button
              className="theme-btn"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark'
                ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
              }
            </button>

            {isLoggedIn ? (
              <>
                <Link to="/admin/dashboard" className="navbar__cta" style={{ marginRight: 6 }}>
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="navbar__cta"
                  style={{ background: 'transparent', border: '1px solid rgba(200,151,58,0.4)', cursor: 'pointer' }}
                  aria-label="Logout"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/staff-login" className="theme-btn" aria-label="Staff login" title="Staff portal login"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-light)', textDecoration: 'none', padding: '6px 10px', letterSpacing: '0.05em' }}
                >
                  <svg viewBox="0 0 16 16" fill="none" width="12" height="12">
                    <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M2.5 14c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  Staff
                </Link>
                <Link to="/contact" className="navbar__cta" aria-label="Book or reserve your stay">
                  <svg viewBox="0 0 16 16" fill="none" width="13" height="13" aria-hidden="true">
                    <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M5 2v2M11 2v2M2 7h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  Book&thinsp;/&thinsp;Reserve
                </Link>
              </>
            )}
          </div>

          {/* Hamburger */}
          <button
            className={`navbar__burger${menuOpen ? ' navbar__burger--open' : ''}`}
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <span /><span /><span />
          </button>
        </div>

        {/* ── Mobile drawer ── */}
        <div className={`navbar__drawer${menuOpen ? ' navbar__drawer--open' : ''}`} aria-hidden={!menuOpen}>
          <div className="drawer__scroll">
            {links.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) => `drawer-link${isActive ? ' drawer-link--active' : ''}`}
                end={l.to === '/'}
              >
                {l.label}
                <svg viewBox="0 0 16 16" fill="none" width="14" height="14" aria-hidden="true">
                  <polyline points="5,3 11,8 5,13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </NavLink>
            ))}

            <div className="drawer__footer">
              <button className="drawer__theme-btn" onClick={toggleTheme}>
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>
              <Link to="/contact" className="drawer__cta">
                Book / Reserve
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}
