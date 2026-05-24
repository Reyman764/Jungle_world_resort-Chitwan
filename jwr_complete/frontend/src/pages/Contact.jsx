import React from 'react'
import PageHero from '../components/PageHero'
import BookingWizard from '../components/BookingWizard'
import './Contact.css'

const contactCards = [
  {
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>),
    heading: 'Resort', lines: ['Sauraha, Chitwan National Park', 'Chitwan, Nepal'],
  },
  {
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>),
    heading: 'Kathmandu Office', lines: ['Thamel, Kathmandu', 'Nepal'],
  },
  {
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012.18 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.16a16 16 0 006.93 6.93l1.52-1.52a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>),
    heading: 'Phone', lines: ['056-580068 / 580100', '+977 9851198992 (Bhuwan)', '9851176509 (Kanchan)'],
  },
  {
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>),
    heading: 'Email', lines: ['info@jungleworldresort.com', 'jungleworldchitwan@gmail.com'],
  },
]

export default function Contact() {
  return (
    <main>
      <PageHero
        title="Book Your Stay"
        subtitle="Plan, personalise and confirm in minutes"
        bgImage="https://images.unsplash.com/photo-1591825729269-caeb344f6df2?w=1600&q=80"
      />

      <section id="booking-section" className="booking-section">
        <div className="booking-intro container">
          <span className="section-tag">Booking Enquiry</span>
          <h2 className="section-title">Reserve Your Chitwan Adventure</h2>
          <span className="section-divider" />
          <p className="booking-intro__text">
            Use our quick booking wizard to choose your package, select guests, and see an instant
            price estimate — then submit your enquiry and we confirm within 24 hours. No payment required upfront.
          </p>
        </div>
        <div className="container booking-wizard-wrap">
          <BookingWizard />
        </div>
      </section>

      <section className="contact-section">
        <div className="container">
          <div className="contact-grid">
            <div className="contact-info-col">
              <span className="section-tag">Get in Touch</span>
              <h2 className="contact-info__heading">We're Always<br />Here to Help</h2>
              <p className="contact-info__intro">
                Questions about our packages, custom itineraries, or the best time to visit?
                Our team at the resort responds within a few hours.
              </p>
              <div className="contact-cards">
                {contactCards.map((c, i) => (
                  <div key={i} className="contact-card">
                    <div className="contact-card__icon">{c.icon}</div>
                    <div>
                      <h4>{c.heading}</h4>
                      {c.lines.map((l, j) => <p key={j}>{l}</p>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="contact-map-col">
              <div className="contact-map">
                <iframe
                  src="https://maps.google.com/maps?width=100%25&height=450&hl=en&q=Jungle+World+Resort+Sauraha+Chitwan+Nepal&t=&z=15&ie=UTF8&iwloc=B&output=embed"
                  title="Jungle World Resort Location"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <div className="response-promise">
                <div className="rp-item">
                  <span className="rp-icon">⚡</span>
                  <div>
                    <strong>24-hour Response</strong>
                    <p>We reply to every enquiry within 24 hours, usually much sooner.</p>
                  </div>
                </div>
                <div className="rp-item">
                  <span className="rp-icon">🔒</span>
                  <div>
                    <strong>No Payment Now</strong>
                    <p>Your booking request is free — we confirm and discuss payment after contact.</p>
                  </div>
                </div>
                <div className="rp-item">
                  <span className="rp-icon">🔄</span>
                  <div>
                    <strong>Free Cancellation</strong>
                    <p>Cancel up to 72 hours before arrival with no penalty.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
