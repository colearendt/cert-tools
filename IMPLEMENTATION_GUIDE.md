# PFX Implementation Guide

## Current Status

The Origin Certificate PFX Generator has been created with:
- ✅ Astro + Cloudflare Workers setup with best practices
- ✅ Kumo design system UI
- ✅ Client-side certificate input and validation
- ✅ Root CA bundling option
- ✅ Security headers and error handling
- ⚠️ **PFX generation is currently a placeholder** - needs PKI.js integration

## How to Complete the Implementation

### Step 1: Install Dependencies

```bash
cd /Users/colearendt/scratch/tls-20260423
npm install pkijs asn1js pvutils
```

### Step 2: Implement Real PFX Generation

Replace the placeholder `generatePFX` function in `src/scripts/pfx-generator.js`:

```javascript
import * as pkijs from 'pkijs';
import * as asn1js from 'asn1js';

async function generatePFX(certPEM, keyPEM, rootCAPEM, password) {
  // 1. Parse PEM to ArrayBuffer
  const certBuffer = pemToArrayBuffer(certPEM);
  const keyBuffer = pemToArrayBuffer(keyPEM);
  
  // 2. Parse certificate using PKI.js
  const certASN1 = asn1js.fromBER(certBuffer);
  const certificate = new pkijs.Certificate({ schema: certASN1.result });
  
  // 3. Parse private key
  const keyASN1 = asn1js.fromBER(keyBuffer);
  const privateKey = new pkijs.PrivateKeyInfo({ schema: keyASN1.result });
  
  // 4. Create certificate bag
  const certBag = new pkijs.CertBag({
    certId: '1.2.840.113549.1.9.22.1', // X.509
    value: certificate
  });
  
  // 5. Create safe bag for certificate
  const safeBag = new pkijs.SafeBag({
    bagId: '1.2.840.113549.1.12.10.1.3', // CertBag
    bagValue: certBag.toSchema(),
    bagAttributes: [
      new pkijs.Attribute({
        type: '1.2.840.113549.1.9.20', // friendlyName
        values: [new asn1js.BmpString({ value: 'certificate' })]
      })
    ]
  });
  
  // 6. Create safe bag for private key
  const keyBag = new pkijs.SafeBag({
    bagId: '1.2.840.113549.1.12.10.1.2', // PKCS8ShroudedKeyBag
    bagValue: privateKey.toSchema(),
    bagAttributes: [
      new pkijs.Attribute({
        type: '1.2.840.113549.1.9.21', // localKeyId
        values: [certificate.serialNumber]
      })
    ]
  });
  
  // 7. Create authenticated safe (encrypted content)
  const authenticatedSafe = new pkijs.AuthenticatedSafe({
    safeContents: [
      {
        privacyMode: 1, // Password privacy
        value: [safeBag]
      },
      {
        privacyMode: 1,
        value: [keyBag]
      }
    ]
  });
  
  // 8. Create PFX container
  const pfx = new pkijs.PFX({
    version: 3,
    authSafe: authenticatedSafe
  });
  
  // 9. Export with password
  const pfxBuffer = await pfx.export(password, {
    iterations: 2048,
    hashAlgorithm: 'SHA-256',
    encryptionAlgorithm: 'AES-256-CBC'
  });
  
  return pfxBuffer;
}

function pemToArrayBuffer(pem) {
  const base64 = pem
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s/g, '');
  
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i);
  }
  
  return buffer;
}
```

### Step 3: Run Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Test the app at http://localhost:4321
```

### Step 4: Test PFX Generation

1. Generate an Origin Certificate in Cloudflare dashboard
2. Copy the certificate and key
3. Paste into the tool
4. Download the PFX file
5. Verify with OpenSSL:

```bash
openssl pkcs12 -in downloaded.pfx -info -noout
```

### Step 5: Deploy

```bash
npx wrangler deploy
```

## Project Structure

```
tls-20260423/
├── src/
│   ├── pages/
│   │   └── index.astro          # Main UI with form
│   ├── scripts/
│   │   └── pfx-generator.js     # PFX generation logic (needs PKI.js)
│   ├── layouts/
│   │   └── Layout.astro         # Kumo-styled layout
│   └── worker.ts                # Cloudflare Worker entry
├── DEVELOPMENT.md               # Full development docs
├── IMPLEMENTATION_GUIDE.md      # This file
├── package.json                 # Dependencies
├── astro.config.mjs            # Astro config
└── wrangler.toml               # Worker config with best practices
```

## What's Working Now

- ✅ Full UI with Kumo design system
- ✅ Form validation
- ✅ Root CA selection (RSA/ECC)
- ✅ Security headers
- ✅ Error handling
- ✅ Cloudflare Workers deployment ready

## What Needs To Be Done

- ⚠️ Replace placeholder PFX generation with real PKI.js implementation
- ⚠️ Test generated PFX files with OpenSSL and Windows
- ⚠️ Add proper TypeScript types for PKI.js

## Quick Start

```bash
# 1. Navigate to project
cd /Users/colearendt/scratch/tls-20260423

# 2. Install dependencies
npm install

# 3. Install PKI.js
npm install pkijs asn1js pvutils

# 4. Implement the generatePFX function (see code above)

# 5. Run locally
npm run dev

# 6. Deploy
npx wrangler deploy
```

## Next Steps

1. Implement the `generatePFX` function with PKI.js
2. Test with real certificates
3. Verify PFX files work on Windows
4. Consider adding proper TypeScript definitions
5. Add unit tests for the PFX generation
