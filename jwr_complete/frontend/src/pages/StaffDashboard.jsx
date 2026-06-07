import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * StaffDashboard — simple redirect to the main admin dashboard.
 * Staff members authenticated via /staff/* are directed here
 * and then forwarded to the full admin panel.
 */
export default function StaffDashboard() {
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('staffToken') || localStorage.getItem('token')
    if (!token) {
      navigate('/staff/login', { replace: true })
    } else {
      navigate('/admin/dashboard', { replace: true })
    }
  }, [navigate])

  return null
}
