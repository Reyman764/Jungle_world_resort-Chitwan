import React, { useState } from 'react'
import PageHero from '../components/PageHero'
import './Gallery.css'

const categories = ['All', 'Wildlife', 'Resort', 'Activities', 'Landscape']

const photos = [
  { id: 1, src: '/images/gallery/resort-01.jpg', thumb: '/images/gallery/resort-01.jpg', cat: 'Resort', caption: 'Jungle World Resort grounds', size: 'large' },
  { id: 2, src: '/images/gallery/resort-02.jpg', thumb: '/images/gallery/resort-02.jpg', cat: 'Resort', caption: 'Resort surroundings at Chitwan' },
  { id: 3, src: '/images/gallery/resort-03.jpg', thumb: '/images/gallery/resort-03.jpg', cat: 'Resort', caption: 'Jungle World Resort landscape' },
  { id: 4, src: '/images/gallery/resort-04.jpg', thumb: '/images/gallery/resort-04.jpg', cat: 'Resort', caption: 'Resort view in the morning light', size: 'large' },
  { id: 5, src: '/images/gallery/resort-05.jpg', thumb: '/images/gallery/resort-05.jpg', cat: 'Resort', caption: 'Evening ambience at Jungle World' },
  { id: 6, src: '/images/gallery/resort-06.jpg', thumb: '/images/gallery/resort-06.jpg', cat: 'Resort', caption: 'Night atmosphere at the resort' },
  { id: 7, src: '/images/gallery/resort-07.jpg', thumb: '/images/gallery/resort-07.jpg', cat: 'Resort', caption: 'Jungle World Resort at night' },
  { id: 8, src: '/images/gallery/resort-08.jpg', thumb: '/images/gallery/resort-08.jpg', cat: 'Resort', caption: 'Resort gardens and pathways' },
  { id: 9, src: '/images/gallery/resort-09.jpg', thumb: '/images/gallery/resort-09.jpg', cat: 'Resort', caption: 'Relaxing spaces at Jungle World', size: 'large' },
  { id: 10, src: '/images/gallery/resort-10.jpg', thumb: '/images/gallery/resort-10.jpg', cat: 'Resort', caption: 'The beauty of Jungle World Resort' },
  { id: 11, src: '/images/gallery/resort-pool-night.jpg', thumb: '/images/gallery/resort-pool-night.jpg', cat: 'Resort', caption: 'Swimming pool glowing at night', size: 'large' },
  { id: 12, src: '/images/gallery/resort-pool-day1.jpg', thumb: '/images/gallery/resort-pool-day1.jpg', cat: 'Resort', caption: 'Resort swimming pool surrounded by palms' },
  { id: 13, src: '/images/gallery/resort-pool-day2.jpg', thumb: '/images/gallery/resort-pool-day2.jpg', cat: 'Resort', caption: 'Crystal clear pool with jungle backdrop' },
]

export default function Gallery() {
  const [active, setActive] = useState('All')
  const [lightbox, setLightbox] = useState(null)
  // Phase 3: Swipe gestures
  const [touchStart, setTouchStart] = useState(null)

  const filtered = active === 'All' ? photos : photos.filter(p => p.cat === active)

  const openLightbox = (photo) => setLightbox(photo)
  const closeLightbox = () => setLightbox(null)

  const navigate = (dir) => {
    if (!lightbox) return
    const idx = filtered.findIndex(p => p.id === lightbox.id)
    const next = (idx + dir + filtered.length) % filtered.length
    setLightbox(filtered[next])
  }

  // Phase 3: Keyboard + touch navigation
  const handleKeyDown = (e) => {
    if (!lightbox) return
    if (e.key === 'ArrowRight') navigate(1)
    if (e.key === 'ArrowLeft') navigate(-1)
    if (e.key === 'Escape') closeLightbox()
  }

  const handleTouchStart = e => setTouchStart(e.touches[0].clientX)
  const handleTouchEnd = e => {
    if (!touchStart) return
    const diff = touchStart - e.changedTouches[0].clientX
    if (diff > 50) navigate(1)
    if (diff < -50) navigate(-1)
    setTouchStart(null)
  }

  return (
    <main onKeyDown={handleKeyDown}>
      <PageHero
        title="Gallery"
        subtitle="Light, water, and wildlife — moments from the forest"
        bgImage="/images/gallery/resort-pool-day1.jpg"
        breadcrumbs={[{ label:"Gallery" }]}
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
                  src={photo.thumb}
                  srcSet={`${photo.thumb} 400w, ${photo.src} 800w`}
                  sizes="(max-width: 768px) 100vw, 33vw"
                  alt={photo.caption}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <div className="gallery-item__overlay" aria-hidden="true">
                  <div className="gallery-item__caption">{photo.caption}</div>
                  <div className="gallery-item__cat">{photo.cat}</div>
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
            <img src={lightbox.src} alt={lightbox.caption} referrerPolicy="no-referrer-when-downgrade" />
            <div className="lightbox-caption">
              <span>{lightbox.caption}</span>
              <span className="lightbox-cat">{lightbox.cat}</span>
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
