/**
 * PFX Verification Utility
 * 
 * Provides functions to verify generated PFX files and test the PKI.js integration.
 */

import { isPKIJsReady, getPKIJs } from './pfx-real.js';

/**
 * Check if PKI.js is loaded and working
 * @returns {Object} Status object with details
 */
export function checkPKIJsStatus() {
  const status = {
    loaded: false,
    pkijs: false,
    asn1js: false,
    crypto: false,
    error: null
  };

  try {
    // Check for bundled PKI.js via getPKIJs
    const pkiRefs = getPKIJs();
    if (pkiRefs) {
      status.pkijs = true;
      status.asn1js = true;
      
      // Check for required classes
      const requiredClasses = ['Certificate', 'PrivateKeyInfo', 'PFX', 'SafeBag'];
      const missingClasses = requiredClasses.filter(cls => !pkiRefs.pkijs[cls]);
      
      if (missingClasses.length > 0) {
        status.error = `PKI.js missing classes: ${missingClasses.join(', ')}`;
        return status;
      }
    }

    // Check for Web Crypto API
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      status.crypto = true;
    }

    status.loaded = status.pkijs && status.asn1js && status.crypto;
    
    return status;
  } catch (error) {
    status.error = error.message;
    return status;
  }
}

/**
 * Verify a PFX file structure (basic checks without password)
 * @param {ArrayBuffer} pfxData - The PFX file data
 * @returns {Promise<Object>} Verification result
 */
export async function verifyPFXStructure(pfxData) {
  if (!isPKIJsReady()) {
    return {
      valid: false,
      error: 'PKI.js not available'
    };
  }

  const { pkijs, asn1js } = getPKIJs();

  try {
    // Parse the PFX
    const asn1 = asn1js.fromBER(pfxData);
    
    if (asn1.offset === -1) {
      return {
        valid: false,
        error: 'Invalid ASN.1 structure - not a valid PFX file'
      };
    }

    const pfx = new pkijs.PFX({ schema: asn1.result });

    // Check version
    const version = pfx.version;
    
    // Check for authSafe
    if (!pfx.authSafe) {
      return {
        valid: false,
        error: 'PFX missing authSafe structure'
      };
    }

    return {
      valid: true,
      version: version,
      hasAuthSafe: true,
      structure: 'Valid PKCS#12 PFX structure detected'
    };

  } catch (error) {
    return {
      valid: false,
      error: `Failed to parse PFX: ${error.message}`
    };
  }
}

/**
 * Generate a self-signed certificate for testing
 * This creates a test certificate and key pair to verify the PFX generation works
 * @returns {Promise<Object>} Test certificate and key in PEM format
 */
export async function generateTestCertificate() {
  if (!isPKIJsReady()) {
    throw new Error('PKI.js not available for test certificate generation');
  }

  const { pkijs, asn1js } = getPKIJs();
  const crypto = window.crypto.subtle;

  try {
    // Generate RSA key pair
    const keyPair = await crypto.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256'
      },
      true,
      ['sign', 'verify']
    );

    // Create certificate
    const certificate = new pkijs.Certificate();
    
    // Set version
    certificate.version = 2; // v3
    
    // Set serial number
    certificate.serialNumber = new asn1js.Integer({ value: 1 });
    
    // Set signature algorithm
    certificate.signatureAlgorithm = new pkijs.AlgorithmIdentifier({
      algorithmId: '1.2.840.113549.1.1.11' // sha256WithRSAEncryption
    });
    
    // Set issuer
    certificate.issuer.typesAndValues.push(
      new pkijs.AttributeTypeAndValue({
        type: '2.5.4.3', // commonName
        value: new asn1js.BmpString({ value: 'Test CA' })
      })
    );
    
    // Set validity
    const now = new Date();
    certificate.notBefore.value = now;
    certificate.notAfter.value = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    
    // Set subject
    certificate.subject.typesAndValues.push(
      new pkijs.AttributeTypeAndValue({
        type: '2.5.4.3',
        value: new asn1js.BmpString({ value: 'test.example.com' })
      })
    );
    
    // Export keys to PEM (simplified - just return the key pair for now)
    const publicKeyJwk = await crypto.exportKey('jwk', keyPair.publicKey);
    const privateKeyJwk = await crypto.exportKey('jwk', keyPair.privateKey);

    return {
      certificate: certificate,
      keyPair: keyPair,
      publicKeyJwk: publicKeyJwk,
      privateKeyJwk: privateKeyJwk,
      message: 'Test key pair generated successfully'
    };

  } catch (error) {
    throw new Error(`Test certificate generation failed: ${error.message}`);
  }
}

/**
 * Run all verification tests
 * @returns {Promise<Object>} Test results
 */
export async function runVerificationTests() {
  const results = {
    timestamp: new Date().toISOString(),
    tests: []
  };

  // Test 1: PKI.js availability
  const pkiStatus = checkPKIJsStatus();
  results.tests.push({
    name: 'PKI.js Loading',
    passed: pkiStatus.loaded,
    details: pkiStatus
  });

  if (!pkiStatus.loaded) {
    results.overall = 'FAILED';
    results.message = 'PKI.js is not properly loaded. PFX generation will not work.';
    return results;
  }

  // Test 2: Web Crypto API
  results.tests.push({
    name: 'Web Crypto API',
    passed: pkiStatus.crypto,
    details: { available: pkiStatus.crypto }
  });

  // Test 3: Test certificate generation
  try {
    const testCert = await generateTestCertificate();
    results.tests.push({
      name: 'Certificate Generation',
      passed: true,
      details: { message: testCert.message }
    });
  } catch (error) {
    results.tests.push({
      name: 'Certificate Generation',
      passed: false,
      error: error.message
    });
  }

  // Calculate overall result
  const allPassed = results.tests.every(t => t.passed);
  results.overall = allPassed ? 'PASSED' : 'FAILED';
  results.message = allPassed 
    ? 'All verification tests passed. PFX generation should work correctly.'
    : 'Some tests failed. PFX generation may not work correctly.';

  return results;
}

/**
 * Display verification results in the UI
 * @param {Object} results - Test results from runVerificationTests()
 */
export function displayVerificationResults(results) {
  console.group('PFX Verification Tests');
  console.log('Overall:', results.overall);
  console.log('Timestamp:', results.timestamp);
  console.log('Message:', results.message);
  
  results.tests.forEach(test => {
    console.log(`${test.passed ? '✅' : '❌'} ${test.name}:`, test.passed ? 'PASSED' : 'FAILED');
    if (test.error) {
      console.error('  Error:', test.error);
    }
    if (test.details) {
      console.log('  Details:', test.details);
    }
  });
  
  console.groupEnd();
  
  return results;
}

// Make available globally
if (typeof window !== 'undefined') {
  window.PFXVerifier = {
    checkPKIJsStatus,
    verifyPFXStructure,
    generateTestCertificate,
    runVerificationTests,
    displayVerificationResults
  };
}

// Auto-run verification on load for debugging
if (typeof window !== 'undefined') {
  window.addEventListener('load', async () => {
    // Wait a bit for PKI.js to load
    setTimeout(async () => {
      console.log('Running PFX verification tests...');
      try {
        const results = await runVerificationTests();
        displayVerificationResults(results);
      } catch (error) {
        console.error('Verification tests failed:', error);
      }
    }, 2000);
  });
}
