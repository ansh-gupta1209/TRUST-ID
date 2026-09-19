/**
 * TrustID - Deterministic Rule Validation Engine (Extended with Passport)
 * Smart India Hackathon 2026 | PS ID: SIH26188 | Team Conqueror
 * 
 * Mathematical and deterministic checks:
 * 1. Full Verhoeff Checksum Algorithm (Dihedral Group D5) for 12-digit Aadhaar
 * 2. PAN Card regex, 4th character entity code, and 5th character surname initial validation
 * 3. Passport number format and ICAO 9303 MRZ validation
 * 4. Date of Birth format, leap year, age range (0-120), and future date checks
 * 5. Masked Aadhaar format handling (UIDAI compliance)
 */

(function (global) {
  'use strict';

  // --- 1. VERHOEFF ALGORITHM (Dihedral Group D_5) ---
  const VERHOEFF_D = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
  ];

  const VERHOEFF_P = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
  ];

  const VERHOEFF_INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

  function validateAadhaarVerhoeff(input) {
    if (!input) return { valid: false, cleanNumber: '', reason: 'No Aadhaar number provided' };

    const clean = String(input).replace(/[\s-]/g, '');

    if (/^[xX*]{4}\s?[xX*]{4}\s?[0-9]{4}$/.test(String(input).trim())) {
      return {
        valid: true,
        cleanNumber: input.trim().toUpperCase(),
        isMasked: true,
        reason: 'Masked Aadhaar compliant with UIDAI circulars (last 4 digits visible)'
      };
    }

    if (!/^\d{12}$/.test(clean)) {
      return {
        valid: false,
        cleanNumber: clean,
        isMasked: false,
        reason: clean.length !== 12 ? `Expected 12 digits, found ${clean.length}` : 'Contains non-numeric characters'
      };
    }

    if (clean[0] === '0' || clean[0] === '1') {
      return {
        valid: false,
        cleanNumber: clean,
        isMasked: false,
        reason: 'Aadhaar cannot start with 0 or 1 per UIDAI allocation rules'
      };
    }

    let c = 0;
    const digits = clean.split('').reverse().map(Number);
    for (let i = 0; i < digits.length; i++) {
      c = VERHOEFF_D[c][VERHOEFF_P[i % 8][digits[i]]];
    }

    const isValid = (c === 0);
    return {
      valid: isValid,
      cleanNumber: `${clean.slice(0, 4)} ${clean.slice(4, 8)} ${clean.slice(8)}`,
      isMasked: false,
      reason: isValid ? 'Passes Dihedral D5 Verhoeff checksum validation' : 'Failed Verhoeff checksum (invalid check digit or transposed digits)'
    };
  }

  function generateVerhoeffCheckDigit(prefix11) {
    const clean = String(prefix11).replace(/\D/g, '');
    if (clean.length !== 11) return null;
    let c = 0;
    const digits = clean.split('').reverse().map(Number);
    for (let i = 0; i < digits.length; i++) {
      c = VERHOEFF_D[c][VERHOEFF_P[(i + 1) % 8][digits[i]]];
    }
    return VERHOEFF_INV[c];
  }

  // --- 2. PAN CARD RULES ---
  const PAN_ENTITY_TYPES = {
    'P': 'Individual (Person)',
    'C': 'Company',
    'H': 'Hindu Undivided Family (HUF)',
    'F': 'Firm / Partnership',
    'A': 'Association of Persons (AOP)',
    'T': 'Trust',
    'B': 'Body of Individuals (BOI)',
    'L': 'Local Authority',
    'J': 'Artificial Juridical Person',
    'G': 'Government Agency'
  };

  function validatePAN(panNumber, surname = null) {
    if (!panNumber) return { valid: false, cleanPAN: '', reason: 'No PAN number provided' };

    const clean = String(panNumber).trim().toUpperCase().replace(/\s/g, '');
    const regex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

    if (!regex.test(clean)) {
      return { valid: false, cleanPAN: clean, reason: 'Invalid PAN structure. Expected: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)' };
    }

    const entityChar = clean[3];
    const entityName = PAN_ENTITY_TYPES[entityChar];
    if (!entityName) {
      return { valid: false, cleanPAN: clean, reason: `Invalid 4th character '${entityChar}'. Must represent a valid Income Tax entity type.` };
    }

    let surnameCheck = { matched: true, reason: 'Surname check skipped' };
    if (surname && typeof surname === 'string' && surname.trim().length > 0) {
      const expectedInitial = surname.trim().toUpperCase()[0];
      const actualInitial = clean[4];
      if (entityChar === 'P' && expectedInitial !== actualInitial) {
        surnameCheck = {
          matched: false,
          reason: `5th character '${actualInitial}' does not match expected surname initial '${expectedInitial}'`
        };
      } else {
        surnameCheck = { matched: true, reason: `5th character '${actualInitial}' matches surname initial` };
      }
    }

    return {
      valid: true,
      cleanPAN: clean,
      entityType: entityName,
      entityChar: entityChar,
      surnameCheck,
      reason: `Valid PAN format for ${entityName}`
    };
  }

  // --- 3. PASSPORT NUMBER VALIDATOR ---
  function validatePassportNumber(passNumber) {
    if (!passNumber) return { valid: false, cleanNumber: '', reason: 'No Passport number provided' };
    const clean = String(passNumber).trim().toUpperCase().replace(/\s/g, '');
    // Indian Passport format: 1 capital letter followed by 7 or 8 digits
    const regex = /^[A-Z][0-9]{7,8}$/;
    if (!regex.test(clean)) {
      return {
        valid: false,
        cleanNumber: clean,
        reason: 'Invalid Indian Passport structure. Expected: 1 capital letter followed by 7 or 8 digits (e.g. Z1234567).'
      };
    }
    return {
      valid: true,
      cleanNumber: clean,
      reason: 'Valid Indian Passport number structure.'
    };
  }

  // --- 4. DATE OF BIRTH VALIDATION ---
  function validateDOB(dobString) {
    if (!dobString) return { valid: false, cleanDOB: '', age: null, reason: 'No Date of Birth provided' };

    const raw = String(dobString).trim();
    let day, month, year;
    const dmyMatch = raw.match(/^([0-3]?\d)[\/\-.]([0-1]?\d)[\/\-.](\d{4})$/);
    const ymdMatch = raw.match(/^(\d{4})[\/\-.]([0-1]?\d)[\/\-.]([0-3]?\d)$/);

    if (dmyMatch) {
      day = parseInt(dmyMatch[1], 10);
      month = parseInt(dmyMatch[2], 10);
      year = parseInt(dmyMatch[3], 10);
    } else if (ymdMatch) {
      year = parseInt(ymdMatch[1], 10);
      month = parseInt(ymdMatch[2], 10);
      day = parseInt(ymdMatch[3], 10);
    } else {
      return { valid: false, cleanDOB: raw, age: null, reason: 'Invalid date format. Expected DD/MM/YYYY' };
    }

    if (month < 1 || month > 12) return { valid: false, cleanDOB: raw, age: null, reason: `Invalid month: ${month}` };

    const daysInMonth = [31, (isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (day < 1 || day > daysInMonth[month - 1]) return { valid: false, cleanDOB: raw, age: null, reason: `Invalid day ${day} for month ${month}` };

    const birthDate = new Date(year, month - 1, day);
    const now = new Date();
    if (birthDate > now) return { valid: false, cleanDOB: raw, age: null, reason: 'Date of birth cannot be in the future' };

    let age = now.getFullYear() - birthDate.getFullYear();
    const m = now.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) age--;

    if (age > 120) return { valid: false, cleanDOB: raw, age, reason: `Unrealistic age: ${age} years` };

    const formatted = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    return {
      valid: true,
      cleanDOB: formatted,
      age,
      isAdult: age >= 18,
      reason: `Valid DOB. Age: ${age} years`
    };
  }

  function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }

  // --- 5. COMPOSITE DOCUMENT EVALUATOR ---
  function evaluateDocumentRules(docType, fields) {
    const results = {
      overallStatus: 'PASS',
      rulesChecked: 0,
      rulesPassed: 0,
      rulesFailed: 0,
      details: {}
    };

    const type = (docType || '').toUpperCase();

    // Passport Check
    if (type.includes('PASSPORT') || (fields.idNumber && /^[A-Z][0-9]{7,8}$/.test(fields.idNumber.trim()))) {
      results.rulesChecked++;
      const pRes = validatePassportNumber(fields.idNumber);
      results.details.passportFormat = pRes;
      if (pRes.valid) results.rulesPassed++;
      else { results.rulesFailed++; results.overallStatus = 'FAIL'; }

      // MRZ check if lines are available
      if (fields.mrzLine1 && fields.mrzLine2 && typeof TrustIDPassportMRZ !== 'undefined') {
        results.rulesChecked++;
        const mrzRes = TrustIDPassportMRZ.parsePassportMRZ(fields.mrzLine1, fields.mrzLine2);
        results.details.passportMRZ = mrzRes;
        if (mrzRes.valid) results.rulesPassed++;
        else { results.rulesFailed++; results.overallStatus = 'FAIL'; }

        // Compare visible with MRZ
        const compRes = TrustIDPassportMRZ.compareVisibleWithMRZ(fields, mrzRes);
        results.details.mrzVisibleMatch = compRes;
        if (compRes.matchStatus !== 'MATCH') {
          results.overallStatus = 'FAIL';
        }
      }
    }

    // Aadhaar Check
    if (type.includes('AADHAAR') || (fields.idNumber && (fields.idNumber.replace(/\D/g, '').length === 12 || /^[xX*]/.test(fields.idNumber)))) {
      results.rulesChecked++;
      const vRes = validateAadhaarVerhoeff(fields.idNumber);
      results.details.aadhaarChecksum = vRes;
      if (vRes.valid) results.rulesPassed++;
      else { results.rulesFailed++; results.overallStatus = 'FAIL'; }
    }

    // PAN Check
    if (type.includes('PAN') || (fields.idNumber && /^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(fields.idNumber.trim()))) {
      results.rulesChecked++;
      let surname = null;
      if (fields.name) {
        const parts = fields.name.trim().split(/\s+/);
        if (parts.length > 1) surname = parts[parts.length - 1];
      }
      const panRes = validatePAN(fields.idNumber, surname);
      results.details.panStructure = panRes;
      if (panRes.valid) results.rulesPassed++;
      else { results.rulesFailed++; results.overallStatus = 'FAIL'; }
    }

    // DOB Check
    if (fields.dob) {
      results.rulesChecked++;
      const dobRes = validateDOB(fields.dob);
      results.details.dobValidation = dobRes;
      if (dobRes.valid) results.rulesPassed++;
      else { results.rulesFailed++; results.overallStatus = 'FAIL'; }
    }

    if (results.rulesChecked === 0) results.overallStatus = 'UNKNOWN';

    return results;
  }

  const TrustIDRules = {
    validateAadhaarVerhoeff,
    generateVerhoeffCheckDigit,
    validatePAN,
    validatePassportNumber,
    validateDOB,
    evaluateDocumentRules,
    PAN_ENTITY_TYPES
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrustIDRules;
  } else {
    global.TrustIDRules = TrustIDRules;
  }
})(typeof window !== 'undefined' ? window : this);
