import React from 'react'
import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero'
import './AboutChitwan.css'

const facts = [
  { img: 'https://econepaltrekkers.com/wp-content/uploads/2025/12/Terai-Region-in-Nepal.jpg', alt: 'Terai landscape in southern Nepal', label: 'Location', value: 'Southern Nepal, where the Terai meets the hills' },
  { img: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=500&q=80', alt: 'Sal forest in Chitwan National Park', label: 'Area', value: '952 sq km of protected core wilderness' },
  { img: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=500&q=80', alt: 'Chitwan National Park wilderness', label: 'UNESCO Status', value: 'Inscribed as World Heritage Site, 1984' },
  { img: 'https://rpcdn.ratopati.com/media/albums/rhino_9lvtPy7ttd.jpeg', alt: 'One-horned rhinoceros in Chitwan', label: 'One-horned Rhino', value: 'Over 700 individuals — a conservation triumph' },
  { img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQJNa4VxJFXest9OqAmydJKRvcmT77rOyDS8A&s', alt: 'Bengal tiger in the wild', label: 'Bengal Tiger', value: 'More than 100 individuals, carefully protected' },
  { img: 'https://images.unsplash.com/photo-1444464666168-49d633b86797?auto=format&fit=crop&w=500&q=80', alt: 'Colorful bird species in Chitwan', label: 'Bird Species', value: '544 recorded species, and still counting' },
]

const wildlife = [
  { name: 'Bengal Tiger', img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQJNa4VxJFXest9OqAmydJKRvcmT77rOyDS8A&s', alt: 'Bengal tiger in Chitwan National Park', desc: 'Chitwan is one of the last bastions of the Bengal tiger. Patient observers on dawn jeep safaris are sometimes rewarded with a sighting.' },
  { name: 'One-Horned Rhino', img: 'https://rpcdn.ratopati.com/media/albums/rhino_9lvtPy7ttd.jpeg', alt: 'One-horned rhinoceros on a jungle walk', desc: 'Nepal\'s conservation success story — from near-extinction to a thriving population of 700+. Easily spotted on jungle walks.' },
  { name: 'Gharial Crocodile', img: 'data:image/jpeg;base64,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', desc: 'The long-snouted gharial basks along river banks. Critically endangered globally, Chitwan holds an important population.' },
  { name: 'Asiatic Elephant', img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSFBR7knplcfFt9J4oEDVCKLDKlEtGM1NY7pw&s', alt: 'Wild elephants in Chitwan grasslands', desc: 'Wild herds roam the grasslands. Our resident elephants also offer bathing and interaction experiences with their mahouts.' },
  { name: 'Sloth Bear', img: 'https://imgs.mongabay.com/wp-content/uploads/sites/20/2023/11/30102252/EwhzQQHVcAA-A29-e1701339825306.jpeg', alt: 'Sloth bear in forest habitat', desc: 'Nocturnal and elusive, sloth bears are occasionally spotted foraging in the forest. A true wildlife treat when seen.' },
  { name: 'Leopard', img: 'https://chitwanjunglesafaritour.com/wp-content/uploads/2025/11/Leopard-at-Chitwan-National-Park.webp', alt: 'Leopard at the forest edge', desc: 'Silent and supremely beautiful, the leopard keeps to the forest edges and rocky outcrops of the park\'s periphery.' },
]

export default function AboutChitwan() {
  return (
    <main>
      <PageHero
        title="About Chitwan"
        subtitle="The jewel of Nepal's lowland forests"
        bgImage="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1600&q=80"
      />

      {/* Intro */}
      <section className="about-intro">
        <div className="container">
          <div className="about-intro__inner">
            <div className="about-intro__text">
              <span className="section-tag">UNESCO World Heritage</span>
              <h2 className="section-title">Chitwan National Park</h2>
              <span className="section-divider left" />
              <p className="about-lead">
                Chitwan — meaning "Heart of the Jungle" — is Nepal's first national park and one of 
                Asia's finest wildlife reserves. Situated in the subtropical lowlands, it shelters 
                extraordinary biodiversity beneath its sal forests, grasslands, and river oxbows.
              </p>
              <p className="about-body">
                Established in 1973 and inscribed as a UNESCO World Heritage Site in 1984, the park 
                covers 952 square kilometres of diverse habitats. It remains one of the few places 
                in Asia where you can see a wild one-horned rhinoceros, a Bengal tiger, and a gharial 
                crocodile in a single day's outing.
              </p>
              <p className="about-body">
                Sauraha, the resort village on the northern banks of the Rapti River, serves as the 
                primary gateway. Jungle World Resort is located here, just minutes from the park boundary.
              </p>
            </div>
            <div className="about-intro__image">
              <img
                src="https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=700&q=80"
                alt="Chitwan National Park"
                loading="lazy"
              />
              <div className="about-intro__quote">
                <p>"Heart of the Jungle"</p>
                <span>— Meaning of Chitwan</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Facts */}
      <section className="facts-section">
        <div className="container">
          <div className="text-center" style={{ marginBottom: '52px' }}>
            <span className="section-tag">AT A GLANCE</span>
            <h2 className="section-title">Chitwan by the Numbers</h2>
            <span className="section-divider" />
          </div>
          <div className="facts-grid">
            {facts.map((f, i) => (
              <div key={i} className="fact-card">
                <div className="fact-card__image">
                  <img src={f.img} alt={f.alt} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                </div>
                <div className="fact-label">{f.label}</div>
                <div className="fact-value">{f.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Wildlife */}
      <section className="wildlife-section">
        <div className="container">
          <div className="text-center" style={{ marginBottom: '52px' }}>
            <span className="section-tag">THE INHABITANTS</span>
            <h2 className="section-title">Wildlife of Chitwan</h2>
            <span className="section-divider" />
          </div>
          <div className="wildlife-grid">
            {wildlife.map((w, i) => (
              <div key={i} className="wildlife-card">
                <div className="wildlife-card__image">
                  <img src={w.img} alt={w.alt} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                </div>
                <div className="wildlife-card__body">
                  <h3>{w.name}</h3>
                  <p>{w.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Getting There */}
      <section className="getting-there">
        <div className="container">
          <div className="getting-there__inner">
            <div>
              <span className="section-tag">REACHING CHITWAN</span>
              <h2 className="section-title">Your Path to the Park</h2>
              <span className="section-divider left" />
              <div className="route-list">
                {[
                  { mode: 'By Air', detail: 'Fly to Bharatpur Airport (25 km from Sauraha). Daily flights from Kathmandu (~25 mins). We arrange airport pickup.' },
                  { mode: 'By Bus', detail: 'Tourist buses from Kathmandu (Thamel) to Sauraha take about 5–6 hours on the Prithvi Highway. Comfortable and scenic.' },
                  { mode: 'Private Car', detail: 'A private car from Kathmandu takes 4–5 hours and is the most comfortable option. We can arrange this for you.' },
                  { mode: 'By Train', detail: 'Train to Narayangadh (Bharatpur), then a short taxi to Sauraha (~30 mins).' },
                ].map((r, i) => (
                  <div key={i} className="route-item">
                    <div className="route-mode">{r.mode}</div>
                    <p>{r.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="getting-there__image">
              <img
                src="https://jungleworldchitwan.com/storage/ss-image/July2024/trKqvGlTewKvUuBLsXVb.JPG"
                alt="Resort"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 0 100px', background: 'var(--cream)', textAlign: 'center' }}>
        <div className="container">
          <span className="section-tag">YOUR STAY AWAITS</span>
          <h2 className="section-title">The Forest Is Yours to Discover</h2>
          <span className="section-divider" />
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '12px' }}>
            <Link to="/packages" className="btn-primary"><span>Explore Stays</span></Link>
            <Link to="/contact" className="btn-outline btn-outline--dark-adaptable">Write to Us</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
