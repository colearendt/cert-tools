# Tests

This directory contains tests for the Origin Certificate PFX Generator.

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (for development)
npm run test:watch
```

## Test Structure

- **`certificates.test.ts`** - Tests for certificate utilities
  - RSA vs ECC detection
  - Root CA certificate validation
  - PEM format verification

- **`pfx-generation.test.ts`** - Tests for PFX generation
  - PKI.js availability checks
  - Integration tests
  - Error handling

- **`e2e-csp.test.ts`** - End-to-end tests for CSP compliance
  - Validates CSP headers are strict
  - Verifies bundled dependencies (no external scripts)

## Writing Tests

Tests use [Vitest](https://vitest.dev/) with Node.js environment.

### Example Test

```typescript
import { describe, it, expect } from 'vitest';
import { detectCertificateType } from '../src/scripts/certificates';

describe('Certificate Utilities', () => {
  it('should detect RSA certificates', () => {
    const cert = '-----BEGIN CERTIFICATE-----\nRSA...';
    expect(detectCertificateType(cert)).toBe('rsa');
  });
});
```

## Test Environment

Tests run in Node.js environment. Some tests check if PKI.js classes are available and skip if not. In a real browser environment with PKI.js bundled, all tests would run fully.

## CI Integration

Tests are designed to run in CI environments:

```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: npm test
```

## Coverage

To generate coverage report:

```bash
npm test -- --coverage
```

Coverage reports are generated in:
- `coverage/text` - Terminal output
- `coverage/json` - JSON format
- `coverage/html` - HTML report (open `coverage/index.html`)
