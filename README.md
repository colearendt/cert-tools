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

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/origin-cert-pfx-generator)

Or manually:

```bash
# Clone the repository
git clone https://github.com/cloudflare/origin-cert-pfx-generator
cd origin-cert-pfx-generator

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

1. Check your internet connection (PKI.js is loaded from CDN)
2. Refresh the page and wait a few seconds
3. Check browser console for network errors
4. Disable ad blockers that might block CDN scripts

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

## Development

### Project Structure

```
src/
├── layouts/
│   └── Layout.astro          # Base HTML layout with PKI.js CDN
├── pages/
│   └── index.astro           # Main application UI
├── scripts/
│   ├── certificates.js       # Cloudflare root CA certificates
│   ├── pfx-real.js           # Real PKCS#12 generation using PKI.js
│   ├── pfx-generator.js      # UI controller and form handling
│   └── pfx-verifier.js       # Testing and verification utilities
└── styles/                   # (if any custom styles)
```

### Key Files

- `src/scripts/pfx-real.js` - Core PKCS#12 generation logic using PKI.js
- `src/scripts/certificates.js` - Real Cloudflare Origin CA root certificates
- `src/scripts/pfx-generator.js` - Form validation and user interaction
- `src/scripts/pfx-verifier.js` - Automated testing and verification

### Testing

Run the built-in verification tests:

```javascript
// In browser console
await PFXVerifier.runVerificationTests();
```

This will check:
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
- Documentation is updated
- Security best practices are maintained

## Support

- [Cloudflare Origin CA Documentation](https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/)
- [PKI.js Documentation](https://github.com/PeculiarVentures/PKI.js)
- [OpenSSL PKCS#12 Reference](https://www.openssl.org/docs/manmaster/man1/openssl-pkcs12.html)
