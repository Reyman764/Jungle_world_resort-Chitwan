import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePackages } from '../hooks/usePackages'
import PackageBadges from '../components/PackageBadges'
import './Home.css'

const activities = [
  { name:'Jungle Safari', desc:'Thrilling jeep safaris through the core zone of Chitwan — home to tigers, rhinos, and leopards.', img:'https://www.junglesafariresort.com/images/jeep_safari03.jpg' },
  { name:'Canoe Riding', desc:'Glide silently along the Rapti River, spotting gharials, marsh muggers and kingfishers.', img:'https://www.junglesafariresort.com/images/canoe_ride03.jpg' },
  { name:'Elephant Bathing', desc:'A rare chance to interact with the gentle giants — bathe and bond with resident elephants.', img:'https://media.evendo.com/locations-resized/DestinationDetails/original/ffe9e933-67c3-4a94-a433-e17b9271aeaa' },
  { name:'Bird Watching', desc:'Chitwan hosts 544+ bird species. Dawn walks with expert naturalist guides are a birder\'s paradise.', img:'https://images.unsplash.com/photo-1444464666168-49d633b86797?auto=format&fit=crop&w=600&q=80' },
]

const stats = [
  { value:5000, suffix:'+', label:'Guests Welcomed' },
  { value:95,   suffix:'%', label:'Return Rate' },
  { value:544,  suffix:'+', label:'Bird Species' },
  { value:16,   suffix:' yrs', label:'In the Field' },
]

const testimonials = [
  { name:'Sarah M.', country:'United Kingdom', rating:5, text:'Absolutely magical experience. The jeep safari at dawn with fog over the grass was something I\'ll never forget. Staff was incredibly knowledgeable and kind.' },
  { name:'Rajesh K.', country:'India', rating:5, text:'We had a family trip with kids and the team made everything so smooth. The elephant bathing was the highlight for our children. Will definitely return!' },
  { name:'Annika L.', country:'Germany', rating:5, text:'The cottages were beautiful and the food was outstanding — especially the Tharu cuisine. Birding at dawn was spectacular. Jungle World is the best in Sauraha.' },
  { name:'Tom B.', country:'Australia', rating:5, text:'Saw a one-horned rhino on the very first jeep safari! The guides know every trail. A bucket list destination executed perfectly.' },
]

// Phase 3: Animated counter component
function Counter({ target, suffix, start }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!start) return
    let current = 0
    const step = target / 60
    const timer = setInterval(() => {
      current += step
      if (current >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(current))
    }, 25)
    return () => clearInterval(timer)
  }, [start, target])
  return <span>{count.toLocaleString()}{suffix}</span>
}

function fmtPrice(amount) {
  if (amount == null) return ''
  return `NPR ${Number(amount).toLocaleString()}`
}

export default function Home() {
  const { packages: apiPackages } = usePackages()
  const packages = [...apiPackages].reverse().map(p => ({
    ...p,
    highlight: p.popular,
    priceNPR: p.prices?.nepali,
  }))

  const [statsVisible, setStatsVisible] = useState(false)
  const statsRef = useRef(null)
  const [activeTestimonial, setActiveTestimonial] = useState(0)
  const [testimonialPaused, setTestimonialPaused] = useState(false)
  // Phase 3: Swipe gesture state for testimonials
  const [touchStart, setTouchStart] = useState(null)

  // Stats counter trigger
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStatsVisible(true); obs.disconnect() } }, { threshold: 0.4 })
    if (statsRef.current) obs.observe(statsRef.current)
    return () => obs.disconnect()
  }, [])

  // Phase 3: Auto-rotate testimonials with pause on hover
  useEffect(() => {
    if (testimonialPaused) return
    const id = setInterval(() => setActiveTestimonial(a => (a + 1) % testimonials.length), 6000)
    return () => clearInterval(id)
  }, [testimonialPaused])

  const handleTestimonialTouchStart = e => setTouchStart(e.touches[0].clientX)
  const handleTestimonialTouchEnd = e => {
    if (!touchStart) return
    const diff = touchStart - e.changedTouches[0].clientX
    if (diff > 50) setActiveTestimonial(i => (i + 1) % testimonials.length)
    if (diff < -50) setActiveTestimonial(i => (i - 1 + testimonials.length) % testimonials.length)
    setTouchStart(null)
  }

  return (
    <main className="home">
      {/* ── HERO with Video Background (Phase 1) ── */}
      <section className="hero">
        {/* Phase 1a: Video background — only desktop */}
        <div className="hero__video-wrap" aria-hidden="true">
          <video
            className="hero-video"
            autoPlay
            muted
            loop
            playsInline
            poster="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1920&q=85"
          >
            <source src="/videos/jungle-intro.webm" type="video/webm" />
            <source src="/videos/jungle-intro.mp4" type="video/mp4" />
          </video>
        </div>
        <div className="hero__bg" />
        <div className="hero__content">
          <div className="hero__badge animate-fadeUp">UNESCO World Heritage Site</div>
          <h1 className="animate-fadeUp animate-delay-1">
            Into the <span className="gradient-text">Sal Forest,</span><br />Far From Ordinary
          </h1>
          <p className="hero__subtitle animate-fadeUp animate-delay-2">
            Chitwan's wilderness begins at your door — Bengal tigers, ancient forest,
            and the Rapti River at first light.
          </p>
          <div className="hero__actions animate-fadeUp animate-delay-3">
            <Link to="/packages" className="btn-primary"><span>Explore Stays</span></Link>
            <Link to="/contact" className="btn-outline">Plan Your Visit</Link>
          </div>
        </div>
        <div className="hero__scroll-indicator" aria-hidden="true">
          <span>Discover</span>
          <div className="scroll-line" />
        </div>
      </section>

      <hr className="gradient-divider" />

      {/* ── ANIMATED STAT COUNTERS (Phase 3) ── */}
      <section className="stats-strip" ref={statsRef} aria-label="Resort statistics">
        <div className="container">
          <div className="stats-grid">
            {stats.map((s, i) => (
              <div key={i} className="stat-item reveal" style={{ transitionDelay: `${i * 0.1}s` }}>
                <span className="stat-value" aria-label={`${s.value}${s.suffix} ${s.label}`}>
                  <Counter target={s.value} suffix={s.suffix} start={statsVisible} />
                </span>
                <span className="stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="gradient-divider" />

      {/* ── INTRODUCTION ── */}
      <section className="intro">
        <div className="container">
          <div className="intro__inner">
            <div className="intro__image-col reveal-left">
              <div className="intro__image-stack">
                <div className="intro__img intro__img--main">
                  <img
                    src="https://jungleworldchitwan.com/storage/ss-image/July2024/P9YVmQYAekaMiR5AVC68.JPG"
                    alt="Jungle World Resort aerial view showing lush green surroundings"
                    loading="lazy"
                    style={{ aspectRatio: '4/3', objectFit: 'cover', width: '100%' }}
                  />
                </div>
                <div className="intro__img intro__img--accent">
                  <img
                    src="https://jungleworldchitwan.com/storage/ss-image/July2024/W8bbWxMJNa8NiXwvAOpn.JPG"
                    alt="Resort swimming pool surrounded by tropical vegetation"
                    loading="lazy"
                    style={{ aspectRatio: '1/1', objectFit: 'cover', width: '100%' }}
                  />
                </div>
                <div className="intro__badge-float" aria-label="Established in 2008">
                  <span className="badge-year">Est.</span>
                  <span className="badge-num">2008</span>
                </div>
              </div>
            </div>
            <div className="intro__text-col reveal-right">
              <span className="section-tag">THE RETREAT</span>
              <h2 className="section-title">A Refuge <span className="gradient-text">Within the Sal Forest</span></h2>
              <span className="section-divider left" />
              <p className="intro__lead">
                Jungle World Resort sits on the northern bank of the Rapti River, where the treeline
                of Chitwan National Park begins and the sounds of the city end.
              </p>
              <p className="intro__body">
                Each stay is a passage into one of Asia's last great wildernesses — UNESCO-designated,
                extraordinary in its biodiversity, and intimate in the way only Chitwan can be.
              </p>
              <div className="intro__features" role="list">
                {['AC Deluxe Cottages', 'Expert Naturalist Guides', 'All-inclusive Packages', 'Airport Transfers'].map(f => (
                  <div key={f} className="intro__feature" role="listitem">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" aria-hidden="true"><polyline points="20,6 9,17 4,12"/></svg>
                    {f}
                  </div>
                ))}
              </div>
              <Link to="/about-chitwan" className="btn-primary" aria-label="Learn more about Chitwan National Park" style={{ marginTop: '32px' }}><span>Learn More</span></Link>
            </div>
          </div>
        </div>
      </section>

      <hr className="gradient-divider" />

      {/* ── SALIENT FEATURES ── */}
      <section className="features-section">
        <div className="features-bg" aria-hidden="true" />
        <div className="features-overlay" aria-hidden="true" />
        <div className="container features-content">
          <span className="section-tag reveal" style={{ color: 'var(--gold-light)' }}>THE DISTINCTION</span>
          <h2 className="section-title light text-center reveal reveal-delay-1">What Defines the Stay</h2>
          <span className="section-divider center reveal reveal-delay-2" />
          <div className="features-grid">
            {[
              { img:'https://jungleworldchitwan.com/storage/ss-image/July2024/Z6JzV7Lle9MQuzPZ4R3p.JPG', alt:'Deluxe eco cottage at Jungle World Resort', title:'Deluxe Eco Cottages', desc:'24-hour AC cottages with attached bath, blending luxury with nature.' },
              { img:'https://www.junglesafariresort.com/images/jungle_walk01.jpg', alt:'Guided jungle walk through sal forest', title:'Guided Jungle Walks', desc:'Expert naturalists lead you through the forest on foot — safe and thrilling.' },
              { img:'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR8VC_su3MZkfO8kWUey_jeHm9Pb8HWXOcz_A&s', alt:'Fresh local and international cuisine', title:'Local & International Cuisine', desc:'Fresh meals prepared daily featuring local Tharu recipes and favorites.' },
              { img:'https://images.unsplash.com/photo-1564760055775-d63b17a55c44?auto=format&fit=crop&w=600&q=80', alt:'Wildlife encounter in Chitwan National Park', title:'Wildlife Encounters', desc:'One-horned rhinos, Bengal tigers, gharials and 544+ bird species await.' },
              { img:'https://www.junglesafariresort.com/images/canoe_ride03.jpg', alt:'Canoe safari on the Rapti River at dawn', title:'River Canoe Safaris', desc:'Glide along the Rapti River at dawn for crocodile and birding sessions.' },
              { img:'https://kasararesort.com/wp-content/themes/yootheme/cache/40/niti-dancing-6fbbd0dd-405e1eea.webp', alt:'Tharu cultural stick dance performance', title:'Tharu Cultural Program', desc:'Authentic Tharu stick dance performances by local artists each evening.' },
            ].map((f, i) => (
              <div key={i} className={`feature-card glossy-card reveal reveal-delay-${(i % 4) + 1}`}>
                <div className="feature-card__image">
                  <img src={f.img} alt={f.alt} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                </div>
                <div className="feature-card__body">
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="gradient-divider" />

      {/* ── PACKAGES ── */}
      <section className="packages-section">
        <div className="container">
          <div className="text-center reveal" style={{ marginBottom: '56px' }}>
            <span className="section-tag">CURATED STAYS</span>
            <h2 className="section-title">Time in the Wild</h2>
            <span className="section-divider center" />
            <p style={{ maxWidth:'540px', margin:'0 auto', color:'var(--text-secondary)', fontFamily:'var(--font-serif)', fontSize:'17px', fontStyle:'italic' }}>
              Three stays, each shaped around the rhythms of Chitwan — from a swift overnight to a full
              four-day immersion in the forest.
            </p>
          </div>
          <div className="packages-grid">
            {packages.map((pkg, i) => (
              <div key={pkg.id} className={`pkg-card glossy-card reveal reveal-delay-${i + 1} ${pkg.highlight ? 'pkg-card--featured' : ''}`}>
                <div className="pkg-card__image">
                  <img
                    src={pkg.img}
                    srcSet={`${pkg.img.replace('w=800', 'w=400')} 400w, ${pkg.img} 800w`}
                    sizes="(max-width: 768px) 100vw, 50vw"
                    alt={`${pkg.name} package — ${pkg.duration}`}
                    loading="lazy"
                  />
                  <div className="pkg-card__badge">{pkg.badge}</div>
                  {pkg.highlight && <div className="pkg-card__popular" aria-label="Signature stay package">Signature Stay</div>}
                  <PackageBadges urgency={pkg.urgency} discount={pkg.discount} />
                </div>
                <div className="pkg-card__body">
                  <div className="pkg-card__duration">{pkg.duration}</div>
                  <h3 className="pkg-card__name">{pkg.name}</h3>
                  <p className="pkg-card__desc">{pkg.desc}</p>
                  <div className="pkg-card__footer">
                    <div className="pkg-card__price">
                      <span className="from">From</span>
                      <span className="amount">{fmtPrice(pkg.priceNPR)}</span>
                      <span className="per">/ person</span>
                    </div>
                    <Link to="/packages" className="pkg-card__btn" aria-label={`Explore ${pkg.name} stay`}>Explore Stay</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center reveal" style={{ marginTop:'48px' }}>
            <Link to="/packages" className="btn-primary"><span>View All Stays</span></Link>
          </div>
        </div>
      </section>

      <hr className="gradient-divider" />

      {/* ── ACTIVITIES ── */}
      <section className="activities-section">
        <div className="container">
          <div className="text-center reveal" style={{ marginBottom:'56px' }}>
            <span className="section-tag">IN THE FIELD</span>
            <h2 className="section-title">Experiences in Chitwan</h2>
            <span className="section-divider center" />
          </div>
          <div className="activities-grid">
            {activities.map((a, i) => (
              <div key={i} className={`activity-card glossy-card reveal reveal-delay-${i + 1}`}>
                <div className="activity-card__image" style={{ aspectRatio: '16/9' }}>
                  <img
                    src={a.img}
                    srcSet={`${a.img.replace('w=600', 'w=300')} 300w, ${a.img} 600w`}
                    sizes="(max-width: 768px) 100vw, 25vw"
                    alt={`${a.name} at Jungle World Resort`}
                    loading="lazy"
                  />
                  <div className="activity-card__overlay">
                    <Link to="/activities" className="activity-card__link" aria-label={`Explore ${a.name}`}>Explore →</Link>
                  </div>
                </div>
                <div className="activity-card__body">
                  <h3>{a.name}</h3>
                  <p>{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="gradient-divider" />

      {/* ── TESTIMONIALS CAROUSEL (Phase 3: hover pause + swipe) ── */}
      <section className="testimonials-section">
        <div className="container">
          <div className="text-center reveal" style={{ marginBottom:'48px' }}>
            <span className="section-tag">FIELD NOTES</span>
            <h2 className="section-title">Words From the Wild</h2>
            <span className="section-divider center" />
          </div>
          <div
            className="testimonials-carousel reveal"
            onMouseEnter={() => setTestimonialPaused(true)}
            onMouseLeave={() => setTestimonialPaused(false)}
            onTouchStart={handleTestimonialTouchStart}
            onTouchEnd={handleTestimonialTouchEnd}
            role="region"
            aria-label="Guest testimonials carousel"
            aria-live="polite"
          >
            <div className="testimonials-track" style={{ transform: `translateX(-${activeTestimonial * 100}%)` }}>
              {testimonials.map((t, i) => (
                <div
                  key={i}
                  className="testimonial-card"
                  aria-hidden={i !== activeTestimonial}
                >
                  <div className="testimonial-stars" aria-label={`${t.rating} out of 5`}>{t.rating} / 5</div>
                  <p className="testimonial-text">"{t.text}"</p>
                  <div className="testimonial-author">
                    <div className="testimonial-avatar" aria-hidden="true">{t.name[0]}</div>
                    <div>
                      <div className="testimonial-name">{t.name}</div>
                      <div className="testimonial-country">{t.country}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="testimonials-dots" role="tablist" aria-label="Testimonial navigation">
              {testimonials.map((t, i) => (
                <button
                  key={i}
                  className={`dot ${i === activeTestimonial ? 'active' : ''}`}
                  onClick={() => setActiveTestimonial(i)}
                  role="tab"
                  aria-selected={i === activeTestimonial}
                  aria-label={`Go to testimonial from ${t.name}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <hr className="gradient-divider" />

      {/* ── CTA BANNER ── */}
      <section className="cta-banner">
        <div className="cta-banner__bg" aria-hidden="true" />
        <div className="cta-banner__overlay" aria-hidden="true" />
        <div className="container cta-banner__content">
          <span className="section-tag reveal" style={{ color:'var(--gold-light)' }}>YOUR JOURNEY</span>
          <h2 className="reveal reveal-delay-1" style={{ fontFamily:'var(--font-display)', fontSize:'clamp(2rem,4vw,3.2rem)', color:'#f8f4ec', fontWeight:300, marginBottom:'24px' }}>
            The Forest Is Waiting
          </h2>
          <p className="reveal reveal-delay-2" style={{ fontFamily:'var(--font-serif)', fontStyle:'italic', fontSize:'18px', color:'rgba(248,244,236,0.7)', maxWidth:'500px', margin:'0 auto 36px' }}>
            From arrival to final morning coffee, every detail is arranged.
            The wild begins when you say so.
          </p>
          <Link to="/contact" className="btn-primary reveal reveal-delay-3"><span>Begin Your Stay</span></Link>
        </div>
      </section>
    </main>
  )
}
