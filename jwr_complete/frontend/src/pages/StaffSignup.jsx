import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Self-registration is disabled.
 * Staff accounts are created by admins in the dashboard.
 * Redirect anyone who lands here to the login page.
 */
export default function StaffSignup() {
  const navigate = useNavigate()
  useEffect(() => { navigate('/staff/login', { replace: true }) }, [navigate])
  return null
}
