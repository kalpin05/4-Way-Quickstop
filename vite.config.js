import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      devOptions: {
        enabled: true
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,json}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/docs\.google\.com\/spreadsheets\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'google-sheets-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      manifest: {
        name: '4-Way Quick Stop',
        short_name: '4-Way',
        description: 'Your express roadside stop for fuel, food, snacks, and great deals.',
        theme_color: '#ea580c',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          {
            src: '/images/burger.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/images/burger.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        fuel: resolve(__dirname, 'pages/fuel.html'),
        store: resolve(__dirname, 'pages/store.html'),
        food: resolve(__dirname, 'pages/food.html'),
        location: resolve(__dirname, 'pages/location.html'),
        deals: resolve(__dirname, 'pages/deals.html')
      }
    }
  }
});
