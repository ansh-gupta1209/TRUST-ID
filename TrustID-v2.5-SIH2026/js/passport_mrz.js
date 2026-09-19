/**
 * TrustID - Indian Passport & ICAO Doc 9303 MRZ Engine
 * Smart India Hackathon 2026 | PS ID: SIH26188 | Team Conqueror
 * 
 * Implements:
 * 1. ICAO Doc 9303 TD3 Specification (2 lines of 44 characters)
 * 2. Official 7-3-1 Weighting Check Digit Algorithm
 * 3. Passport Number, Date of Birth, Expiry Date & Composite Check Digit Validation
 * 4. Visible Printed Text vs. MRZ Payload Cross-Verification
 * 5. Expiry & Chronological Validity Safeguards
 */

(function (global) {
  'use strict';

  // ICAO Character Value Mapping: 0-9 = 0-9, A-Z = 10-35, '<' = 0
  function getIcaoCharValue(ch) {
    if (!ch) return 0;
    const c = ch.toUpperCase();
    if (c >= '0' && c <= '9') return c.charCodeAt(0) - 48;
    if (c >= 'A' && c <= 'Z') return c.charCodeAt(0) - 55;
    return 0; // '<' or any filler
  }

  const WEIGHTS = [7, 3, 1];

  /**
   * Compute ICAO 7-3-1 Check Digit for an alphanumeric string
   */
  function computeIcaoCheckDigit(str) {
    let sum = 0;
    for (let i = 0; i < str.length; i++) {
      const val = getIcaoCharValue(str[i]);
      const weight = WEIGHTS[i % 3];
      sum += val * weight;
    }
    return (sum % 10).toString();
  }

  /**
   * Validate a field against its check digit
   */
  function verifyFieldCheckDigit(fieldStr, checkChar) {
    const expected = computeIcaoCheckDigit(fieldStr);
    return {
      valid: expected === checkChar,
      expected,
      actual: checkChar
    };
  }

  /**
   * Parse ICAO YYMMDD date string to DD/MM/YYYY
   */
  function parseIcaoDate(yymmdd, isExpiry = false) {
    if (!yymmdd || yymmdd.length !== 6 || /\D/.test(yymmdd)) return null;
    const yy = parseInt(yymmdd.slice(0, 2), 10);
    const mm = parseInt(yymmdd.slice(2, 4), 10);
    const dd = parseInt(yymmdd.slice(4, 6), 10);

    const currentYear = new Date().getFullYear();
    const currentCentury = Math.floor(currentYear / 100) * 100;
    const currentYY = currentYear % 100;

    let fullYear;
    if (isExpiry) {
      // Expiry dates are typically current century or next
      fullYear = (yy >= currentYY - 10) ? currentCentury + yy : currentCentury + 100 + yy;
    } else {
      // Birth dates: if yy <= currentYY, born this century; else last century
      fullYear = (yy <= currentYY) ? currentCentury + yy : (currentCentury - 100) + yy;
    }

    return `${String(dd).padStart(2, '0')}/${String(mm).padStart(2, '0')}/${fullYear}`;
  }

  /**
   * Parse full 2-line TD3 MRZ Zone (44 chars each)
   */
  function parsePassportMRZ(line1Raw, line2Raw) {
    if (!line1Raw || !line2Raw) {
      return { valid: false, reason: 'MRZ lines missing or incomplete' };
    }

    const l1 = line1Raw.replace(/[\s\r\n]/g, '').toUpperCase().padEnd(44, '<').slice(0, 44);
    const l2 = line2Raw.replace(/[\s\r\n]/g, '').toUpperCase().padEnd(44, '<').slice(0, 44);

    // Line 1: P<IND<SURNAME<<GIVEN<NAMES
    const docType = l1.slice(0, 2).replace(/</g, '');
    const issuingCountry = l1.slice(2, 5).replace(/</g, '');
    const nameSection = l1.slice(5);
    const nameParts = nameSection.split('<<');
    const surname = (nameParts[0] || '').replace(/</g, ' ').trim();
    const givenNames = (nameParts[1] || '').replace(/</g, ' ').trim();
    const fullName = `${givenNames} ${surname}`.trim();

    // Line 2: PASSPORT_NO (9) + CD (1) + NAT (3) + DOB (6) + CD (1) + SEX (1) + EXP (6) + CD (1) + OPT (14) + CD (1) + COMPOSITE_CD (1)
    const passportNoRaw = l2.slice(0, 9);
    const passportNo = passportNoRaw.replace(/</g, '');
    const passportNoCD = l2[9];

    const nationality = l2.slice(10, 13).replace(/</g, '');
    const dobRaw = l2.slice(13, 19);
    const dobCD = l2[19];

    const sex = l2[20].replace(/</g, 'U');
    const expiryRaw = l2.slice(21, 27);
    const expiryCD = l2[27];

    const optionalData = l2.slice(28, 42);
    const optionalCD = l2[42];
    const compositeCD = l2[43];

    // Check Digits Verification
    const cdPass = verifyFieldCheckDigit(passportNoRaw, passportNoCD);
    const cdDob = verifyFieldCheckDigit(dobRaw, dobCD);
    const cdExp = verifyFieldCheckDigit(expiryRaw, expiryCD);

    // Composite check digit string covers: passportNoRaw + passportNoCD + dobRaw + dobCD + expiryRaw + expiryCD + optionalData + optionalCD
    const compositeData = l2.slice(0, 10) + l2.slice(13, 20) + l2.slice(21, 43);
    const cdComposite = verifyFieldCheckDigit(compositeData, compositeCD);

    const allCheckDigitsValid = cdPass.valid && cdDob.valid && cdExp.valid && cdComposite.valid;

    // Dates formatting
    const formattedDob = parseIcaoDate(dobRaw, false);
    const formattedExpiry = parseIcaoDate(expiryRaw, true);

    // Expiry check
    let isExpired = false;
    if (formattedExpiry) {
      const parts = formattedExpiry.split('/');
      const expDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      isExpired = (expDate < new Date());
    }

    return {
      valid: allCheckDigitsValid,
      isExpired,
      docType,
      issuingCountry,
      fullName,
      surname,
      givenNames,
      passportNumber: passportNo,
      nationality,
      dob: formattedDob,
      rawDob: dobRaw,
      sex: sex === 'M' ? 'MALE' : sex === 'F' ? 'FEMALE' : 'UNSPECIFIED',
      expiryDate: formattedExpiry,
      rawExpiry: expiryRaw,
      checkDigits: {
        passportNumber: cdPass,
        dateOfBirth: cdDob,
        expiryDate: cdExp,
        composite: cdComposite
      },
      line1: l1,
      line2: l2,
      reason: allCheckDigitsValid 
        ? 'All ICAO Doc 9303 MRZ 7-3-1 check digits validated successfully.'
        : 'MRZ checksum error: one or more 7-3-1 check digits do not match payload.'
    };
  }

  /**
   * Cross-verify MRZ payload against Visible Card Printed Text
   */
  function compareVisibleWithMRZ(visibleFields, mrzData) {
    if (!mrzData || !mrzData.valid) {
      return {
        matchStatus: 'UNAVAILABLE',
        discrepancies: ['MRZ data could not be parsed or failed check digits.'],
        scoreDeduction: 25
      };
    }

    const discrepancies = [];

    // 1. Passport Number Comparison
    if (visibleFields.passportNumber) {
      const cleanVisPass = visibleFields.passportNumber.replace(/\s/g, '').toUpperCase();
      const cleanMrzPass = mrzData.passportNumber.replace(/\s/g, '').toUpperCase();
      if (cleanVisPass !== cleanMrzPass) {
        discrepancies.push(`Passport number mismatch: Visible '${cleanVisPass}' vs MRZ '${cleanMrzPass}'`);
      }
    }

    // 2. Date of Birth Comparison
    if (visibleFields.dob && mrzData.dob) {
      const visDob = visibleFields.dob.trim();
      const mrzDob = mrzData.dob.trim();
      if (visDob !== mrzDob) {
        discrepancies.push(`Date of birth mismatch: Visible '${visDob}' vs MRZ '${mrzDob}' (Strong Tamper Indicator)`);
      }
    }

    // 3. Name Similarity Comparison
    if (visibleFields.name && mrzData.fullName) {
      const visWords = visibleFields.name.toUpperCase().split(/\s+/).filter(w => w.length > 1);
      const mrzWords = mrzData.fullName.toUpperCase().split(/\s+/).filter(w => w.length > 1);
      const overlap = visWords.filter(w => mrzWords.includes(w));
      if (overlap.length === 0) {
        discrepancies.push(`Name mismatch: Visible '${visibleFields.name}' vs MRZ '${mrzData.fullName}'`);
      }
    }

    // 4. Expiry Date Check
    if (mrzData.isExpired) {
      discrepancies.push(`Passport is expired (Expiry Date: ${mrzData.expiryDate})`);
    }

    const hasMismatch = discrepancies.length > 0;
    return {
      matchStatus: hasMismatch ? 'MISMATCH' : 'MATCH',
      discrepancies,
      scoreDeduction: hasMismatch ? Math.min(35, discrepancies.length * 20) : 0,
      details: hasMismatch
        ? `Discrepancies found between visible text and MRZ: ${discrepancies.join('; ')}`
        : 'Visible text fields match MRZ payload 100% with valid ICAO check digits.'
    };
  }

  const TrustIDPassportMRZ = {
    computeIcaoCheckDigit,
    verifyFieldCheckDigit,
    parsePassportMRZ,
    compareVisibleWithMRZ,
    parseIcaoDate
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrustIDPassportMRZ;
  } else {
    global.TrustIDPassportMRZ = TrustIDPassportMRZ;
  }
})(typeof window !== 'undefined' ? window : this);
