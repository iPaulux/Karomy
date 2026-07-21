import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
// Extension explicite : tsconfig.node.json est en `moduleResolution: nodenext`.
import { netlifyDev } from './build/netlifyDev.ts'

export default defineConfig(({ mode }) => {
  // Le 3e argument vide charge TOUTES les variables du .env, pas seulement les
  // `VITE_*`. C'est ce qui rend `YOUTUBE_API_KEY` lisible par la fonction servie
  // en local — elle n'atterrit jamais dans le bundle client pour autant.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    plugins: [
      react(),
      netlifyDev(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
        manifest: {
          name: 'Karomy — Karaoké',
          short_name: 'Karomy',
          description:
            'Ouvrez une room sur la télé, scannez le QR code, ajoutez vos chansons depuis votre téléphone.',
          lang: 'fr',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#fdf6e9',
          theme_color: '#fdf6e9',
          icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // Karomy est temps réel : mettre les appels Supabase en cache donnerait
          // une file périmée. On ne précache que le shell de l'app.
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts',
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/i\.ytimg\.com\//,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'yt-thumbnails',
                expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 7 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
  }
})
