# PWA Configuration

## vite-plugin-pwa Setup (vite.config.ts in each app)
```typescript
import { VitePWA } from 'vite-plugin-pwa'

VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.ico', 'robots.txt'],
  manifest: {
    name: 'PharmaBridge',
    short_name: 'PharmaB',
    description: 'Medicine delivered from your local pharmacy',
    theme_color: '#08080E',
    background_color: '#08080E',
    display: 'standalone',
    orientation: 'portrait',
    start_url: '/',
    scope: '/',
    icons: [
      { src: '/icon-72.png',   sizes: '72x72',   type: 'image/png' },
      { src: '/icon-96.png',   sizes: '96x96',   type: 'image/png' },
      { src: '/icon-128.png',  sizes: '128x128', type: 'image/png' },
      { src: '/icon-144.png',  sizes: '144x144', type: 'image/png' },
      { src: '/icon-152.png',  sizes: '152x152', type: 'image/png' },
      { src: '/icon-192.png',  sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/icon-384.png',  sizes: '384x384', type: 'image/png' },
      { src: '/icon-512.png',  sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
    ],
    categories: ['health', 'medical', 'shopping'],
    screenshots: [
      { src: '/screenshot-mobile.png', sizes: '390x844', type: 'image/png', form_factor: 'narrow' }
    ]
  },
  workbox: {
    // Cache strategies
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
        handler: 'CacheFirst',
        options: { cacheName: 'google-fonts', expiration: { maxEntries: 10, maxAgeSeconds: 31536000 } }
      },
      {
        urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
        handler: 'CacheFirst',
        options: { cacheName: 'cloudinary-images', expiration: { maxEntries: 100, maxAgeSeconds: 2592000 } }
      },
      {
        urlPattern: /\/api\/v1\/.*/i,
        handler: 'NetworkFirst',
        options: { cacheName: 'api-cache', networkTimeoutSeconds: 10 }
      }
    ],
    // Offline fallback
    offlineFallbackPage: '/offline.html',
    // Background sync for failed requests
    backgroundSync: {
      name: 'pharmabridge-sync',
      options: { maxRetentionTime: 24 * 60 } // 24 hours
    },
    // Skip waiting — update immediately
    skipWaiting: true,
    clientsClaim: true
  }
})
```

## PWA Manifest Meta Tags (index.html)
```html
<head>
  <meta name="theme-color" content="#08080E">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="PharmaB">
  <link rel="apple-touch-icon" href="/icon-152.png">
  <link rel="manifest" href="/manifest.webmanifest">
  <!-- Preconnect for performance -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://res.cloudinary.com">
  <link rel="preconnect" href="https://YOUR_API_DOMAIN.com">
  <!-- DNS prefetch -->
  <link rel="dns-prefetch" href="https://fcmregistrations.googleapis.com">
</head>
```

## Custom Install Prompt (NOT browser default)
```typescript
// hooks/useInstallPrompt.ts
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // Show banner after 30s if not previously dismissed
      const dismissed = localStorage.getItem('install-dismissed')
      const dismissedAt = dismissed ? new Date(dismissed) : null
      const daysSince = dismissedAt
        ? (Date.now() - dismissedAt.getTime()) / 86400000
        : Infinity
      if (daysSince > 7) setTimeout(() => setShowBanner(true), 30000)
    }
    window.addEventListener('beforeinstallprompt', handler as EventListener)
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener)
  }, [])

  const install = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const result = await deferredPrompt.userChoice
    setShowBanner(false)
    setDeferredPrompt(null)
    if (result.outcome === 'accepted') {
      // Track install event in analytics
    }
  }

  const dismiss = () => {
    setShowBanner(false)
    localStorage.setItem('install-dismissed', new Date().toISOString())
  }

  return { showBanner, install, dismiss }
}
```

## Service Worker: Push Notifications (public/sw.js or handled by Workbox)
```javascript
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'PharmaBridge', {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data: data.data,
      actions: data.actions ?? [],
      vibrate: [200, 100, 200]
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(clients.openWindow(url))
})
```

## Offline Page (/public/offline.html)
```html
<!-- Fully self-contained — no external dependencies -->
<!-- Dark themed, branded, shows connection retry button -->
<!-- Must work with zero network access -->
```

## Performance Targets
- First Contentful Paint (FCP): < 1.5s on 4G India
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.5s
- Total Blocking Time (TBT): < 200ms
- Cumulative Layout Shift (CLS): < 0.1
- JS Bundle (gzipped): < 200KB per app
- PWA Lighthouse score: > 90

## Code Splitting Rules
- EVERY route must be lazy-loaded: `const Page = lazy(() => import('./pages/Page'))`
- Wrap all lazy routes with Suspense + skeleton fallback
- Split vendor chunks: React, Framer Motion, Leaflet as separate chunks
- Charts (Recharts) only loaded in pharmacy/admin apps, not customer

## Image Optimization
- ALL medicine images: request from Cloudinary with `/f_auto,q_auto,w_400,h_400,c_fill/`
- Pharmacy logos: `/f_auto,q_auto,w_200,h_200,c_fill/`
- Add `loading="lazy"` to all images below the fold
- Add `decoding="async"` to all non-hero images
- Always specify width/height attributes to prevent CLS
