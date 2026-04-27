import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    mode: 'directory',
    // Enable image optimization
    imageService: 'cloudflare'
  }),
  vite: {
    ssr: {
      external: ['pkijs', 'asn1js', 'pvutils']
    },
    // Optimize build output
    build: {
      target: 'es2022',
      minify: true,
      sourcemap: true
    }
  },
  // Security headers
  server: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://cdn.kumo.cloudflare.com https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:;"
    }
  }
});
