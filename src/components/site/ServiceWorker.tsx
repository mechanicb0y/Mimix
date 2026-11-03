'use client'
import { useEffect } from 'react'

/** Registers public/sw.js in production builds (offline page and static-asset caching). */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    const register = () => { navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((e) => console.warn('[sw] registration failed', e)) }
    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })
  }, [])
  return null
}
