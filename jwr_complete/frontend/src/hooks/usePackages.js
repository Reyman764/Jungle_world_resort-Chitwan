import { useState, useEffect, useCallback } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const FALLBACK_PACKAGES = [
  {
    id: 'glance',
    name: 'Chitwan at a Glance',
    duration: '1 Night · 2 Days',
    badge: '1N · 2D',
    popular: false,
    discount: null,
    urgency: '2 rooms left',
    desc: 'A quick yet immersive escape. Perfect for weekend warriors who want to experience the essence of Chitwan without a long stay.',
    img: 'https://images.unsplash.com/photo-1564760055775-d63b17a55c44?auto=format&fit=crop&w=900&q=80',
    includes: ['Welcome drink & cultural program', 'Elephant bathing (if available)', 'Jeep safari in National Park', 'Canoe safari on Rapti River', 'Tharu village walk', 'All meals (breakfast, lunch, dinner)'],
    price: 'NPR 15,960',
    priceINR: 'NPR 9,600',
    priceNPR: 'NPR 5,000',
    prices: { foreigner: 15960, saarc: 9600, nepali: 5000 },
  },
  {
    id: 'closeup',
    name: 'Close Up Chitwan',
    duration: '2 Nights · 3 Days',
    badge: '2N · 3D',
    popular: false,
    discount: '15% Off',
    urgency: null,
    desc: 'A more intimate look at Chitwan. Two nights give you time to slow down, breathe the forest air, and connect with nature.',
    img: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=80',
    includes: ['All Day 1 activities', 'Guided jungle walk at dawn', 'Bird watching with naturalist', 'Sunset canoe ride', 'Cultural village dinner experience', 'All meals included'],
    price: 'NPR 25,270',
    priceINR: 'NPR 15,200',
    priceNPR: 'NPR 8,500',
    prices: { foreigner: 25270, saarc: 15200, nepali: 8500 },
  },
  {
    id: 'explore',
    name: 'Explore Chitwan',
    duration: '3 Nights · 4 Days',
    badge: '3N · 4D',
    popular: true,
    discount: null,
    urgency: null,
    desc: 'The full measure of Chitwan — four days shaped by the forest, guided by naturalists who know every trail and waterhole.',
    img: 'https://sweethomechitwan.com/wp-content/uploads/2025/01/j2.jpg',
    includes: ['All activities from Day 1 & 2', 'Elephant back safari (optional)', 'Naturalist-led jungle drives', 'Sunset viewpoint trek', 'Farewell Tharu cultural dinner', 'All meals + airport transfers'],
    price: 'NPR 33,250',
    priceINR: 'NPR 24,000',
    priceNPR: 'NPR 12,500',
    prices: { foreigner: 33250, saarc: 24000, nepali: 12500 },
  },
]

const FALLBACK_PROMO = {
  label: 'Early Bird Discount Expires In',
  endsAt: '2026-09-30',
}

const PRESELECT_MAP = { 1: 'glance', 2: 'closeup', 3: 'explore' }

export function resolvePreselect(raw) {
  if (!raw) return null
  if (PRESELECT_MAP[raw]) return PRESELECT_MAP[raw]
  if (PRESELECT_MAP[Number(raw)]) return PRESELECT_MAP[Number(raw)]
  return String(raw)
}

export function usePackages() {
  const [packages, setPackages] = useState(FALLBACK_PACKAGES)
  const [promo, setPromo] = useState(FALLBACK_PROMO)
  const [loading, setLoading] = useState(true)
  const [fromApi, setFromApi] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/packages`)
      if (!res.ok) throw new Error('Failed to load packages')
      const data = await res.json()
      if (data.packages?.length) {
        setPackages(data.packages)
        setFromApi(true)
      }
      if (data.promo) setPromo(data.promo)
    } catch {
      setPackages(FALLBACK_PACKAGES)
      setFromApi(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { packages, promo, loading, fromApi, reload: load }
}

export { FALLBACK_PACKAGES, FALLBACK_PROMO }
