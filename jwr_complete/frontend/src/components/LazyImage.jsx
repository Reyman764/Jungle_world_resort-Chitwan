import React, { useState, useEffect, useRef } from 'react'

/**
 * LazyImage — Phase 1 Enhancement
 * Intersection Observer + blur-up LQIP placeholder
 * Supports srcSet for responsive images
 */
const LazyImage = ({
  src,
  srcSet,
  sizes,
  alt,
  className,
  style,
  aspectRatio,
  onClick,
  loading = 'lazy',
  referrerPolicy = 'no-referrer-when-downgrade',
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const imgRef = useRef(null)
  const wrapRef = useRef(null)

  // Tiny SVG blur placeholder (LQIP pattern)
  const placeholder = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'%3E%3Cfilter id='b' color-interpolation-filters='sRGB'%3E%3CfeGaussianBlur stdDeviation='1'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='%231a3a2a' filter='url(%23b)'/%3E%3C/svg%3E`

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.unobserve(el)
        }
      },
      { rootMargin: '80px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={wrapRef}
      className={`lazy-img-wrap ${className || ''}`}
      style={{ position: 'relative', overflow: 'hidden', ...(aspectRatio ? { aspectRatio } : {}), ...style }}
      onClick={onClick}
    >
      {/* Blur placeholder */}
      <img
        src={placeholder}
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: isLoaded ? 0 : 1,
          transition: 'opacity 0.4s ease',
          filter: 'blur(8px)',
          transform: 'scale(1.05)',
        }}
      />
      {/* Real image */}
      {isInView && (
        <img
          ref={imgRef}
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt || ''}
          loading={loading}
          referrerPolicy={referrerPolicy}
          onLoad={() => setIsLoaded(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.5s ease',
            display: 'block',
          }}
        />
      )}
    </div>
  )
}

export default LazyImage
