import { defineConfig, type Plugin } from 'vitest/config'
import react from '@vitejs/plugin-react'

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

function cspNoBuild(): Plugin {
  return {
    name: 'csp-no-build',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
        injectTo: 'head-prepend',
      },
    ],
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), cspNoBuild()],
  build: { assetsInlineLimit: 0 },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
