import React, { useState } from 'react'
import PageHero from '../components/PageHero'
import './Gallery.css'

const categories = ['All', 'Wildlife', 'Resort', 'Activities', 'Landscape']

const photos = [
  { id: 1, src: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400&q=75', cat: 'Wildlife', caption: 'Wild elephants at golden hour', size: 'large' },
  { id: 2, src: 'https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=400&q=75', cat: 'Wildlife', caption: 'Bengal tiger on the prowl' },
  { id: 3, src: 'https://images.unsplash.com/photo-1591825729269-caeb344f6df2?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1591825729269-caeb344f6df2?w=400&q=75', cat: 'Resort', caption: 'Resort aerial view' },
  { id: 4, src: 'https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?w=400&q=75', cat: 'Landscape', caption: 'Dawn mist on the river', size: 'large' },
  { id: 5, src: 'https://images.unsplash.com/photo-1577721058720-c0fe5fbeef01?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1577721058720-c0fe5fbeef01?w=400&q=75', cat: 'Activities', caption: 'Jeep safari through the grassland' },
  { id: 6, src: 'https://images.unsplash.com/photo-1551969014-7d2c4cddf0b6?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1551969014-7d2c4cddf0b6?w=400&q=75', cat: 'Activities', caption: 'Elephant bathing experience' },
  { id: 7, src: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=75', cat: 'Landscape', caption: 'Sal forest in morning light' },
  { id: 8, src: 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=400&q=75', cat: 'Wildlife', caption: 'Indian roller — one of 544+ species' },
  { id: 9, src: 'https://images.unsplash.com/photo-1545179605-1296651e9d43?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1545179605-1296651e9d43?w=400&q=75', cat: 'Resort', caption: 'Poolside at sunset', size: 'large' },
  { id: 10, src: 'https://images.unsplash.com/photo-1545679652-6f1db7d77e3b?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1545679652-6f1db7d77e3b?w=400&q=75', cat: 'Activities', caption: 'Tharu cultural evening' },
  { id: 11, src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=75', cat: 'Landscape', caption: 'Himalayan panorama from Chitwan' },
  { id: 12, src: 'https://images.unsplash.com/photo-1522241450660-60e93e77e6e5?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1522241450660-60e93e77e6e5?w=400&q=75', cat: 'Resort', caption: 'Deluxe jungle cottage' },
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
        bgImage="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80"
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
            <img src={lightbox.src} alt={lightbox.caption} />
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
