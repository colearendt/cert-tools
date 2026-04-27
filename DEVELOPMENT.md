# Development Guide: Origin Certificate PFX Generator

## Overview

This tool converts Cloudflare Origin Certificates from PEM format to PKCS#12 (PFX) format entirely within the browser using PKI.js and the WebCrypto API.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Client-Side)                                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  User Interface (Astro + HTML)                        │  │
│  │  - Certificate input                                  │  │
│  │  - Private key input                                  │  │
│  │  - Root CA selection                                  │  │
│  │  - Password entry                                     │  │
│  └───────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  PFX Generator Module (PKI.js + WebCrypto)            │  │
│  │  - Parse PEM certificates                             │  │
│  │  - Convert to ASN.1 structures                        │  │
│  │  - Build PKCS#12 container                            │  │
│  │  - Encrypt with password                              │  │
│  │  - Export to binary PFX                               │  │
│  └───────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  File Download (Blob API)                             │  │
│  │  - Create blob from binary data                       │  │
│  │  - Generate download link                             │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

Security: All operations happen client-side. No data leaves the browser.
```

## Technical Stack

- **Framework**: Astro 4.x with Cloudflare adapter
- **Crypto Library**: PKI.js 3.x with WebCrypto API
- **Styling**: Kumo Design System (Cloudflare's design system)
- **Deployment**: Cloudflare Workers/Pages
- **Language**: TypeScript/JavaScript

## PKI.js Integration

PKI.js is a pure JavaScript library for working with PKI operations. It uses the WebCrypto API for cryptographic operations.

### Key Components

1. **Certificate Parsing**: `pkijs.Certificate` class
2. **Private Key Handling**: `pkijs.PrivateKeyInfo` class
3. **PKCS#12 Construction**: `pkijs.PFX` class
4. **ASN.1 Encoding**: `asn1js` library

### PKCS#12 Structure

```
PKCS#12 (PFX) Container
├── Content Type: data
└── Content
    └── AuthenticatedSafe
        ├── Content Type: encryptedData (certificates)
        │   └── Encrypted Content
        │       └── Certificates
        │           ├── Client Certificate
        │           └── Root CA Certificate (optional)
        └── Content Type: encryptedData (private key)
            └── Encrypted Content
                └── Private Key
```

## Development Setup

### Prerequisites

- Node.js 20+ 
- npm or pnpm
- Cloudflare account (for deployment)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd origin-cert-pfx-generator

# Install dependencies
npm install

# Install PKI.js and dependencies
npm install pkijs asn1js pvutils

# Generate Wrangler types
npx wrangler types
```

### Local Development

```bash
# Start Astro dev server
npm run dev

# Or start Wrangler dev server (includes Worker bindings)
npx wrangler dev
```

### Building

```bash
# Build for production
npm run build

# The output is in ./dist directory
# This is what gets deployed to Cloudflare
```

## Implementation Details

### 1. PEM to ArrayBuffer Conversion

```javascript
function pemToArrayBuffer(pem) {
  // Remove PEM headers/footers and whitespace
  const base64 = pem
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s/g, '');
  
  // Convert base64 to binary
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i);
  }
  
  return buffer;
}
```

### 2. Certificate Parsing

```javascript
import { Certificate } from 'pkijs';
import { fromBER } from 'asn1js';

function parseCertificate(pem) {
  const buffer = pemToArrayBuffer(pem);
  const asn1 = fromBER(buffer);
  return new Certificate({ schema: asn1.result });
}
```

### 3. Private Key Parsing

```javascript
import { PrivateKeyInfo } from 'pkijs';

function parsePrivateKey(pem) {
  const buffer = pemToArrayBuffer(pem);
  const asn1 = fromBER(buffer);
  return new PrivateKeyInfo({ schema: asn1.result });
}
```

### 4. Creating PKCS#12

```javascript
import { PFX, AuthenticatedSafe, CertBag } from 'pkijs';

async function createPKCS12(certificate, privateKey, rootCA, password) {
  // Parse certificates
  const cert = parseCertificate(certificate);
  const pki = parsePrivateKey(privateKey);
  
  // Create certificate bag
  const certBag = new CertBag();
  certBag.certId = '1.2.840.113549.1.9.22.1'; // X.509 certificate
  certBag.value = cert;
  
  // Build PFX structure
  const pfx = new PFX({
    version: 3,
    authSafe: new AuthenticatedSafe({
      // ... structure
    })
  });
  
  // Export with password encryption
  return await pfx.export(password);
}
```

### 5. Encryption Parameters

PKCS#12 uses PBKDF2 for key derivation and typically uses:
- **Key Derivation**: PBKDF2 with HMAC-SHA-1 or HMAC-SHA-256
- **Iterations**: 2048 (modern standard)
- **Cipher**: 3DES-CBC or AES-256-CBC
- **MAC**: HMAC-SHA-1

## Testing

### Unit Tests

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

### Manual Testing

1. Generate an Origin Certificate in Cloudflare dashboard
2. Copy certificate and private key
3. Paste into the tool
4. Download PFX file
5. Verify with OpenSSL:

```bash
# Verify PFX contents
openssl pkcs12 -in certificate.pfx -info -noout

# Extract certificate
openssl pkcs12 -in certificate.pfx -clcerts -nokeys -out cert.pem

# Extract private key
openssl pkcs12 -in certificate.pfx -nocerts -nodes -out key.pem

# Test on Windows
# Import into Certificate Manager (certmgr.msc)
# Or bind to IIS site
```

## Security Considerations

### Client-Side Security

1. **No Server Transmission**: All data stays in browser
2. **WebCrypto API**: Uses browser's native crypto implementation
3. **Secure Random**: Uses `crypto.getRandomValues()` for IVs
4. **Memory Safety**: Sensitive data cleared after use

### PFX Security

1. **Password Strength**: Enforce minimum 8 characters
2. **PBKDF2 Iterations**: Use 2048+ iterations
3. **Cipher Selection**: Prefer AES-256 over 3DES

## Debugging

### Common Issues

1. **PKI.js Not Loading**
   - Check that all dependencies are installed
   - Verify imports in the script

2. **Certificate Parsing Errors**
   - Verify PEM format is correct
   - Check for extra whitespace or missing headers

3. **PFX Import Fails on Windows**
   - Ensure password meets Windows requirements
   - Check that certificate chain is complete

### Logging

Enable debug logging:

```javascript
// In browser console
localStorage.setItem('pfx-debug', 'true');
```

## Deployment

### Cloudflare Workers

```bash
# Deploy to Workers
npx wrangler deploy

# View logs
npx wrangler tail
```

### Environment Variables

Set in `wrangler.toml` or via Wrangler CLI:

```bash
npx wrangler secret put MY_SECRET
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request

## Resources

- [PKI.js Documentation](https://github.com/PeculiarVentures/PKI.js)
- [RFC 7292 - PKCS #12](https://tools.ietf.org/html/rfc7292)
- [WebCrypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Cloudflare Workers Best Practices](https://developers.cloudflare.com/workers/best-practices/)
