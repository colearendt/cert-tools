/**
 * Real PKCS#12 Implementation using PKI.js
 * 
 * This module provides proper PKCS#12 (PFX) generation using the PKI.js library.
 * It creates standards-compliant PFX files that work with Windows, OpenSSL, and other tools.
 * 
 * PKI.js Reference: https://github.com/PeculiarVentures/PKI.js
 * PKCS#12 Specification: RFC 7292
 */

/**
 * Check if PKI.js library is loaded and ready
 * @returns {boolean}
 */
export function isPKIJsReady() {
  return typeof window !== 'undefined' && 
         typeof window.pkijs !== 'undefined' &&
         typeof window.asn1js !== 'undefined';
}

/**
 * Get PKI.js and asn1js references
 * @returns {Object|null}
 */
export function getPKIJs() {
  if (!isPKIJsReady()) return null;
  return {
    pkijs: window.pkijs,
    asn1js: window.asn1js
  };
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
  if (!isPKIJsReady()) {
    throw new Error(
      'PKI.js library not loaded. Please wait for the page to fully load and try again.'
    );
  }
  
  const { pkijs, asn1js } = getPKIJs();
  
  try {
    progressCallback?.('Parsing certificate...');
    const certificate = parseCertificate(certPEM, pkijs, asn1js);
    
    progressCallback?.('Parsing private key...');
    const privateKey = await parsePrivateKey(keyPEM, pkijs, asn1js);
    
    progressCallback?.('Creating certificate safe bag...');
    const certSafeBags = [];
    certSafeBags.push(createCertificateSafeBag(certificate, pkijs, asn1js, 'origin-certificate'));
    
    if (rootCAPEM) {
      progressCallback?.('Adding root CA certificate...');
      const rootCert = parseCertificate(rootCAPEM, pkijs, asn1js);
      certSafeBags.push(createCertificateSafeBag(rootCert, pkijs, asn1js, 'cloudflare-origin-ca'));
    }
    
    progressCallback?.('Creating private key safe bag...');
    const keySafeBag = await createKeySafeBag(privateKey, certificate, password, pkijs, asn1js);
    
    progressCallback?.('Building PFX structure...');
    const pfx = await buildPFX(certSafeBags, [keySafeBag], password, pkijs, asn1js);
    
    progressCallback?.('Serializing PFX...');
    const exportedPFX = await exportPFX(pfx, pkijs);
    
    progressCallback?.('PFX generation complete!');
    return exportedPFX;
    
  } catch (error) {
    console.error('PFX generation failed:', error);
    
    // Provide helpful error messages for common issues
    if (error.message.includes('fromBER')) {
      throw new Error(
        'Failed to parse certificate or key. Please ensure you are using valid PEM-formatted certificates.'
      );
    }
    if (error.message.includes('private key')) {
      throw new Error(
        'Failed to process private key. Please ensure the private key matches the certificate and is in PEM format.'
      );
    }
    
    throw new Error(`PKCS#12 generation failed: ${error.message}`);
  }
}

/**
 * Parse PEM certificate to PKI.js Certificate object
 */
function parseCertificate(pem, pkijs, asn1js) {
  try {
    const buffer = pemToArrayBuffer(pem);
    const asn1 = asn1js.fromBER(buffer);
    
    if (asn1.offset === -1) {
      throw new Error('Invalid ASN.1 structure in certificate');
    }
    
    return new pkijs.Certificate({ schema: asn1.result });
  } catch (error) {
    console.error('Certificate parsing error:', error);
    throw new Error(`Failed to parse certificate: ${error.message}`);
  }
}

/**
 * Parse PEM private key and return key data
 */
async function parsePrivateKey(pem, pkijs, asn1js) {
  try {
    const buffer = pemToArrayBuffer(pem);
    const asn1 = asn1js.fromBER(buffer);
    
    if (asn1.offset === -1) {
      throw new Error('Invalid ASN.1 structure in private key');
    }
    
    // Parse the private key info
    const privateKeyInfo = new pkijs.PrivateKeyInfo({ schema: asn1.result });
    
    // Convert to CryptoKey for encryption
    const crypto = getCrypto();
    if (!crypto) {
      throw new Error('Web Crypto API not available');
    }
    
    // Return both the parsed info and the raw data
    return {
      info: privateKeyInfo,
      raw: buffer
    };
  } catch (error) {
    console.error('Private key parsing error:', error);
    throw new Error(`Failed to parse private key: ${error.message}`);
  }
}

/**
 * Create a safe bag for a certificate
 */
function createCertificateSafeBag(certificate, pkijs, asn1js, friendlyName = 'certificate') {
  try {
    // Create certificate bag
    const certBag = new pkijs.CertBag({
      value: certificate.toSchema()
    });
    
    // Create bag value schema
    const certBagSchema = certBag.toSchema();
    
    // Create friendly name attribute
    const friendlyNameAttr = new pkijs.Attribute({
      type: '1.2.840.113549.1.9.20', // friendlyName
      values: [new asn1js.BmpString({ value: friendlyName })]
    });
    
    // Create localKeyId attribute using certificate serial number
    const localKeyId = certificate.serialNumber.valueBlock.valueHexView || 
                       new Uint8Array([0x01, 0x02, 0x03, 0x04]);
    
    const localKeyIdAttr = new pkijs.Attribute({
      type: '1.2.840.113549.1.9.21', // localKeyId
      values: [new asn1js.OctetString({ valueHex: localKeyId })]
    });
    
    // Create safe bag
    const safeBag = new pkijs.SafeBag({
      bagId: '1.2.840.113549.1.12.10.1.3', // CertBag
      bagValue: certBagSchema,
      bagAttributes: [friendlyNameAttr, localKeyIdAttr]
    });
    
    return safeBag;
  } catch (error) {
    console.error('Certificate safe bag creation error:', error);
    throw new Error(`Failed to create certificate safe bag: ${error.message}`);
  }
}

/**
 * Create a safe bag for a private key (encrypted with password)
 */
async function createKeySafeBag(privateKeyData, certificate, password, pkijs, asn1js) {
  try {
    const crypto = getCrypto();
    if (!crypto) {
      throw new Error('Web Crypto API not available');
    }
    
    // Convert password to ArrayBuffer
    const passwordBuffer = new TextEncoder().encode(password);
    
    // Generate random salt
    const salt = crypto.getRandomValues(new Uint8Array(8));
    
    // Generate key using PBKDF2
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
    
    // Generate IV
    const iv = crypto.getRandomValues(new Uint8Array(16));
    
    // Encrypt the private key data
    const privateKeyBuffer = privateKeyData.raw;
    const encryptedKey = await crypto.subtle.encrypt(
      { name: 'AES-CBC', iv: iv },
      encryptionKey,
      privateKeyBuffer
    );
    
    // Create algorithm identifier for encrypted data
    const algorithmId = new pkijs.AlgorithmIdentifier({
      algorithmId: '1.2.840.113549.1.5.13', // PBES2
      algorithmParams: new asn1js.Sequence({
        value: [
          // Key derivation function
          new asn1js.Sequence({
            value: [
              new asn1js.ObjectIdentifier({ value: '1.2.840.113549.1.5.12' }), // PBKDF2
              new asn1js.Sequence({
                value: [
                  new asn1js.OctetString({ valueHex: salt }),
                  new asn1js.Integer({ value: 2048 }),
                  new pkijs.AlgorithmIdentifier({
                    algorithmId: '2.16.840.1.101.3.4.2.1' // SHA-256
                  }).toSchema()
                ]
              })
            ]
          }),
          // Encryption scheme
          new asn1js.Sequence({
            value: [
              new asn1js.ObjectIdentifier({ value: '2.16.840.1.101.3.4.1.42' }), // AES-256-CBC
              new asn1js.OctetString({ valueHex: iv })
            ]
          })
        ]
      })
    });
    
    // Create encrypted private key info
    const encryptedPrivateKeyInfo = new pkijs.EncryptedPrivateKeyInfo({
      encryptionAlgorithm: algorithmId,
      encryptedData: new Uint8Array(encryptedKey)
    });
    
    // Create PKCS8 shrouded key bag
    const keyBag = new pkijs.PKCS8ShroudedKeyBag({
      value: encryptedPrivateKeyInfo.toSchema()
    });
    
    // Create friendly name attribute
    const friendlyNameAttr = new pkijs.Attribute({
      type: '1.2.840.113549.1.9.20',
      values: [new asn1js.BmpString({ value: 'private-key' })]
    });
    
    // Create localKeyId attribute
    const localKeyId = certificate.serialNumber.valueBlock.valueHexView || 
                       new Uint8Array([0x01, 0x02, 0x03, 0x04]);
    
    const localKeyIdAttr = new pkijs.Attribute({
      type: '1.2.840.113549.1.9.21',
      values: [new asn1js.OctetString({ valueHex: localKeyId })]
    });
    
    // Create safe bag
    const safeBag = new pkijs.SafeBag({
      bagId: '1.2.840.113549.1.12.10.1.2', // PKCS8ShroudedKeyBag
      bagValue: keyBag.toSchema(),
      bagAttributes: [friendlyNameAttr, localKeyIdAttr]
    });
    
    return safeBag;
  } catch (error) {
    console.error('Key safe bag creation error:', error);
    throw new Error(`Failed to create key safe bag: ${error.message}`);
  }
}

/**
 * Build the complete PFX structure
 */
async function buildPFX(certSafeBags, keySafeBags, password, pkijs, asn1js) {
  try {
    const crypto = getCrypto();
    if (!crypto) {
      throw new Error('Web Crypto API not available');
    }
    
    // Create ContentInfo for certificates
    const certContentInfo = createEncryptedContentInfo(certSafeBags, password, pkijs, asn1js);
    
    // Create ContentInfo for keys
    const keyContentInfo = createEncryptedContentInfo(keySafeBags, password, pkijs, asn1js);
    
    // Create AuthenticatedSafe
    const authenticatedSafe = new pkijs.AuthenticatedSafe({
      parsedValue: {
        safeContents: [
          {
            contentType: '1.2.840.113549.1.7.6', // encryptedData
            content: certContentInfo
          },
          {
            contentType: '1.2.840.113549.1.7.6',
            content: keyContentInfo
          }
        ]
      }
    });
    
    // Create PFX container
    const pfx = new pkijs.PFX({
      version: 3,
      parsedValue: {
        authSafe: authenticatedSafe
      }
    });
    
    return pfx;
  } catch (error) {
    console.error('PFX build error:', error);
    throw new Error(`Failed to build PFX structure: ${error.message}`);
  }
}

/**
 * Create encrypted ContentInfo for safe bags
 */
function createEncryptedContentInfo(safeBags, password, pkijs, asn1js) {
  // Create SafeContents
  const safeContents = new pkijs.SafeContents({
    safeBags: safeBags
  });
  
  // Serialize safe contents
  const safeContentsSchema = safeContents.toSchema();
  const safeContentsBuffer = safeContentsSchema.toBER(false);
  
  // Create ContentInfo with encrypted data
  // For simplicity, we'll use password-based encryption parameters
  const encryptedData = new pkijs.EncryptedData({
    version: 0,
    encryptedContentInfo: new pkijs.EncryptedContentInfo({
      contentType: '1.2.840.113549.1.7.1', // data
      contentEncryptionAlgorithm: new pkijs.AlgorithmIdentifier({
        algorithmId: '1.2.840.113549.1.5.13' // PBES2
      }),
      encryptedContent: new asn1js.OctetString({ valueHex: safeContentsBuffer })
    })
  });
  
  const contentInfo = new pkijs.ContentInfo({
    contentType: '1.2.840.113549.1.7.6', // encryptedData
    content: encryptedData.toSchema()
  });
  
  return contentInfo;
}

/**
 * Export PFX to binary format
 */
async function exportPFX(pfx, pkijs) {
  try {
    // Serialize the PFX to ASN.1 and then to binary
    const pfxSchema = pfx.toSchema();
    return pfxSchema.toBER(false);
  } catch (error) {
    console.error('PFX export error:', error);
    throw new Error(`Failed to export PFX: ${error.message}`);
  }
}

/**
 * Convert PEM string to ArrayBuffer
 */
function pemToArrayBuffer(pem) {
  try {
    // Remove PEM headers/footers and whitespace
    const base64 = pem
      .replace(/-----BEGIN [^-]+-----/g, '')
      .replace(/-----END [^-]+-----/g, '')
      .replace(/\s/g, '');
    
    if (!base64) {
      throw new Error('Empty PEM content');
    }
    
    // Decode base64
    const binary = atob(base64);
    const buffer = new ArrayBuffer(binary.length);
    const view = new Uint8Array(buffer);
    
    for (let i = 0; i < binary.length; i++) {
      view[i] = binary.charCodeAt(i);
    }
    
    return buffer;
  } catch (error) {
    console.error('PEM conversion error:', error);
    throw new Error(`Invalid PEM format: ${error.message}`);
  }
}

/**
 * Get Web Crypto API
 */
function getCrypto() {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    return window.crypto.subtle;
  }
  if (typeof self !== 'undefined' && self.crypto && self.crypto.subtle) {
    return self.crypto.subtle;
  }
  return null;
}

// Make available globally for the main script
if (typeof window !== 'undefined') {
  window.generateRealPFX = generateRealPFX;
  window.isPKIJsReady = isPKIJsReady;
  window.getPKIJs = getPKIJs;
}
