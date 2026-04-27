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
  const pkiJsStatus = document.getElementById('pkiJsStatus');

  // PKI.js is bundled, so it's always ready immediately
  // Update the UI to show ready state
  if (pkiJsStatus) {
    pkiJsStatus.innerHTML = '<span class="status-ready">●</span> PKI.js ready';
    pkiJsStatus.classList.remove('loading');
    pkiJsStatus.classList.add('ready');
  }

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

// Word list for passphrase generation (common, memorable words)
const WORD_LIST = [
  'apple', 'beach', 'bridge', 'castle', 'cloud', 'diamond', 'dragon', 'eagle',
  'forest', 'garden', 'island', 'jacket', 'jungle', 'kite', 'lake', 'lighthouse',
  'market', 'meadow', 'mountain', 'night', 'ocean', 'pencil', 'piano', 'planet',
  'river', 'rocket', 'school', 'silver', 'summer', 'sunset', 'tiger', 'train',
  'valley', 'voice', 'water', 'whale', 'window', 'winter', 'yellow', 'zebra',
  'amber', 'anchor', 'arrow', 'autumn', 'azure', 'banana', 'bird', 'blue',
  'book', 'breeze', 'candle', 'canvas', 'canyon', 'cascade', 'cherry', 'circle',
  'city', 'coral', 'crystal', 'dawn', 'dolphin', 'dream', 'echo', 'emerald',
  'feather', 'field', 'flame', 'flower', 'fog', 'galaxy', 'gate', 'gecko',
  'glacier', 'gold', 'grass', 'harbor', 'harmony', 'hawk', 'honey', 'horizon',
  'ice', 'iris', 'iron', 'ivory', 'jade', 'jet', 'jewel', 'journey',
  'juniper', 'kangaroo', 'key', 'king', 'koala', 'lagoon', 'lava', 'leaf',
  'legend', 'lemon', 'light', 'lion', 'lotus', 'lynx', 'magic', 'maple',
  'marble', 'melon', 'mint', 'mist', 'moon', 'morning', 'music', 'mystic',
  'nebula', 'nest', 'noble', 'noodle', 'north', 'nutmeg', 'oasis', 'olive',
  'onyx', 'opal', 'orange', 'orchid', 'palm', 'panther', 'paper', 'paradise',
  'pearl', 'pepper', 'phoenix', 'pine', 'plum', 'prism', 'pulse', 'quartz',
  'quest', 'quiet', 'rain', 'raven', 'reef', 'rhythm', 'ripple', 'rose',
  'ruby', 'sage', 'sail', 'sand', 'sapphire', 'shadow', 'shell', 'shore',
  'silence', 'sky', 'snow', 'solar', 'song', 'sound', 'spark', 'spirit',
  'spring', 'star', 'stone', 'storm', 'stream', 'summer', 'sun', 'swan',
  'temple', 'thunder', 'tide', 'time', 'topaz', 'trail', 'tree', 'tulip',
  'twilight', 'unicorn', 'valley', 'velvet', 'violet', 'vision', 'voice', 'wave',
  'wild', 'willow', 'wind', 'wing', 'wish', 'wolf', 'wonder', 'wood'
];

/**
 * Generate a memorable passphrase (4-5 random words)
 * @returns {string} Generated passphrase
 */
function generatePassphrase() {
  const wordCount = 4 + Math.floor(Math.random() * 2); // 4 or 5 words
  const words = [];
  
  for (let i = 0; i < wordCount; i++) {
    const randomIndex = Math.floor(Math.random() * WORD_LIST.length);
    // Capitalize first letter of each word for readability
    const word = WORD_LIST[randomIndex];
    words.push(word.charAt(0).toUpperCase() + word.slice(1));
  }
  
  // Join with hyphens for easy typing
  return words.join('-');
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
}

// Setup password generation functionality
document.addEventListener('DOMContentLoaded', () => {
  const generatePasswordBtn = document.getElementById('generatePasswordBtn');
  const copyPasswordBtn = document.getElementById('copyPasswordBtn');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const generatedPasswordDisplay = document.getElementById('generatedPasswordDisplay');
  const generatedPasswordText = generatedPasswordDisplay?.querySelector('.generated-password-text');
  
  if (generatePasswordBtn) {
    generatePasswordBtn.addEventListener('click', () => {
      const passphrase = generatePassphrase();
      
      // Set the password in both fields
      passwordInput.value = passphrase;
      confirmPasswordInput.value = passphrase;
      
      // Show the generated password
      if (generatedPasswordDisplay && generatedPasswordText) {
        generatedPasswordText.textContent = passphrase;
        generatedPasswordDisplay.classList.remove('hidden');
      }
      
      console.log('Generated passphrase:', passphrase);
    });
  }
  
  if (copyPasswordBtn && generatedPasswordDisplay) {
    copyPasswordBtn.addEventListener('click', async () => {
      const passwordText = generatedPasswordDisplay.querySelector('.generated-password-text')?.textContent;
      if (passwordText) {
        const success = await copyToClipboard(passwordText);
        if (success) {
          // Visual feedback
          const originalText = copyPasswordBtn.innerHTML;
          copyPasswordBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
            Copied!
          `;
          copyPasswordBtn.classList.add('copied');
          
          setTimeout(() => {
            copyPasswordBtn.innerHTML = originalText;
            copyPasswordBtn.classList.remove('copied');
          }, 2000);
        }
      }
    });
  }
});

console.log('PFX Generator loaded successfully');
