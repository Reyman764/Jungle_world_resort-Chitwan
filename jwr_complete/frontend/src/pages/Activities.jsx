import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero'
import './Activities.css'

const activities = [
  { name:'Canoe Riding', img:'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTdbAJ1RnGmABxvTZisgducYPXAJM9Is9gxgQ&s', fullDesc:'Set out on the tranquil waters of the Rapti River in a traditional dugout canoe. Glide silently past muddy banks where mugger crocodiles bask, gharials surface, and kingfishers dart in flashes of electric blue. Our expert boatmen guide you to the best wildlife viewpoints.', highlights:['Crocodile spotting','Kingfisher & heron sightings','Dawn & dusk options','Expert local guides'], duration:'2–3 hours', difficulty:'easy', type:'water' },
  { name:'Jeep Safari', img:'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=900&q=80', alt:'Open-top jeep safari in Chitwan National Park core zone', fullDesc:'Before the grassland burns gold, the open-top 4WD enters the core zone where Bengal tigers move between sal thickets and the Rapti bends. Your naturalist reads the landscape quietly — fresh pugmarks pressed into riverbank mud, the sudden stillness of a waterhole. Sightings are never promised; that is precisely what makes them matter.', highlights:['Tiger & rhino sightings','Core zone access','Professional naturalist','Small group sizes'], duration:'3–4 hours', difficulty:'easy', type:'wildlife' },
  { name:'Jungle Safari on Foot', img:'https://www.junglesafariresort.com/images/jungle_walk01.jpg', alt:'Guests on a guided jungle walk on foot through sal forest', fullDesc:'The forest reveals itself differently at walking pace — a sloth bear print pressed deep into river mud, spotted deer alarm calls threading through the sal, the faint musk of something large that passed recently. Your armed naturalist moves slowly, reads everything, says little. This is Chitwan at its most immediate.', highlights:['Track reading','Birdlife encounters','Armed naturalist escort','Dawn walks available'], duration:'2–3 hours', difficulty:'moderate', type:'wildlife' },
  { name:'Elephant Bathing', img:'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQvhk8tcDZ3Fc3i9E5C4wXTdRrPTBbO1Wxbcw&s', alt:'Guests helping bathe resident elephants in the river', fullDesc:'Join our resident elephants for their daily bath in the river — a joyful, splashing event that is deeply bonding. You will help scrub, pour, and play as these gentle giants soak in the shallows, all supervised by their mahouts.', highlights:['Hands-on experience','Mahout-supervised','Photography perfect','Morning timing'], duration:'1–1.5 hours', difficulty:'easy', type:'cultural' },
  { name:'Bird Watching', img:'https://images.unsplash.com/photo-1444464666168-49d633b86797?auto=format&fit=crop&w=900&q=80', alt:'Colorful Indian roller bird perched in Chitwan forest', fullDesc:'Chitwan\'s biodiversity draws birders from around the world. With 544+ recorded species, including the endangered Bengal florican, great hornbill, and the rare Sarus crane, every morning walk is a revelation. Our birding guides carry quality optics.', highlights:['544+ species','Expert birding guides','Optics provided','UNESCO heritage habitat'], duration:'2–3 hours', difficulty:'easy', type:'wildlife' },
  { name:'Tharu Cultural Program', img:'https://chitwanjunglesafaritour.com/wp-content/uploads/2025/07/Tharu-Cultural-Show-Chitwan.webp', fullDesc:'End each day with authentic Tharu cultural performances. The indigenous Tharu people have called the Terai jungle home for centuries — their stick dances, folk music, and fire performances are a window into a living tradition. Guests are invited to participate.', highlights:['Stick dance performance','Folk music','Fire show','Cultural storytelling'], duration:'1.5 hours', difficulty:'easy', type:'cultural' },
]

const filters = ['all', 'wildlife', 'water', 'cultural']
const difficultyMap = { easy:'Easy', moderate:'Moderate', hard:'Hard' }

export default function Activities() {
  const [activeFilter, setActiveFilter] = useState('all')

  const filtered = activeFilter === 'all' ? activities : activities.filter(a => a.type === activeFilter)

  return (
    <main>
      <PageHero
        title="In the Field"
        subtitle="Six ways to know the forest"
        bgImage="https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1600&q=80"
        breadcrumbs={[{ label:'Activities' }]}
      />

      <section className="act-intro">
        <div className="container text-center">
          <span className="section-tag reveal">IN THE FIELD</span>
          <h2 className="section-title reveal reveal-delay-1">Six Ways to Know Chitwan</h2>
          <span className="section-divider center reveal reveal-delay-2" />
          <p className="reveal reveal-delay-2" style={{ maxWidth:'560px', margin:'0 auto 32px', fontFamily:'var(--font-serif)', fontStyle:'italic', fontSize:'17px', color:'var(--text-secondary)', lineHeight:'1.9' }}>
            From silent canoe rides at dawn to thundering jeep safaris — every activity is crafted
            to connect you deeply with one of Asia's most biodiverse landscapes.
          </p>

          {/* Activity Finder — type filter */}
          <div className="act-filters reveal reveal-delay-3">
            {filters.map(f => (
              <button
                key={f}
                className={`filter-btn ${activeFilter === f ? 'active' : ''}`}
                onClick={() => setActiveFilter(f)}
              >
                {f === 'all' ? 'All' : f === 'wildlife' ? 'Wildlife' : f === 'water' ? 'Water' : 'Cultural'}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="act-grid-section">
        <div className="container">
          <div className="act-grid">
            {filtered.map((a, i) => (
              <div key={a.name} className={`act-card glossy-card reveal reveal-delay-${(i % 3) + 1}`}>
                <div className="act-card__image">
                  <img src={a.img} srcSet={`${a.img.replace("w=900", "w=450")} 450w, ${a.img} 900w`} sizes="(max-width: 768px) 100vw, 50vw" alt={a.alt || a.name} loading="lazy" referrerPolicy="no-referrer-when-downgrade" style={{ aspectRatio: "16/9", objectFit: "cover", width: "100%", height: "100%" }} />
                  <div className="act-card__duration">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
                    {a.duration}
                  </div>
                </div>
                <div className="act-card__body">
                  <div className="act-card__meta">
                    {/* Difficulty + Duration tags */}
                    <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                      <span className={`tag tag--${a.difficulty}`}>{difficultyMap[a.difficulty]}</span>
                      <span className="tag tag--duration">{a.duration}</span>
                    </div>
                  </div>
                  <h3 className="act-card__name">{a.name}</h3>
                  <p className="act-card__desc">{a.fullDesc}</p>
                  <div className="act-card__highlights">
                    {a.highlights.map((h, j) => (
                      <span key={j} className="highlight-tag">{h}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="gradient-divider" />

      <section className="act-cta">
        <div className="container text-center">
          <span className="section-tag reveal">INCLUDED IN EVERY STAY</span>
          <h2 className="section-title reveal reveal-delay-1">Each Activity Comes With Your Package</h2>
          <span className="section-divider center reveal reveal-delay-2" />
          <p className="reveal reveal-delay-2" style={{ maxWidth:'500px', margin:'0 auto 36px', color:'var(--text-secondary)', fontFamily:'var(--font-serif)', fontStyle:'italic', fontSize:'16px' }}>
            Every stay includes a curated selection of field experiences. Choose your time in the wild, and we arrange the rest.
          </p>
          <div className="reveal reveal-delay-3" style={{ display:'flex', gap:'14px', justifyContent:'center', flexWrap:'wrap' }}>
            <Link to="/packages" className="btn-primary"><span>Explore Stays</span></Link>
            <Link to="/contact" className="btn-ghost-dark2">Write to Us</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
