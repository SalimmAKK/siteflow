import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // We register the service worker ourselves (src/main.tsx) so we can
      // surface the "update available" toast — see Phase 3.
      injectRegister: false,
      workbox: {
        // Precache the app shell: JS/CSS bundles, the HTML entry, and local
        // static assets (icons/manifest). Google Fonts are loaded from a CDN,
        // so they're handled via runtimeCaching below instead.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest}"],
        // Our main bundle is ~1.7MB; default cap is 2MB. Give it headroom so
        // precaching doesn't silently skip the shell as the app grows.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        // Offline deep-links still get the shell; React Router renders
        // whatever's available client-side from there.
        navigateFallback: "/index.html",
        runtimeCaching: [
          // Google Fonts — public, static, safe to cache aggressively.
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-stylesheets" },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Open-Meteo weather forecast — public, non-user data. Network-first
          // so it's fresh online, with a short-lived fallback offline (matches
          // the app's own 30-min in-memory cache in src/lib/weather.ts).
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "weather-api",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Firestore's realtime Listen channel is a long-lived streaming
          // connection, not a cacheable request/response pair — intercepting
          // it can break the SDK's own reconnect/offline logic. Firestore
          // already does its own in-memory offline queuing. Deliberately
          // NOT cached here, per the "stay conservative with authenticated
          // data" requirement — explicit NetworkOnly documents that choice.
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: "NetworkOnly",
          },
          // Firebase Auth token exchange — must never be cached/replayed.
          {
            urlPattern: /^https:\/\/(identitytoolkit|securetoken)\.googleapis\.com\/.*/i,
            handler: "NetworkOnly",
          },
        ],
      },
      manifest: {
        name: "SiteFlow",
        short_name: "SiteFlow",
        description: "Construction site operations platform",
        // --blueprint from src/index.css — the app's primary brand accent.
        theme_color: "#26456B",
        // --cream, the app's paper/background tone in light mode.
        background_color: "#F7F1E4",
        display: "standalone",
        orientation: "portrait",
        start_url: "/dashboard",
        scope: "/",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/pwa-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
