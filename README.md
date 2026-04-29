# 🔐 Origin Certificate PFX Generator

A secure, client-side tool to convert Cloudflare Origin Certificates to PKCS#12 (PFX) format for Windows servers.

## Features

- 🔒 **Client-side only** - Private keys never leave your browser
- 🚀 **Deploy to Cloudflare** - One-click deployment to your own account
- 📦 **Root CA bundling** - Optionally include Cloudflare Origin CA root certificates
- 🎨 **Kumo Design** - Built with Cloudflare's design system
- ⚡ **Works offline** - No server required after initial load
- ✅ **Standards compliant** - Generates real PKCS#12 files using PKI.js

## Quick Start

### Deploy to Cloudflare

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/colearendt/cert-tools)

Or manually:

```bash
# Clone the repository
git clone https://github.com/colearendt/cert-tools
cd cert-tools

# Install dependencies
npm install

# Deploy to your Cloudflare account
npm run deploy
```

### Local Development

```bash
npm install
npm run dev
```

## Usage

1. **Generate an Origin Certificate** in the Cloudflare dashboard (SSL/TLS → Origin Server → Create Certificate)
2. **Copy the certificate and private key** (PEM format) - the private key is only shown once!
3. **Paste them into this tool** - make sure to include the full PEM headers
4. **Choose whether to include the Cloudflare Root CA** (recommended for Windows IIS)
5. **Set a password** for the PFX file (Windows requires this when importing)
6. **Click "Generate PFX File"** and wait for the process to complete
7. **Download** your certificate.pfx file
8. **Import into Windows** using the Certificate Manager (mmc.exe) or IIS Manager

## Why Client-Side?

Your private key is sensitive cryptographic material. This tool:
- Generates the PFX entirely in your browser using PKI.js and WebCrypto API
- Never transmits your private key to any server
- Runs in your own Cloudflare account (when deployed)
- Can be audited by reviewing the source code
- Clears private key from memory after generation

## Technical Details

- **Framework**: [Astro](https://astro.build) with Cloudflare Workers adapter
- **Design**: [Kumo](https://kumo.cfdata.org) - Cloudflare's design system
- **Cryptography**: [PKI.js](https://github.com/PeculiarVentures/PKI.js) for PKCS#12 generation
- **Standards**: RFC 7292 compliant PKCS#12 implementation
- **Deployment**: Cloudflare Workers with static asset hosting
- **CSP Compliance**: Strict Content Security Policy (all dependencies bundled)

### Content Security Policy

This application uses a strict Content Security Policy (CSP) with all dependencies bundled at build time:

```
CSP: script-src 'self' 'unsafe-inline'
```

**No external scripts** - PKI.js and all dependencies are bundled by Astro/Vite at build time and served from your own domain. This provides:
- ✅ Maximum security (no external script sources)
- ✅ Works offline after initial load
- ✅ No CDN dependencies or failures
- ✅ Faster loading (single bundle)

**Bundled Dependencies:**
- `pkijs` - PKCS#12 generation library
- `asn1js` - ASN.1 parsing
- All bundled at build time, no runtime fetching

### Project Structure

```
src/
├── layouts/
│   └── Layout.astro          # Base HTML layout with CSP headers
├── pages/
│   └── index.astro           # Main application UI
├── scripts/
│   ├── certificates.js       # Cloudflare root CA certificates
│   ├── pfx-real.js           # Real PKCS#12 generation using PKI.js
│   ├── pfx-generator.js      # UI controller and form handling
│   └── pfx-verifier.js       # Testing and verification utilities
tests/
├── certificates.test.ts      # Certificate utility tests
├── pfx-generation.test.ts    # PFX generation tests
├── e2e-csp.test.ts          # CSP compliance tests
└── README.md                # Test documentation
```

## Verification

### Verify your PFX file

After downloading, you can verify the PFX file using OpenSSL:

```bash
# Check PFX structure (no password required for basic info)
openssl pkcs12 -in certificate.pfx -info -noout

# View certificates in the PFX
openssl pkcs12 -in certificate.pfx -out cert.pem -nodes
openssl x509 -in cert.pem -text -noout
```

### Test PKI.js Integration

The tool automatically runs verification tests when loaded. Check your browser's developer console to see:
- PKI.js loading status
- Web Crypto API availability
- Test certificate generation results

## Troubleshooting

### "PKI.js library not loaded"

This should not happen with bundled dependencies. If you see this error:
1. Check browser console for JavaScript errors
2. Ensure you're using a modern browser (Chrome 80+, Firefox 78+, Safari 14+)
3. Try hard-refreshing the page (Ctrl/Cmd + Shift + R)
4. If the issue persists, there may be a bug - please report it

### "Failed to parse certificate"

1. Ensure you copied the entire certificate including `-----BEGIN CERTIFICATE-----` and `-----END CERTIFICATE-----`
2. Check that there are no extra spaces or missing characters
3. Make sure the certificate is in PEM format (Base64 encoded)

### "Failed to parse private key"

1. Ensure you copied the entire private key
2. The private key format should be PKCS#8 (`-----BEGIN PRIVATE KEY-----`) or PKCS#1 (`-----BEGIN RSA PRIVATE KEY-----`)
3. If you only have the certificate, you need to generate a new one - the private key is only shown once in Cloudflare dashboard

### "Certificate and key do not match"

The certificate and private key must be generated together. If you have a mismatch:
1. Generate a new Origin Certificate in Cloudflare dashboard
2. Copy both the certificate AND private key immediately (the key is only shown once)
3. Use those together in this tool

### Windows won't import the PFX

1. Make sure you included the Cloudflare Root CA when generating
2. Ensure the password you entered matches what you're typing during import
3. Try importing via IIS Manager instead of the Certificate MMC
4. Check that the certificate hasn't expired

### Key Files

- `src/scripts/pfx-real.js` - Core PKCS#12 generation logic using PKI.js
- `src/scripts/certificates.js` - Real Cloudflare Origin CA root certificates
- `src/scripts/pfx-generator.js` - Form validation and user interaction
- `src/scripts/pfx-verifier.js` - Automated testing and verification

### Testing

#### Automated Tests

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

Tests are located in the `tests/` directory and cover:
- **Vendor Proxy** - CDN library proxying and caching
- **Certificate Utilities** - RSA/ECC detection, root CA handling
- **PFX Generation** - PKI.js integration and error handling
- **E2E CSP** - Security policy compliance

#### Built-in Browser Tests

The application also includes runtime verification. Open browser developer console to see:

```javascript
// Run verification tests manually
await PFXVerifier.runVerificationTests();
```

This checks:
- PKI.js library loading
- Web Crypto API availability
- Test certificate generation capability

## Security Considerations

1. **Private Key Handling**: Private keys are processed in memory only and cleared after use
2. **No Server Transmission**: All cryptographic operations happen client-side
3. **HTTPS Required**: The tool must be served over HTTPS for WebCrypto API to work
4. **Content Security Policy**: Strict CSP headers prevent XSS attacks
5. **No Cookies/Storage**: No sensitive data is stored in cookies or localStorage

## Browser Compatibility

- Chrome/Edge 80+
- Firefox 78+
- Safari 14+

Requires support for:
- Web Crypto API
- ES6 modules
- CSS Grid and Flexbox

## License

MIT License - See [LICENSE](./LICENSE) for details

## Contributing

Contributions welcome! Please ensure:
- Code follows existing style
- Tests pass (`npm test`)
- New tests added for new features
- Documentation is updated
- Security best practices are maintained

### Development Workflow

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run dev server
npm run dev

# Deploy
npm run deploy
```

## Support

- [Source Code](https://github.com/colearendt/cert-tools)
- [Cloudflare Origin CA Documentation](https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/)
- [PKI.js Documentation](https://github.com/PeculiarVentures/PKI.js)
- [OpenSSL PKCS#12 Reference](https://www.openssl.org/docs/manmaster/man1/openssl-pkcs12.html)
