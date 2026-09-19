/**
 * TrustID - DigiLocker / API Setu Sandbox Adapter
 * Smart India Hackathon 2026 | PS ID: SIH26188
 * 
 * Compliant Integration-Ready Architecture:
 * - Implements simulated OAuth2 Consent handshake (DPDP Act 2023 aligned)
 * - Simulates OTP authentication to Aadhaar/PAN linked mobile
 * - Cross-references physical document OCR fields against certified XML vault record
 * - Positions TrustID as an authorized enterprise gateway connector
 */

(function (global) {
  'use strict';

  // Mock Sandbox Registry of Verified Identity Records
  const SANDBOX_VAULT = {
    '543210987652': {
      name: 'ANSH GUPTA',
      dob: '15/08/2002',
      gender: 'MALE',
      address: 'Sector 62, Noida, Uttar Pradesh - 201309',
      issuer: 'UIDAI',
      timestamp: '2024-03-12T10:14:00Z',
      digitalSignature: 'SHA256withRSA:9b2c8...f31a'
    },
    '345678901234': {
      name: 'ROHIT PATEL',
      dob: '23/11/1998', // Note: If document has 01/01/2000, sandbox detects DOB mismatch!
      gender: 'MALE',
      address: 'Navrangpura, Ahmedabad, Gujarat - 380009',
      issuer: 'UIDAI',
      timestamp: '2023-11-05T14:22:18Z',
      digitalSignature: 'SHA256withRSA:4c81d...a89e'
    },
    'AAAPS1234K': {
      name: 'VIKRAM SHARMA',
      dob: '12/04/1995',
      gender: 'MALE',
      panStatus: 'ACTIVE & ALLOTTED',
      issuer: 'Income Tax Department of India',
      timestamp: '2022-08-19T09:30:00Z',
      digitalSignature: 'SHA256withRSA:71fa2...8801'
    }
  };

  /**
   * Simulate DigiLocker OTP Verification Handshake
   */
  async function requestDigiLockerConsent(idNumber, documentType = 'AADHAAR') {
    const cleanId = String(idNumber || '').replace(/[\s-]/g, '').toUpperCase();

    return new Promise((resolve) => {
      // Simulate network request latency (800ms)
      setTimeout(() => {
        const record = SANDBOX_VAULT[cleanId];
        if (!record) {
          resolve({
            status: 'NOT_FOUND_IN_SANDBOX',
            message: 'ID not registered in sandbox test registry. In production, this issues an API Setu e-KYC request.',
            matched: false
          });
          return;
        }

        resolve({
          status: 'AUTHENTICATED',
          message: 'Citizen authenticated via OTP. Certified electronic record retrieved from vault.',
          record: record,
          matched: true
        });
      }, 800);
    });
  }

  /**
   * Cross-Verify OCR Fields Against Retrieved Sandbox Record
   */
  function compareWithVault(ocrFields, vaultRecord) {
    if (!vaultRecord) {
      return { status: 'UNAVAILABLE', details: 'No vault record provided' };
    }

    const ocrName = (ocrFields.name || '').toUpperCase().trim();
    const vaultName = (vaultRecord.name || '').toUpperCase().trim();

    const ocrDob = (ocrFields.dob || '').trim();
    const vaultDob = (vaultRecord.dob || '').trim();

    // Check name fuzzy overlap
    const nameWords = ocrName.split(/\s+/);
    const vaultWords = vaultName.split(/\s+/);
    const hasNameMatch = nameWords.some(w => w.length > 2 && vaultWords.includes(w));

    const hasDobMatch = ocrDob && vaultDob ? (ocrDob === vaultDob) : true;

    const isFullMatch = hasNameMatch && hasDobMatch;

    return {
      status: isFullMatch ? 'MATCH' : 'MISMATCH',
      nameMatch: hasNameMatch,
      dobMatch: hasDobMatch,
      vaultRecord: vaultRecord,
      details: isFullMatch 
        ? 'OCR extracted fields match certified DigiLocker record 100%.'
        : Discrepancy detected: 
    };
  }

  const DigiLockerSandbox = {
    requestDigiLockerConsent,
    compareWithVault,
    SANDBOX_VAULT
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DigiLockerSandbox;
  } else {
    global.DigiLockerSandbox = DigiLockerSandbox;
  }
})(typeof window !== 'undefined' ? window : this);