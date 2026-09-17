import os from 'node:os'

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const machine = os.hostname()

/**
 * Hostnames the dev server answers to. Vite refuses unknown Host headers as
 * DNS-rebinding protection, which otherwise breaks http://<machine-name>:<port>
 * from another device on the wifi. Add more (a tunnel domain, say) with
 * VITE_ALLOWED_HOSTS=a.example.com,b.example.com.
 */
const allowedHosts = [
  machine,
  `${machine}.lan`,
  `${machine}.local`,
  ...(process.env.VITE_ALLOWED_HOSTS?.split(',').map((host) => host.trim()).filter(Boolean) ??
    []),
]

/**
 * Forward /api to the backend process (see ../server) so the browser stays on
 * one origin: no CORS, no VITE_API_BASE_URL, and the app works under whatever
 * address you opened it with -- localhost, the machine name, or a LAN IP.
 * Production is unaffected: the Vercel build still uses VITE_API_BASE_URL.
 */
const apiTarget = process.env.VITE_DEV_API_TARGET ?? 'http://127.0.0.1:8080'
// xfwd adds X-Forwarded-For, so the API's per-IP rate limiter can tell devices
// apart instead of bucketing the whole party under the proxy. It only counts if
// the backend runs with TRUST_PROXY=1, which is safe here because the proxy is
// the only way in.
const proxy = { '/api': { target: apiTarget, changeOrigin: false, xfwd: true } }

export default defineConfig({
  plugins: [react()],
  server: {
    // 0.0.0.0 so phones on the same wifi can reach `npm run dev`.
    host: true,
    port: 5173,
    allowedHosts,
    proxy,
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts,
    proxy,
  },
})
