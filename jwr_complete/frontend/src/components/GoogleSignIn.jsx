import React, { useEffect, useRef, useState } from 'react'

const GSI_SRC = 'https://accounts.google.com/gsi/client'

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GSI_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', reject)
      if (window.google?.accounts?.id) resolve()
      return
    }
    const script = document.createElement('script')
    script.src = GSI_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = reject
    document.head.appendChild(script)
  })
}

/**
 * Returns true if the client ID looks like a placeholder (e.g. contains 'xxx')
 * rather than a real Google OAuth 2.0 client ID.
 * Real client IDs look like: 123456789012-abcdefgh.apps.googleusercontent.com
 */
function isPlaceholder(id) {
  if (!id) return true
  // Placeholder patterns used in env.example files
  if (/x{3,}/i.test(id)) return true
  // Must end with .apps.googleusercontent.com
  if (!id.endsWith('.apps.googleusercontent.com')) return true
  // The numeric prefix must be digits only (before the first dash)
  const prefix = id.split('-')[0]
  if (!/^\d+$/.test(prefix)) return true
  return false
}

/**
 * Google Sign-In button for guest booking.
 * @param {{ onCredential: (credential: string) => void, onError?: (msg: string) => void, disabled?: boolean }} props
 */
export default function GoogleSignIn({ onCredential, onError, disabled }) {
  const btnRef = useRef(null)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState(null)

  const configured = clientId && !isPlaceholder(clientId)

  useEffect(() => {
    if (!configured || disabled) return

    let cancelled = false

    loadGoogleScript()
      .then(() => {
        if (cancelled || !btnRef.current) return

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response?.credential) onCredential(response.credential)
            else onError?.('Google sign-in was cancelled.')
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        })

        window.google.accounts.id.renderButton(btnRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: Math.min(360, btnRef.current.offsetWidth || 360),
        })

        setReady(true)
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load Google sign-in.')
      })

    return () => { cancelled = true }
  }, [configured, disabled, onCredential, onError])

  if (!configured) {
    return (
      <p className="google-signin__missing">
        Google sign-in is not configured —{' '}
        add a valid <code>VITE_GOOGLE_CLIENT_ID</code> to your <code>.env</code>.
      </p>
    )
  }

  if (loadError) {
    return <p className="google-signin__missing" role="alert">{loadError}</p>
  }

  return (
    <div className={`google-signin ${disabled ? 'google-signin--disabled' : ''}`}>
      <div ref={btnRef} className="google-signin__btn" aria-hidden={!ready} />
      {!ready && !loadError && (
        <span className="google-signin__loading">Loading Google sign-in…</span>
      )}
    </div>
  )
}
