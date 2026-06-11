import React, { useState, useEffect } from 'react'
import PageHero from '../components/PageHero'
import { GALLERY_URLS } from '../utils/cloudinary'
import './Gallery.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const categories = ['All', 'Wildlife', 'Resort', 'Activities', 'Landscape']

// Fallback static photos — served from Cloudinary CDN (jwr/gallery/ folder)
const STATIC_PHOTOS = [
  { id: 1,  url: GALLERY_URLS['resort-01'],         caption: 'Jungle World Resort grounds',              category: 'Resort', size: 'large' },
  { id: 2,  url: GALLERY_URLS['resort-02'],         caption: 'Resort surroundings at Chitwan',           category: 'Resort', size: '' },
  { id: 3,  url: GALLERY_URLS['resort-03'],         caption: 'Jungle World Resort landscape',            category: 'Resort', size: '' },
  { id: 4,  url: GALLERY_URLS['resort-04'],         caption: 'Resort view in the morning light',         category: 'Resort', size: 'large' },
  { id: 5,  url: GALLERY_URLS['resort-05'],         caption: 'Evening ambience at Jungle World',         category: 'Resort', size: '' },
  { id: 6,  url: GALLERY_URLS['resort-06'],         caption: 'Night atmosphere at the resort',           category: 'Resort', size: '' },
  { id: 7,  url: GALLERY_URLS['resort-07'],         caption: 'Jungle World Resort at night',             category: 'Resort', size: '' },
  { id: 8,  url: GALLERY_URLS['resort-08'],         caption: 'Resort gardens and pathways',              category: 'Resort', size: '' },
  { id: 9,  url: GALLERY_URLS['resort-09'],         caption: 'Relaxing spaces at Jungle World',          category: 'Resort', size: 'large' },
  { id: 10, url: GALLERY_URLS['resort-10'],         caption: 'The beauty of Jungle World Resort',        category: 'Resort', size: '' },
  { id: 11, url: GALLERY_URLS['resort-pool-night'], caption: 'Swimming pool glowing at night',           category: 'Resort', size: 'large' },
  { id: 12, url: GALLERY_URLS['resort-pool-day1'],  caption: 'Resort pool surrounded by palms',          category: 'Resort', size: '' },
  { id: 13, url: GALLERY_URLS['resort-pool-day2'],  caption: 'Crystal clear pool with jungle',           category: 'Resort', size: '' },
]

export default function Gallery() {
  const [active,     setActive]     = useState('All')
  const [lightbox,   setLightbox]   = useState(null)
  const [touchStart, setTouchStart] = useState(null)
  const [photos,     setPhotos]     = useState(STATIC_PHOTOS)

  // Load dynamic photos from API and MERGE with static photos.
  useEffect(() => {
    fetch(`${API}/api/gallery`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.images && data.images.length > 0) {
          const apiPhotos = data.images.map(img => ({
            id:      img.id,
            url:     img.url,
            caption: img.caption || '',
            category: img.category || 'Resort',
            size:    img.size || '',
          }))
          const apiUrls = new Set(apiPhotos.map(p => p.url))
          const uniqueStatic = STATIC_PHOTOS.filter(p => !apiUrls.has(p.url))
          setPhotos([...apiPhotos, ...uniqueStatic])
        }
      })
      .catch(() => {})
  }, [])

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (lightbox) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [lightbox])

  const filtered = active === 'All' ? photos : photos.filter(p => p.category === active)

  const openLightbox  = (photo) => setLightbox(photo)
  const closeLightbox = () => setLightbox(null)

  const navigate = (dir) => {
    if (!lightbox) return
    const idx  = filtered.findIndex(p => p.id === lightbox.id)
    const next = (idx + dir + filtered.length) % filtered.length
    setLightbox(filtered[next])
  }

  const handleKeyDown = (e) => {
    if (!lightbox) return
    if (e.key === 'ArrowRight') navigate(1)
    if (e.key === 'ArrowLeft')  navigate(-1)
    if (e.key === 'Escape')     closeLightbox()
  }

  const handleTouchStart = e => setTouchStart(e.touches[0].clientX)
  const handleTouchEnd   = e => {
    if (!touchStart) return
    const diff = touchStart - e.changedTouches[0].clientX
    if (diff > 50)  navigate(1)
    if (diff < -50) navigate(-1)
    setTouchStart(null)
  }

  return (
    <main onKeyDown={handleKeyDown} tabIndex={-1} style={{ outline: 'none' }}>
      <PageHero
        title="Gallery"
        subtitle="Light, water, and wildlife — moments from the forest"
        bgImage={GALLERY_URLS['resort-pool-day1']}
        breadcrumbs={[{ label: 'Gallery' }]}
      />

      <section className="gallery-section">
        <div className="container">
          <div className="text-center reveal" style={{ marginBottom: '48px' }}>
            <span className="section-tag">THE FIELD</span>
            <h2 className="section-title">Seen in Chitwan</h2>
            <span className="section-divider" />
          </div>

          {/* Filters */}
          <nav className="gallery-filters" aria-label="Gallery category filter">
            {categories.map(cat => (
              <button
                key={cat}
                className={`filter-btn ${active === cat ? 'active' : ''}`}
                onClick={() => setActive(cat)}
                aria-pressed={active === cat}
              >
                {cat}
              </button>
            ))}
          </nav>

          {/* Masonry Grid */}
          <div className="gallery-grid" role="list">
            {filtered.map((photo, idx) => (
              <div
                key={photo.id}
                className={`gallery-item ${photo.size === 'large' ? 'gallery-item--large' : ''} reveal reveal-delay-${(idx % 4) + 1}`}
                onClick={() => openLightbox(photo)}
                role="listitem"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && openLightbox(photo)}
                aria-label={`View photo: ${photo.caption}`}
                style={{ aspectRatio: photo.size === 'large' ? '3/2' : '4/3' }}
              >
                <img
                  src={photo.url}
                  srcSet={`${photo.url.replace('w_800', 'w_400')} 400w, ${photo.url} 800w, ${photo.url.replace('w_800', 'w_1200')} 1200w`}
                  sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, 33vw"
                  alt={photo.caption}
                  width={photo.size === 'large' ? 900 : 600}
                  height={photo.size === 'large' ? 600 : 450}
                  loading={idx < 4 ? 'eager' : 'lazy'}
                  decoding="async"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <div className="gallery-item__overlay" aria-hidden="true">
                  <div className="gallery-item__caption">{photo.caption}</div>
                  <div className="gallery-item__cat">{photo.category}</div>
                  {/* Zoom icon — purely decorative, whole card is clickable */}
                  <div className="gallery-item__zoom" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
                      <circle cx="11" cy="11" r="7.5"/>
                      <line x1="20" y1="20" x2="15.8" y2="15.8"/>
                      <line x1="11" y1="8.5" x2="11" y2="13.5"/>
                      <line x1="8.5" y1="11" x2="13.5" y2="11"/>
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Premium Lightbox ── */}
      {lightbox && (
        <div
          className="lightbox-overlay"
          onClick={closeLightbox}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          role="dialog"
          aria-modal="true"
          aria-label={`Photo: ${lightbox.caption}`}
        >
          {/* Prev / Next outside inner so they're not cut off */}
          <button className="lightbox-nav lightbox-nav--prev" onClick={e => { e.stopPropagation(); navigate(-1) }} aria-label="Previous photo">‹</button>
          <button className="lightbox-nav lightbox-nav--next" onClick={e => { e.stopPropagation(); navigate(1)  }} aria-label="Next photo">›</button>

          <div className="lightbox-inner" onClick={e => e.stopPropagation()}>
            <button className="lightbox-close" onClick={closeLightbox} aria-label="Close lightbox">✕</button>
            <img src={lightbox.url} alt={lightbox.caption} referrerPolicy="no-referrer-when-downgrade" />
            <div className="lightbox-caption">
              <span>{lightbox.caption}</span>
              <span className="lightbox-cat">{lightbox.category}</span>
            </div>
            {/* Dot navigation */}
            <div className="lightbox-dots" role="tablist" aria-label="Photo navigation">
              {filtered.map((p, i) => (
                <button
                  key={p.id}
                  className={`lightbox-dot ${p.id === lightbox.id ? 'active' : ''}`}
                  onClick={e => { e.stopPropagation(); setLightbox(p) }}
                  aria-label={`Photo ${i + 1}`}
                  aria-selected={p.id === lightbox.id}
                  role="tab"
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
