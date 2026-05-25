import React, { useEffect, useState, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation, Link } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import SkipLink from './components/SkipLink'
import ParticleBackground from './components/ParticleBackground'
import FloatingBookBtn from './components/FloatingBookBtn'
import ProtectedRoute from './components/ProtectedRoute'

// Public pages
const Home         = lazy(() => import('./pages/Home'))
const Packages     = lazy(() => import('./pages/Packages'))
const Activities   = lazy(() => import('./pages/Activities'))
const Tariff       = lazy(() => import('./pages/Tariff'))
const AboutChitwan = lazy(() => import('./pages/AboutChitwan'))
const Contact      = lazy(() => import('./pages/Contact'))
const Gallery      = lazy(() => import('./pages/Gallery'))
const StaffLogin   = lazy(() => import('./pages/StaffLogin'))

// Admin pages (lazy — not shipped to guests until needed)
const AdminDashboard = lazy(() => import('./admin/AdminDashboard'))

function PageLoader() {
  return (
    <div style={{
      minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--gold-rich)', fontSize: '28px',
    }}>
      <span style={{ animation: 'shimmer 1.6s infinite' }}>🌿</span>
    </div>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function ScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target) }
      }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
    const observe = () => document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => observer.observe(el))
    observe()
    const mo = new MutationObserver(observe)
    mo.observe(document.body, { childList: true, subtree: true })
    return () => { observer.disconnect(); mo.disconnect() }
  }, [])
  return null
}

function ScrollTopBtn() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <button
      aria-label="Scroll to top of page"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`scroll-top-btn${visible ? ' visible' : ''}`}
    >↑</button>
  )
}

/**
 * Layout wrapping all PUBLIC pages (navbar, footer, particles, etc.)
 */
function PublicLayout({ theme, toggleTheme }) {
  return (
    <>
      <Navbar theme={theme} toggleTheme={toggleTheme} />
      <div id="main-content">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"              element={<Home />} />
            <Route path="/packages"      element={<Packages />} />
            <Route path="/activities"    element={<Activities />} />
            <Route path="/tariff"        element={<Tariff />} />
            <Route path="/about-chitwan" element={<AboutChitwan />} />
            <Route path="/contact"       element={<Contact />} />
            <Route path="/gallery"       element={<Gallery />} />
            <Route path="/staff-login"   element={<StaffLogin />} />
          </Routes>
        </Suspense>
      </div>
      <Footer />
      <FloatingBookBtn />
      <ScrollTopBtn />
      <ParticleBackground />
    </>
  )
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('jwrTheme') || 'light')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('jwrTheme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <BrowserRouter>
      <SkipLink />
      <ScrollToTop />
      <ScrollReveal />

      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* ── Protected admin routes (no Navbar / Footer) ── */}
          <Route element={<ProtectedRoute />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Route>

          {/* ── Public site (all other routes) ── */}
          <Route path="/*" element={<PublicLayout theme={theme} toggleTheme={toggleTheme} />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
