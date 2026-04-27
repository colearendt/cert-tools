/**
 * PFX Generator - Client-side PKCS#12 generation using PKI.js
 * 
 * Uses bundled PKI.js modules - no external loading required.
 */

import { CLOUDFLARE_ORIGIN_RSA_CA, CLOUDFLARE_ORIGIN_ECC_CA, detectCertificateType, getRootCA } from './certificates.js';
import { generateRealPFX } from './pfx-real.js';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('pfxForm');
  const resultSection = document.getElementById('result');
  const errorSection = document.getElementById('error');
  const downloadBtn = document.getElementById('downloadBtn');
  const loadingOverlay = document.getElementById('loadingOverlay');
  const loadingStatus = document.getElementById('loadingStatus');
  const generateBtn = document.getElementById('generateBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
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
      const pfxData = await generateRealPFX(
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
      }
      
      showError(`PFX generation failed: ${errorMessage}`);
    } finally {
      // Reset UI
      generateBtn.disabled = false;
      loadingOverlay.classList.add('hidden');
      loadingStatus.textContent = 'Initializing...';
    }
  });
});

function validatePEM(pem, expectedType) {
  if (!pem || typeof pem !== 'string') return false;
  const pemRegex = new RegExp(`-----BEGIN\\s*${expectedType}-----`, 'i');
  return pemRegex.test(pem) && pem.includes('-----END');
}

function extractHostnameFromCert(certPEM) {
  const cnMatch = certPEM.match(/CN=([^,\n]+)/i);
  if (cnMatch) {
    return cnMatch[1].trim().replace(/^\*\./, '');
  }
  
  const subjectMatch = certPEM.match(/Subject:.*CN=([^,\n]+)/i);
  if (subjectMatch) {
    return subjectMatch[1].trim().replace(/^\*\./, '');
  }
  
  return null;
}

function showError(message) {
  const errorSection = document.getElementById('error');
  const errorMessage = document.getElementById('errorMessage');
  const errorDetails = document.getElementById('errorDetails');
  
  errorMessage.textContent = message;
  
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

console.log('PFX Generator loaded successfully');
