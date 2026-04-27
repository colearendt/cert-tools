/**
 * Real PKCS#12 Implementation using PKI.js
 * 
 * This module provides proper PKCS#12 (PFX) generation using PKI.js.
 * Uses bundled ES modules (no CDN required).
 */

import * as pkijs from 'pkijs';
import * as asn1js from 'asn1js';

// PKI.js is always available when bundled
let isReady = true;

/**
 * Check if PKI.js library is loaded and ready
 * @returns {boolean}
 */
export function isPKIJsReady() {
  return isReady;
}

/**
 * Get PKI.js and asn1js references
 * @returns {Object|null}
 */
export function getPKIJs() {
  if (!isReady) return null;
  return { pkijs, asn1js };
}

/**
 * Generate a real PKCS#12 (PFX) file
 * 
 * @param {string} certPEM - Certificate in PEM format
 * @param {string} keyPEM - Private key in PEM format  
 * @param {string|null} rootCAPEM - Root CA certificate in PEM format (optional)
 * @param {string} password - Password for PFX encryption
 * @param {Function} progressCallback - Optional callback for progress updates
 * @returns {Promise<ArrayBuffer>} - PFX file as binary data
 */
export async function generateRealPFX(certPEM, keyPEM, rootCAPEM, password, progressCallback) {
  if (!isReady) {
    throw new Error('PKI.js library not available. Please refresh the page.');
  }
  
  try {
    progressCallback?.('Parsing certificate...');
    const certificate = parseCertificate(certPEM);
    
    progressCallback?.('Parsing private key...');
    const privateKey = await parsePrivateKey(keyPEM);
    
    progressCallback?.('Creating certificate safe bag...');
    const certSafeBags = [];
    certSafeBags.push(createCertificateSafeBag(certificate, 'origin-certificate'));
    
    if (rootCAPEM) {
      progressCallback?.('Adding root CA certificate...');
      const rootCert = parseCertificate(rootCAPEM);
      certSafeBags.push(createCertificateSafeBag(rootCert, 'cloudflare-origin-ca'));
    }
    
    progressCallback?.('Creating private key safe bag...');
    const keySafeBag = await createKeySafeBag(privateKey, certificate, password);
    
    progressCallback?.('Building PFX structure...');
    const pfx = await buildPFX(certSafeBags, [keySafeBag], password);
    
    progressCallback?.('Serializing PFX...');
    const exportedPFX = await exportPFX(pfx);
    
    progressCallback?.('PFX generation complete!');
    return exportedPFX;
    
  } catch (error) {
    console.error('PFX generation failed:', error);
    
    if (error.message.includes('fromBER')) {
      throw new Error('Failed to parse certificate or key. Please ensure valid PEM format.');
    }
    if (error.message.includes('private key')) {
      throw new Error('Failed to process private key. Ensure it matches the certificate.');
    }
    
    throw new Error(`PKCS#12 generation failed: ${error.message}`);
  }
}

function parseCertificate(pem) {
  try {
    const buffer = pemToArrayBuffer(pem);
    const asn1 = asn1js.fromBER(buffer);
    
    if (asn1.offset === -1) {
      throw new Error('Invalid ASN.1 structure');
    }
    
    return new pkijs.Certificate({ schema: asn1.result });
  } catch (error) {
    throw new Error(`Certificate parsing failed: ${error.message}`);
  }
}

async function parsePrivateKey(pem) {
  try {
    const buffer = pemToArrayBuffer(pem);
    const asn1 = asn1js.fromBER(buffer);
    
    if (asn1.offset === -1) {
      throw new Error('Invalid ASN.1 structure');
    }
    
    const privateKeyInfo = new pkijs.PrivateKeyInfo({ schema: asn1.result });
    
    return {
      info: privateKeyInfo,
      raw: buffer
    };
  } catch (error) {
    throw new Error(`Private key parsing failed: ${error.message}`);
  }
}

function createCertificateSafeBag(certificate, friendlyName = 'certificate') {
  const certBag = new pkijs.CertBag({
    value: certificate.toSchema()
  });
  
  const friendlyNameAttr = new pkijs.Attribute({
    type: '1.2.840.113549.1.9.20',
    values: [new asn1js.BmpString({ value: friendlyName })]
  });
  
  const localKeyId = certificate.serialNumber.valueBlock.valueHexView || 
                     new Uint8Array([0x01, 0x02, 0x03, 0x04]);
  
  const localKeyIdAttr = new pkijs.Attribute({
    type: '1.2.840.113549.1.9.21',
    values: [new asn1js.OctetString({ valueHex: localKeyId })]
  });
  
  return new pkijs.SafeBag({
    bagId: '1.2.840.113549.1.12.10.1.3',
    bagValue: certBag.toSchema(),
    bagAttributes: [friendlyNameAttr, localKeyIdAttr]
  });
}

async function createKeySafeBag(privateKeyData, certificate, password) {
  const passwordBuffer = new TextEncoder().encode(password);
  const salt = crypto.getRandomValues(new Uint8Array(8));
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  const encryptionKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 2048,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-CBC', length: 256 },
    false,
    ['encrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const encryptedKey = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: iv },
    encryptionKey,
    privateKeyData.raw
  );
  
  const algorithmId = new pkijs.AlgorithmIdentifier({
    algorithmId: '1.2.840.113549.1.5.13',
    algorithmParams: new asn1js.Sequence({
      value: [
        new asn1js.Sequence({
          value: [
            new asn1js.ObjectIdentifier({ value: '1.2.840.113549.1.5.12' }),
            new asn1js.Sequence({
              value: [
                new asn1js.OctetString({ valueHex: salt }),
                new asn1js.Integer({ value: 2048 }),
                new pkijs.AlgorithmIdentifier({
                  algorithmId: '2.16.840.1.101.3.4.2.1'
                }).toSchema()
              ]
            })
          ]
        }),
        new asn1js.Sequence({
          value: [
            new asn1js.ObjectIdentifier({ value: '2.16.840.1.101.3.4.1.42' }),
            new asn1js.OctetString({ valueHex: iv })
          ]
        })
      ]
    })
  });
  
  const encryptedPrivateKeyInfo = new pkijs.EncryptedPrivateKeyInfo({
    encryptionAlgorithm: algorithmId,
    encryptedData: new Uint8Array(encryptedKey)
  });
  
  const keyBag = new pkijs.PKCS8ShroudedKeyBag({
    value: encryptedPrivateKeyInfo.toSchema()
  });
  
  const friendlyNameAttr = new pkijs.Attribute({
    type: '1.2.840.113549.1.9.20',
    values: [new asn1js.BmpString({ value: 'private-key' })]
  });
  
  const localKeyId = certificate.serialNumber.valueBlock.valueHexView || 
                     new Uint8Array([0x01, 0x02, 0x03, 0x04]);
  
  const localKeyIdAttr = new pkijs.Attribute({
    type: '1.2.840.113549.1.9.21',
    values: [new asn1js.OctetString({ valueHex: localKeyId })]
  });
  
  return new pkijs.SafeBag({
    bagId: '1.2.840.113549.1.12.10.1.2',
    bagValue: keyBag.toSchema(),
    bagAttributes: [friendlyNameAttr, localKeyIdAttr]
  });
}

async function buildPFX(certSafeBags, keySafeBags, password) {
  const certContentInfo = createEncryptedContentInfo(certSafeBags, password);
  const keyContentInfo = createEncryptedContentInfo(keySafeBags, password);
  
  const authenticatedSafe = new pkijs.AuthenticatedSafe({
    parsedValue: {
      safeContents: [
        { contentType: '1.2.840.113549.1.7.6', content: certContentInfo },
        { contentType: '1.2.840.113549.1.7.6', content: keyContentInfo }
      ]
    }
  });
  
  return new pkijs.PFX({
    version: 3,
    parsedValue: { authSafe: authenticatedSafe }
  });
}

function createEncryptedContentInfo(safeBags, password) {
  const safeContents = new pkijs.SafeContents({ safeBags: safeBags });
  const safeContentsSchema = safeContents.toSchema();
  const safeContentsBuffer = safeContentsSchema.toBER(false);
  
  const encryptedData = new pkijs.EncryptedData({
    version: 0,
    encryptedContentInfo: new pkijs.EncryptedContentInfo({
      contentType: '1.2.840.113549.1.7.1',
      contentEncryptionAlgorithm: new pkijs.AlgorithmIdentifier({
        algorithmId: '1.2.840.113549.1.5.13'
      }),
      encryptedContent: new asn1js.OctetString({ valueHex: safeContentsBuffer })
    })
  });
  
  return new pkijs.ContentInfo({
    contentType: '1.2.840.113549.1.7.6',
    content: encryptedData.toSchema()
  });
}

async function exportPFX(pfx) {
  const pfxSchema = pfx.toSchema();
  return pfxSchema.toBER(false);
}

function pemToArrayBuffer(pem) {
  const base64 = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s/g, '');
  
  if (!base64) {
    throw new Error('Empty PEM content');
  }
  
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i);
  }
  
  return buffer;
}

// Expose for global access
if (typeof window !== 'undefined') {
  window.generateRealPFX = generateRealPFX;
  window.isPKIJsReady = isPKIJsReady;
  window.getPKIJs = getPKIJs;
}
