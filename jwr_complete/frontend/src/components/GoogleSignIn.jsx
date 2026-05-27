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
 * Google Sign-In button for guest booking.
 * @param {{ onCredential: (credential: string) => void, onError?: (msg: string) => void, disabled?: boolean }} props
 */
export default function GoogleSignIn({ onCredential, onError, disabled }) {
  const btnRef = useRef(null)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    if (!clientId || disabled) return

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
  }, [clientId, disabled, onCredential, onError])

  if (!clientId) {
    return (
      <p className="google-signin__missing">
        Google sign-in is not configured. Add <code>VITE_GOOGLE_CLIENT_ID</code> to your frontend environment.
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
