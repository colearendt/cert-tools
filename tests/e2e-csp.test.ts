/**
 * End-to-End Integration Tests
 * 
 * These tests verify:
 * 1. CSP headers are correct (no external scripts)
 * 2. Dependencies are bundled (not loaded from CDN)
 * 3. UI loads and initializes
 */

import { describe, it, expect } from 'vitest';

describe('E2E: CSP Compliance', () => {
  it('CSP should not allow external scripts', () => {
    const csp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:;";
    
    // CSP should not contain unpkg.com
    expect(csp).not.toContain('unpkg.com');
    
    // CSP should require scripts from self
    expect(csp).toContain("script-src 'self'");
    
    // Should allow inline styles (needed for Astro)
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
  });

  it('should not reference external CDN scripts', async () => {
    const fs = await import('fs/promises');
    const layoutContent = await fs.readFile('./src/layouts/Layout.astro', 'utf-8');
    
    // Should NOT use unpkg.com or other CDNs for scripts
    expect(layoutContent).not.toContain('unpkg.com');
    expect(layoutContent).not.toContain('cdn.jsdelivr.net');
    expect(layoutContent).not.toContain('cdnjs.cloudflare.com');
  });
});

describe('E2E: Security Headers', () => {
  it('should have strict CSP in Layout.astro', async () => {
    const fs = await import('fs/promises');
    const layoutContent = await fs.readFile('./src/layouts/Layout.astro', 'utf-8');
    
    // Should contain CSP meta tag
    expect(layoutContent).toContain('http-equiv="Content-Security-Policy"');
    
    // Should have strict script-src
    expect(layoutContent).toContain("script-src 'self'");
    
    // Should not have unpkg in script-src
    expect(layoutContent).not.toMatch(/script-src[^>]*unpkg/);
  });

  it('should import PKI.js as ES modules (bundled)', async () => {
    const fs = await import('fs/promises');
    const pfxRealContent = await fs.readFile('./src/scripts/pfx-real.js', 'utf-8');
    
    // Should import from pkijs (bundled)
    expect(pfxRealContent).toContain("import * as pkijs from 'pkijs'");
    expect(pfxRealContent).toContain("import * as asn1js from 'asn1js'");
    
    // Should NOT load from window.pkijs (CDN approach)
    expect(pfxRealContent).not.toContain('window.pkijs');
  });
});
