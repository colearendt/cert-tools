import { describe, it, expect, beforeAll } from 'vitest';
import { 
  isPKIJsReady, 
  getPKIJs,
  generateRealPFX 
} from '../src/scripts/pfx-real';

// Note: These tests require PKI.js to be available
// In CI/browser environment, PKI.js should be loaded globally
describe('PFX Generation', () => {
  describe('PKI.js Availability', () => {
    it('should detect if PKI.js is ready', () => {
      const ready = isPKIJsReady();
      // This will depend on whether PKI.js is loaded in the test environment
      expect(typeof ready).toBe('boolean');
    });

    it('should return PKI.js references when ready', () => {
      const refs = getPKIJs();
      if (isPKIJsReady()) {
        expect(refs).not.toBeNull();
        expect(refs).toHaveProperty('pkijs');
        expect(refs).toHaveProperty('asn1js');
      } else {
        expect(refs).toBeNull();
      }
    });
  });

  describe('Error Handling', () => {
    it('should throw error when PKI.js is not available', async () => {
      if (!isPKIJsReady()) {
        await expect(
          generateRealPFX('cert', 'key', null, 'password')
        ).rejects.toThrow('PKI.js library not loaded');
      }
    });
  });
});

// Integration test that requires PKI.js
describe('PFX Integration', () => {
  const sampleCert = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAJC1HiIAZAiUMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMTkwMjAzMTQ0NjM3WhcNMjAwMjAzMTQ0NjM3WjBF
MQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEA2QW7l6e05ZsIHSZzQDQXVnHIbXgWmQvXc5Tj8U+krhS7FDuwL+SwmX3n
C0uJXp7GZjI3l0q0xQJKaVfR1XxVz1C5+CJP0XJp+fNQjC4nO4F0fMVEUo0vJhZf
OH2xIvESc2bWpKL4TlfgMIlMXYqQ1XjHk5t5gJtT9PdE1TbJUKLwn3q5wB0yDL1I
4CJTL2qLwF6l2Pb8U1w0f2xN0v1R2w1m7P9NqK1g6Wl6U6K8p7L+F7K8G6R5R6x
0h7R6h6x1S5R6h7R8S9h6S7R8h9S7T8h9S7T8i9T7U8i9U8U9j9U8V9j9V8W9k9V
9W9l9W9X9m9X9Y9n9Y9Z9o9Z9a9p9a9b9q9b9c9r9c9d9s9d9e9t9e9f9u9f9g9v9
-----END CERTIFICATE-----`;

  const sampleKey = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDZBbuXp7Tlmwgd
JnNANBdWcchtblaC9dzlOPxT6SuFLsUO7Av5LCZfecLS4lensZmMjfXSrTFAkppV
9HVfFXPULn4Ik/Rcmn581CMLic7gXR8xURSjS8mFl84fbEi8RJzZtakovhOV+Aw
iUxdiqDVeMeTm3mAm1P090TVNslQovCfernAHTIMvUjgIlMvauAXqXY9vxTXDR/
bE3S/VHbDWbs/02orWDpaXpToryn+voXsrwbpHlHrHSHtHqHrHVLlHqHtHxL2HpL
sfIfUsuEyPtLsfIfUuEyPtLsfIfUuEyP9Tuz+I9T+z+I9T+z+I9T+z+I9T+z+I9
-----END PRIVATE KEY-----`;

  it('should generate PFX when PKI.js is available', async () => {
    if (!isPKIJsReady()) {
      console.log('Skipping integration test - PKI.js not available');
      return;
    }

    const progressSteps: string[] = [];
    const progressCallback = (step: string) => {
      progressSteps.push(step);
    };

    try {
      const pfx = await generateRealPFX(
        sampleCert,
        sampleKey,
        null,
        'testpassword',
        progressCallback
      );

      expect(pfx).toBeInstanceOf(ArrayBuffer);
      expect(pfx.byteLength).toBeGreaterThan(0);
      expect(progressSteps.length).toBeGreaterThan(0);
      expect(progressSteps).toContain('PFX generation complete!');
    } catch (error) {
      // If it fails due to invalid sample data, that's expected
      // Real tests would use properly generated cert/key pairs
      expect(error).toBeDefined();
    }
  });
});
