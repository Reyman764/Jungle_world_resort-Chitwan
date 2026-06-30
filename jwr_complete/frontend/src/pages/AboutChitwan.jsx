import React from 'react'
import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero'
import './AboutChitwan.css'

const facts = [
  { img: 'https://images.unsplash.com/photo-1422466654108-5e533f591881?auto=format&fit=crop&w=500&q=80', alt: 'Terai landscape in southern Nepal', label: 'Location', value: 'Southern Nepal, where the Terai meets the hills' },
  { img: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=500&q=80', alt: 'Sal forest in Chitwan National Park', label: 'Area', value: '952 sq km of protected core wilderness' },
  { img: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=500&q=80', alt: 'Chitwan National Park wilderness', label: 'UNESCO Status', value: 'Inscribed as World Heritage Site, 1984' },
  { img: 'https://images.unsplash.com/photo-1706187530682-5ada36b0cfc1?auto=format&fit=crop&w=500&q=80', alt: 'One-horned rhinoceros in Chitwan', label: 'One-horned Rhino', value: 'Over 700 individuals — a conservation triumph' },
  { img: 'https://images.unsplash.com/photo-1524130624025-7471ffa6e149?auto=format&fit=crop&w=500&q=80', alt: 'Bengal tiger in the wild', label: 'Bengal Tiger', value: 'More than 100 individuals, carefully protected' },
  { img: 'https://images.unsplash.com/photo-1444464666168-49d633b86797?auto=format&fit=crop&w=500&q=80', alt: 'Colorful bird species in Chitwan', label: 'Bird Species', value: '544 recorded species, and still counting' },
]

const wildlife = [
  { name: 'Bengal Tiger', img: 'https://images.unsplash.com/photo-1524130624025-7471ffa6e149?auto=format&fit=crop&w=700&q=80', alt: 'Bengal tiger in Chitwan National Park', desc: 'Chitwan is one of the last bastions of the Bengal tiger. Patient observers on dawn jeep safaris are sometimes rewarded with a sighting.' },
  { name: 'One-Horned Rhino', img: 'https://images.unsplash.com/photo-1706187530682-5ada36b0cfc1?auto=format&fit=crop&w=700&q=80', alt: 'One-horned rhinoceros on a jungle walk', desc: 'Nepal\'s conservation success story — from near-extinction to a thriving population of 700+. Easily spotted on jungle walks.' },
  { name: 'Gharial Crocodile', img: '/images/wildlife/gharial-crocodile.jpg', alt: 'Gharial crocodile basking on a river bank in Chitwan', desc: 'The long-snouted gharial basks along river banks. Critically endangered globally, Chitwan holds an important population.' },
  { name: 'Asiatic Elephant', img: 'https://images.unsplash.com/photo-1648982156491-992b4b1d1060?auto=format&fit=crop&w=700&q=80', alt: 'Wild elephants in Chitwan grasslands', desc: 'Wild herds roam the grasslands. Our resident elephants also offer bathing and interaction experiences with their mahouts.' },
  { name: 'Sloth Bear', img: 'https://images.unsplash.com/photo-1779111370141-4cc5d671be58?auto=format&fit=crop&w=700&q=80', alt: 'Sloth bear in forest habitat', desc: 'Nocturnal and elusive, sloth bears are occasionally spotted foraging in the forest. A true wildlife treat when seen.' },
  { name: 'Leopard', img: 'https://images.unsplash.com/photo-1725714627269-ecc223af272a?auto=format&fit=crop&w=700&q=80', alt: 'Leopard at the forest edge', desc: 'Silent and supremely beautiful, the leopard keeps to the forest edges and rocky outcrops of the park\'s periphery.' },
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
