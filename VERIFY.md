# Verification & Testing Guide

## Quick Test

```bash
# Navigate to project
cd /Users/colearendt/scratch/tls-20260423

# Install dependencies
npm install

# Start development server
npm run dev
```

Then:
1. Open http://localhost:4321
2. Paste a test certificate and key
3. Enter password
4. Click "Generate PFX File"
5. Download the file
6. Verify with OpenSSL (see below)

## Testing with OpenSSL

### 1. Verify PFX Structure
```bash
openssl pkcs12 -in certificate.pfx -info -noout
# Enter password when prompted
```

### 2. Extract Certificate
```bash
openssl pkcs12 -in certificate.pfx -clcerts -nokeys -out cert.pem
```

### 3. Extract Private Key
```bash
openssl pkcs12 -in certificate.pfx -nocerts -nodes -out key.pem
```

### 4. Test on Windows
1. Double-click the .pfx file
2. Follow the Certificate Import Wizard
3. Import to "Personal" store
4. Open IIS Manager
5. Bind to a website

## Test Certificate (Self-Signed)

Generate a test certificate:

```bash
# Generate private key
openssl genrsa -out test.key 2048

# Generate certificate
openssl req -new -x509 -key test.key -out test.crt -days 365 \
  -subj "/C=US/ST=CA/L=SF/O=Test/CN=test.example.com"

# Create PFX with OpenSSL (for comparison)
openssl pkcs12 -export -out test.pfx -inkey test.key -in test.crt \
  -passout pass:testpassword123

# Test our tool with these files
# Copy test.crt and test.key content into the web form
```

## File Structure

```
tls-20260423/
├── src/
│   ├── scripts/
│   │   ├── pfx-generator.js    # Main UI logic
│   │   └── pfx-real.js         # Real PKCS#12 implementation
│   ├── pages/
│   │   └── index.astro         # Main page with PKI.js CDN
│   ├── layouts/
│   │   └── Layout.astro        # Base layout
│   └── worker.ts               # Cloudflare Worker
├── DEVELOPMENT.md              # Full dev docs
├── IMPLEMENTATION_GUIDE.md     # Implementation details
├── VERIFY.md                   # This file
└── package.json
```

## Implementation Status

✅ **Complete:**
- Astro + Cloudflare Workers setup with best practices
- Kumo design system UI
- Client-side certificate validation
- Root CA bundling option
- Security headers and error handling
- PKI.js integration (loaded from CDN)
- Real PKCS#12 structure creation
- WebCrypto API encryption

⚠️ **Needs Testing:**
- Verify generated PFX files work with OpenSSL
- Test on Windows IIS
- Test with real Cloudflare Origin Certificates

## How It Works

1. **User Input**: Certificate and key pasted into form
2. **Validation**: PEM format validated
3. **Parsing**: PKI.js parses ASN.1 structures
4. **PKCS#12 Construction**: 
   - Creates SafeBags for certificates
   - Creates SafeBag for private key
   - Builds AuthenticatedSafe structure
   - Creates PFX container
5. **Encryption**: PBKDF2 + AES-256-CBC
6. **Export**: Binary PFX file download

## Security Features

- ✅ All crypto client-side (WebCrypto API)
- ✅ PBKDF2 with 2048 iterations
- ✅ AES-256-CBC encryption
- ✅ No data transmitted to server
- ✅ Secure random IV generation
- ✅ Password-based key derivation

## Next Steps

1. Run `npm install` and `npm run dev`
2. Test with a real certificate
3. Verify output with OpenSSL
4. Deploy with `npx wrangler deploy`
