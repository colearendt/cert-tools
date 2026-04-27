import { describe, it, expect } from 'vitest';
import { 
  detectCertificateType, 
  getRootCA,
  CLOUDFLARE_ORIGIN_RSA_CA,
  CLOUDFLARE_ORIGIN_ECC_CA 
} from '../src/scripts/certificates';

describe('Certificate Utilities', () => {
  describe('detectCertificateType', () => {
    it('should detect RSA certificates', () => {
      const rsaCert = '-----BEGIN CERTIFICATE-----\nRSA CERT\n-----END CERTIFICATE-----';
      expect(detectCertificateType(rsaCert)).toBe('rsa');
    });

    it('should detect ECC certificates', () => {
      const eccCert = '-----BEGIN CERTIFICATE-----\nEC CERT\n-----END CERTIFICATE-----';
      expect(detectCertificateType(eccCert)).toBe('ecc');
    });

    it('should default to RSA for unknown types', () => {
      const unknownCert = '-----BEGIN CERTIFICATE-----\nUNKNOWN\n-----END CERTIFICATE-----';
      expect(detectCertificateType(unknownCert)).toBe('rsa');
    });
  });

  describe('getRootCA', () => {
    it('should return RSA CA for type "rsa"', () => {
      const ca = getRootCA('rsa');
      expect(ca).toBe(CLOUDFLARE_ORIGIN_RSA_CA);
      expect(ca).toContain('BEGIN CERTIFICATE');
    });

    it('should return ECC CA for type "ecc"', () => {
      const ca = getRootCA('ecc');
      expect(ca).toBe(CLOUDFLARE_ORIGIN_ECC_CA);
      expect(ca).toContain('BEGIN CERTIFICATE');
    });

    it('should default to RSA CA for unknown type', () => {
      const ca = getRootCA('unknown' as any);
      expect(ca).toBe(CLOUDFLARE_ORIGIN_RSA_CA);
    });
  });

  describe('Root CA Certificates', () => {
    it('RSA CA should be valid PEM format', () => {
      expect(CLOUDFLARE_ORIGIN_RSA_CA).toContain('-----BEGIN CERTIFICATE-----');
      expect(CLOUDFLARE_ORIGIN_RSA_CA).toContain('-----END CERTIFICATE-----');
      expect(CLOUDFLARE_ORIGIN_RSA_CA).toContain('Cloudflare');
    });

    it('ECC CA should be valid PEM format', () => {
      expect(CLOUDFLARE_ORIGIN_ECC_CA).toContain('-----BEGIN CERTIFICATE-----');
      expect(CLOUDFLARE_ORIGIN_ECC_CA).toContain('-----END CERTIFICATE-----');
      expect(CLOUDFLARE_ORIGIN_ECC_CA).toContain('Cloudflare');
    });
  });
});
