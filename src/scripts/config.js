/**
 * Application Configuration
 * 
 * Central place for app-wide configuration values
 */

export const CONFIG = {
  // GitHub repository URL
  REPO_URL: 'https://github.com/colearendt/cert-tools',
  
  // Deploy to Cloudflare button URL
  DEPLOY_URL: 'https://deploy.workers.cloudflare.com/?url=https://github.com/colearendt/cert-tools',
  
  // App metadata
  APP_NAME: 'Origin Certificate PFX Generator',
  VERSION: '1.0.0',
  
  // Documentation links
  DOCS: {
    ORIGIN_CA: 'https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/',
    PKIJS: 'https://github.com/PeculiarVentures/PKI.js',
    OPENSSL: 'https://www.openssl.org/docs/manmaster/man1/openssl-pkcs12.html'
  }
};

// Make available globally for non-module contexts
if (typeof window !== 'undefined') {
  window.APP_CONFIG = CONFIG;
}
