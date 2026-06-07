import React, { useState, useEffect } from 'react'
import PageHero from '../components/PageHero'
import './Gallery.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const categories = ['All', 'Wildlife', 'Resort', 'Activities', 'Landscape']

// Fallback static photos (shown when no images have been uploaded yet)
const STATIC_PHOTOS = [
  { id: 1, url: '/images/gallery/resort-01.jpg', caption: 'Jungle World Resort grounds',              category: 'Resort',    size: 'large' },
  { id: 2, url: '/images/gallery/resort-02.jpg', caption: 'Resort surroundings at Chitwan',          category: 'Resort',    size: '' },
  { id: 3, url: '/images/gallery/resort-03.jpg', caption: 'Jungle World Resort landscape',           category: 'Resort',    size: '' },
  { id: 4, url: '/images/gallery/resort-04.jpg', caption: 'Resort view in the morning light',        category: 'Resort',    size: 'large' },
  { id: 5, url: '/images/gallery/resort-05.jpg', caption: 'Evening ambience at Jungle World',        category: 'Resort',    size: '' },
  { id: 6, url: '/images/gallery/resort-06.jpg', caption: 'Night atmosphere at the resort',          category: 'Resort',    size: '' },
  { id: 7, url: '/images/gallery/resort-07.jpg', caption: 'Jungle World Resort at night',            category: 'Resort',    size: '' },
  { id: 8, url: '/images/gallery/resort-08.jpg', caption: 'Resort gardens and pathways',             category: 'Resort',    size: '' },
  { id: 9, url: '/images/gallery/resort-09.jpg', caption: 'Relaxing spaces at Jungle World',         category: 'Resort',    size: 'large' },
  { id: 10, url: '/images/gallery/resort-10.jpg', caption: 'The beauty of Jungle World Resort',      category: 'Resort',    size: '' },
  { id: 11, url: '/images/gallery/resort-pool-night.jpg', caption: 'Swimming pool glowing at night', category: 'Resort',    size: 'large' },
  { id: 12, url: '/images/gallery/resort-pool-day1.jpg',  caption: 'Resort pool surrounded by palms',category: 'Resort',    size: '' },
  { id: 13, url: '/images/gallery/resort-pool-day2.jpg',  caption: 'Crystal clear pool with jungle', category: 'Resort',    size: '' },
]

export default function Gallery() {
  const [active,     setActive]     = useState('All')
  const [lightbox,   setLightbox]   = useState(null)
  const [touchStart, setTouchStart] = useState(null)
  const [photos,     setPhotos]     = useState(STATIC_PHOTOS)
  const [apiLoaded,  setApiLoaded]  = useState(false)

  // Load dynamic photos from API and MERGE with static photos.
  // API-uploaded images appear first; static images follow as the base gallery.
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
          // Merge: API photos first, then static (deduped by URL)
          const apiUrls = new Set(apiPhotos.map(p => p.url))
          const uniqueStatic = STATIC_PHOTOS.filter(p => !apiUrls.has(p.url))
          setPhotos([...apiPhotos, ...uniqueStatic])
        }
        // If API empty, keep static fallback
        setApiLoaded(true)
      })
      .catch(() => {
        // Network error → keep static fallback silently
        setApiLoaded(true)
      })
  }, [])

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
    <main onKeyDown={handleKeyDown}>
      <PageHero
        title="Gallery"
        subtitle="Light, water, and wildlife — moments from the forest"
        bgImage="/images/gallery/resort-pool-day1.jpg"
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
                  srcSet={`${photo.url} 800w`}
                  sizes="(max-width: 768px) 100vw, 33vw"
                  alt={photo.caption}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <div className="gallery-item__overlay" aria-hidden="true">
                  <div className="gallery-item__caption">{photo.caption}</div>
                  <div className="gallery-item__cat">{photo.category}</div>
                  <div className="gallery-item__zoom">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox with swipe support */}
      {lightbox && (
        <div
          className="lightbox-overlay"
          onClick={closeLightbox}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          role="dialog"
          aria-modal="true"
          aria-label={`Photo lightbox: ${lightbox.caption}`}
        >
          <div className="lightbox-inner" onClick={e => e.stopPropagation()}>
            <button className="lightbox-close" onClick={closeLightbox} aria-label="Close lightbox">✕</button>
            <button className="lightbox-nav lightbox-nav--prev" onClick={() => navigate(-1)} aria-label="Previous photo">‹</button>
            <img src={lightbox.url} alt={lightbox.caption} referrerPolicy="no-referrer-when-downgrade" />
            <div className="lightbox-caption">
              <span>{lightbox.caption}</span>
              <span className="lightbox-cat">{lightbox.category}</span>
            </div>
            <button className="lightbox-nav lightbox-nav--next" onClick={() => navigate(1)} aria-label="Next photo">›</button>
          </div>
          {/* Dots indicator */}
          <div className="lightbox-dots" role="tablist" aria-label="Photo navigation">
            {filtered.map((p, i) => (
              <button
                key={p.id}
                className={`lightbox-dot ${p.id === lightbox.id ? 'active' : ''}`}
                onClick={e => { e.stopPropagation(); setLightbox(p) }}
                aria-label={`View photo ${i + 1}: ${p.caption}`}
                aria-selected={p.id === lightbox.id}
                role="tab"
              />
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
