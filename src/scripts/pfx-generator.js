/**
 * PFX Generator - Client-side PKCS#12 generation using PKI.js
 * 
 * This module handles the conversion of PEM certificates and private keys
 * into PKCS#12 (PFX) format entirely within the browser using PKI.js.
 * 
 * Security: All cryptographic operations happen client-side. No data is sent
 * to any server. Private keys never leave the browser.
 */

import { CLOUDFLARE_ORIGIN_RSA_CA, CLOUDFLARE_ORIGIN_ECC_CA, detectCertificateType, getRootCA } from './certificates.js';

// Make sure to check for PKI.js availability
let pkiJsLoadState = 'loading'; // 'loading', 'ready', 'error'

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('pfxForm');
  const resultSection = document.getElementById('result');
  const errorSection = document.getElementById('error');
  const downloadBtn = document.getElementById('downloadBtn');
  const loadingOverlay = document.getElementById('loadingOverlay');
  const loadingStatus = document.getElementById('loadingStatus');
  const pkiJsStatus = document.getElementById('pkiJsStatus');

  // Check PKI.js availability
  checkPKIJsStatus();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Check PKI.js is ready
    if (pkiJsLoadState === 'loading') {
      showError('PKI.js is still loading. Please wait a moment and try again.');
      return;
    }
    
    if (pkiJsLoadState === 'error') {
      showError(
        'PKI.js library failed to load. Please refresh the page or check your internet connection.'
      );
      return;
    }
    
    // Reset UI
    resultSection.classList.add('hidden');
    errorSection.classList.add('hidden');
    
    // Get form values
    const certificate = document.getElementById('certificate').value.trim();
    const privateKey = document.getElementById('privateKey').value.trim();
    const includeRootCA = document.getElementById('includeRootCA').checked;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validate passwords match
    if (password !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }
    
    // Validate password strength
    if (password.length < 4) {
      showError('Password must be at least 4 characters long');
      return;
    }
    
    // Validate inputs
    if (!validatePEM(certificate, 'CERTIFICATE')) {
      showError(
        'Invalid certificate format. Please provide a valid PEM-encoded certificate starting with "-----BEGIN CERTIFICATE-----"'
      );
      return;
    }
    
    if (!validatePEM(privateKey, 'PRIVATE KEY') && !validatePEM(privateKey, 'RSA PRIVATE KEY')) {
      showError(
        'Invalid private key format. Please provide a valid PEM-encoded private key starting with "-----BEGIN PRIVATE KEY-----" or "-----BEGIN RSA PRIVATE KEY-----"'
      );
      return;
    }
    
    // Show loading state
    const generateBtn = document.getElementById('generateBtn');
    generateBtn.disabled = true;
    loadingOverlay.classList.remove('hidden');
    
    try {
      // Determine which root CA to use
      let rootCACert = null;
      if (includeRootCA) {
        const certType = detectCertificateType(certificate + privateKey);
        rootCACert = getRootCA(certType);
        console.log(`Using ${certType.toUpperCase()} root CA certificate`);
      }
      
      // Generate PFX with progress updates
      console.log('Starting PFX generation...');
      const pfxData = await generatePFX(
        certificate,
        privateKey,
        rootCACert,
        password,
        (status) => {
          loadingStatus.textContent = status;
        }
      );
      console.log('PFX generated successfully');
      
      // Create download link
      const blob = new Blob([pfxData], { type: 'application/x-pkcs12' });
      const url = URL.createObjectURL(blob);
      downloadBtn.href = url;
      
      // Set filename
      const hostname = extractHostnameFromCert(certificate);
      const filename = hostname ? `${hostname}.pfx` : 'origin-certificate.pfx';
      downloadBtn.download = filename;
      
      // Show success
      resultSection.classList.remove('hidden');
      resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      
      // Clear sensitive data from form
      document.getElementById('privateKey').value = '';
      document.getElementById('password').value = '';
      document.getElementById('confirmPassword').value = '';
      
    } catch (error) {
      console.error('PFX generation error:', error);
      
      // Provide helpful error messages
      let errorMessage = error.message;
      if (error.message.includes('certificate and key do not match')) {
        errorMessage = 'The certificate and private key do not match. Please ensure you are using the certificate and key that were generated together.';
      } else if (error.message.includes('parse')) {
        errorMessage = 'Failed to parse the certificate or key. Please check that you copied them completely, including the "BEGIN" and "END" lines.';
      } else if (error.message.includes('PKI.js')) {
        errorMessage = 'The PKI.js library is not loaded. Please refresh the page and try again.';
      }
      
      showError(`PFX generation failed: ${errorMessage}`);
    } finally {
      // Reset UI
      generateBtn.disabled = false;
      loadingOverlay.classList.add('hidden');
      loadingStatus.textContent = 'Initializing...';
    }
  });

  // Check PKI.js status periodically
  function checkPKIJsStatus() {
    if (typeof window.pkijs !== 'undefined' && typeof window.asn1js !== 'undefined') {
      pkiJsLoadState = 'ready';
      if (pkiJsStatus) {
        pkiJsStatus.innerHTML = '<span class="status-ready">●</span> PKI.js ready';
      }
      return;
    }
    
    // Retry a few times
    let attempts = 0;
    const maxAttempts = 20;
    
    const checkInterval = setInterval(() => {
      attempts++;
      
      if (typeof window.pkijs !== 'undefined' && typeof window.asn1js !== 'undefined') {
        pkiJsLoadState = 'ready';
        if (pkiJsStatus) {
          pkiJsStatus.innerHTML = '<span class="status-ready">●</span> PKI.js ready';
        }
        clearInterval(checkInterval);
      } else if (attempts >= maxAttempts) {
        pkiJsLoadState = 'error';
        if (pkiJsStatus) {
          pkiJsStatus.innerHTML = '<span class="status-error">●</span> PKI.js failed to load';
        }
        clearInterval(checkInterval);
      }
    }, 500);
  }
});

/**
 * Validate PEM format
 */
function validatePEM(pem, expectedType) {
  if (!pem || typeof pem !== 'string') return false;
  const pemRegex = new RegExp(`-----BEGIN\\s*${expectedType}-----`, 'i');
  return pemRegex.test(pem) && pem.includes('-----END');
}

/**
 * Extract hostname from certificate (simplified)
 */
function extractHostnameFromCert(certPEM) {
  // Try to extract CN or DNS names from the certificate
  const cnMatch = certPEM.match(/CN=([^,\n]+)/i);
  if (cnMatch) {
    return cnMatch[1].trim().replace(/^\*\./, '');
  }
  
  // Try to extract from subject
  const subjectMatch = certPEM.match(/Subject:.*CN=([^,\n]+)/i);
  if (subjectMatch) {
    return subjectMatch[1].trim().replace(/^\*\./, '');
  }
  
  return null;
}

/**
 * Show error message
 */
function showError(message) {
  const errorSection = document.getElementById('error');
  const errorMessage = document.getElementById('errorMessage');
  const errorDetails = document.getElementById('errorDetails');
  
  errorMessage.textContent = message;
  
  // Add troubleshooting tips
  const tips = [
    'Make sure you copied the entire certificate and key, including the BEGIN/END lines',
    'The certificate and key must be in PEM format (Base64-encoded with headers)',
    'Ensure the certificate and key match (were generated together)',
    'If the problem persists, try refreshing the page'
  ];
  
  if (errorDetails) {
    errorDetails.innerHTML = '<strong>Troubleshooting tips:</strong><ul>' +
      tips.map(tip => `<li>${tip}</li>`).join('') +
      '</ul>';
  }
  
  errorSection.classList.remove('hidden');
  errorSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Convert PEM to ArrayBuffer
 */
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

/**
 * Generate PKCS#12 (PFX) file from certificate and private key
 * 
 * Uses PKI.js for proper PKCS#12 generation when available,
 * otherwise falls back to a demonstration implementation.
 */
async function generatePFX(certPEM, keyPEM, rootCAPEM, password, progressCallback) {
  // Try to use real PKI.js implementation if available
  if (window.generateRealPFX) {
    console.log('Using PKI.js implementation');
    try {
      return await window.generateRealPFX(certPEM, keyPEM, rootCAPEM, password, progressCallback);
    } catch (error) {
      console.error('PKI.js implementation failed:', error);
      throw error; // Don't fallback on error, show the real error
    }
  }
  
  // No fallback - we need PKI.js for real PKCS#12
  throw new Error(
    'PKI.js library is required for PKCS#12 generation but is not available. ' +
    'Please refresh the page to try loading it again.'
  );
}

console.log('PFX Generator loaded successfully');

// Make functions available globally
if (typeof window !== 'undefined') {
  window.validatePEM = validatePEM;
  window.pemToArrayBuffer = pemToArrayBuffer;
}
