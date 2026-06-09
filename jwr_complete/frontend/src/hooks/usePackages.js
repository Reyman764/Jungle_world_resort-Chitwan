import { useState, useEffect, useCallback } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const FALLBACK_RATES = { usd_to_npr: 132, inr_to_npr: 1.58 }

export const FALLBACK_PACKAGES = [
  {
    id: 'glance', name: 'Chitwan at a Glance', duration: '1 Night · 2 Days', badge: '1N · 2D',
    popular: false, discount: null, urgency: '2 rooms left',
    desc: 'A quick yet immersive escape. Perfect for weekend warriors who want to experience the essence of Chitwan without a long stay.',
    img: '/images/gallery/resort-03.jpg',
    includes: ['Welcome drink & cultural program', 'Elephant bathing (if available)', 'Jeep safari in National Park', 'Canoe safari on Rapti River', 'Tharu village walk', 'All meals (breakfast, lunch, dinner)'],
    price: 'USD 120.91', priceINR: 'INR 6,076', priceNPR: 'NPR 5,000',
    priceOriginal: null, priceINROriginal: null,
    priceNPREquiv: { foreigner: 15960, saarc: 9600 },
    prices: { foreigner: 15960, saarc: 9600, nepali: 5000 },
  },
  {
    id: 'closeup', name: 'Close Up Chitwan', duration: '2 Nights · 3 Days', badge: '2N · 3D',
    popular: false, discount: '15% Off', urgency: null,
    desc: 'A more intimate look at Chitwan. Two nights give you time to slow down, breathe the forest air, and connect with nature.',
    img: '/images/gallery/resort-06.jpg',
    includes: ['All Day 1 activities', 'Guided jungle walk at dawn', 'Bird watching with naturalist', 'Sunset canoe ride', 'Cultural village dinner experience', 'All meals included'],
    price: 'USD 191.44', priceINR: 'INR 9,620', priceNPR: 'NPR 8,500',
    priceOriginal: null, priceINROriginal: null,
    priceNPREquiv: { foreigner: 25270, saarc: 15200 },
    prices: { foreigner: 25270, saarc: 15200, nepali: 8500 },
  },
  {
    id: 'explore', name: 'Explore Chitwan', duration: '3 Nights · 4 Days', badge: '3N · 4D',
    popular: true, discount: null, urgency: null,
    desc: 'The full measure of Chitwan — four days shaped by the forest, guided by naturalists who know every trail and waterhole.',
    img: '/images/gallery/resort-09.jpg',
    includes: ['All activities from Day 1 & 2', 'Elephant back safari (optional)', 'Naturalist-led jungle drives', 'Sunset viewpoint trek', 'Farewell Tharu cultural dinner', 'All meals + airport transfers'],
    price: 'USD 251.89', priceINR: 'INR 15,190', priceNPR: 'NPR 12,500',
    priceOriginal: null, priceINROriginal: null,
    priceNPREquiv: { foreigner: 33250, saarc: 24000 },
    prices: { foreigner: 33250, saarc: 24000, nepali: 12500 },
  },
]

export const FALLBACK_PROMO = {
  label: 'Early Bird Discount Expires In',
  endsAt: '2026-09-30',
  showCountdown: true,
}

const PRESELECT_MAP = { glance: 'glance', closeup: 'closeup', explore: 'explore', 1: 'glance', 2: 'closeup', 3: 'explore' }

export function resolvePreselect(raw) {
  if (!raw) return null
  return PRESELECT_MAP[raw] || PRESELECT_MAP[Number(raw)] || String(raw)
}

function parsePromo(p) {
  if (!p) return FALLBACK_PROMO
  return {
    label:         p.label         || FALLBACK_PROMO.label,
    endsAt:        p.endsAt        || FALLBACK_PROMO.endsAt,
    showCountdown: p.showCountdown !== undefined ? Boolean(p.showCountdown) : true,
  }
}

export function usePackages() {
  const [packages,      setPackages]      = useState(FALLBACK_PACKAGES)
  const [promo,         setPromo]         = useState(FALLBACK_PROMO)
  const [currencyRates, setCurrencyRates] = useState(FALLBACK_RATES)
  const [loading,       setLoading]       = useState(true)
  const [fromApi,       setFromApi]       = useState(false)

  const load = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/api/packages`)
      if (!res.ok) throw new Error('non-ok')
      const data = await res.json()
      if (data.packages?.length) { setPackages(data.packages); setFromApi(true) }
      if (data.promo) setPromo(parsePromo(data.promo))
      if (data.currencyRates) setCurrencyRates(data.currencyRates)
    } catch {
      setFromApi(false)
      // state stays on FALLBACK_* initial values
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { packages, promo, currencyRates, loading, fromApi, reload: load }
}
