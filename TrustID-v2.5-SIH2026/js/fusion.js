/**
 * TrustID - Multi-Evidence Fusion Engine v2.5 (Enterprise Extended)
 * Smart India Hackathon 2026 | PS ID: SIH26188 | Team Conqueror
 * 
 * Layers:
 * - Deterministic Rules & Checksums (Verhoeff, PAN, ICAO 9303 MRZ) (30%)
 * - Visual Forensics (ELA & Noise Texture) (25%)
 * - Template Layout & Aspect Ratio Priors (15%)
 * - Cryptographic QR & MRZ Cross-Validation (15%)
 * - OCR Extraction Quality (10%)
 * - Reference Vault Verification (5%)
 */

(function (global) {
  'use strict';

  const LAYER_WEIGHTS = {
    rules: 30,
    forensics: 25,
    template: 15,
    crossCheck: 15,
    ocr: 10,
    reference: 5
  };

  const REASON_DESCRIPTIONS = {
    'INSUFFICIENT_EVIDENCE': 'Image quality (blur/low resolution) is inadequate for reliable automated verification. Manual inspection required.',
    'RULE_AADHAAR_CHECKSUM_FAIL': 'Deterministic Verhoeff D5 checksum failed. The 12-digit Aadhaar number is mathematically invalid.',
    'RULE_PAN_FORMAT_INVALID': 'PAN number fails structural syntax or contains an invalid entity category code.',
    'RULE_PAN_SURNAME_MISMATCH': 'PAN 5th character does not match cardholder surname initial.',
    'RULE_PASSPORT_INVALID_FORMAT': 'Passport number does not match official Indian 8-character structure.',
    'RULE_PASSPORT_MRZ_CHECKSUM_FAIL': 'ICAO Doc 9303 MRZ 7-3-1 check digit validation failed. Corrupted or forged machine readable zone.',
    'RULE_PASSPORT_VISIBLE_MISMATCH': 'Visible cardholder details do not match the parsed MRZ payload (Strong tamper indicator).',
    'RULE_DOB_INVALID': 'Date of birth is invalid, unparsable, or represents an impossible age.',
    'FORENSICS_LOCAL_ELA_SPIKE': 'High localized Error Level Analysis (ELA) variance detected, indicating digital tampering or localized splicing.',
    'FORENSICS_NOISE_DISCONTINUITY': 'Sensor noise grain is inconsistent across document regions (indicates cut-and-paste from different sources).',
    'FORENSICS_EDGE_SPLICING': 'Sharp unnatural boundary gradient discontinuities detected around photo/text borders.',
    'FORENSICS_UNIFORM_COMPRESSION': 'Notice: Image exhibits uniform compression artifacts (typical of WhatsApp or social media sharing; not treated as malicious forgery).',
    'TEMPLATE_LAYOUT_ANOMALY': 'Physical document layout or element corridor deviates from standard template priors.',
    'QR_OCR_DOB_MISMATCH': 'Cryptographic QR code embedded DOB conflicts with visible card DOB (Definite physical surface tampering).',
    'OCR_LOW_CONFIDENCE': 'OCR text reading confidence is below threshold; human operator review needed.',
    'OCR_FIELDS_MISSING': 'Crucial identity fields could not be cleanly resolved from document image.',
    'REF_DATA_MISMATCH': 'Extracted document details do not match trusted registry / DigiLocker reference data.',
    'CLEAN_VERIFICATION': 'Document successfully passed all deterministic rule checks, pixel forensics, and structure validations.'
  };

  function fuseEvidence(input) {
    const rules = input.rules || { overallStatus: 'UNKNOWN', details: {} };
    const forensics = input.forensics || { overallRisk: 'LOW', riskScore: 0.05, iqa: { qualityPass: true } };
    const template = input.template || { layoutPass: true, anomalies: [] };
    const qrCross = input.qrCross || { status: 'MATCH', discrepancies: [] };
    const ocr = input.ocr || { confidence: 0.8, isDetected: true };
    const ref = input.reference || { status: 'UNAVAILABLE' };
    const humanFeedback = input.humanFeedback || {};

    const penalties = { rules: 0, forensics: 0, template: 0, crossCheck: 0, ocr: 0, reference: 0 };
    const coverage = { rules: 0, forensics: 0, template: 0, crossCheck: 0, ocr: 0, reference: 0 };
    const flaggedCodes = new Set();
    let negativeSignalCount = 0;

    // 1. IQA Safeguard
    const iqa = forensics.iqa || { qualityPass: true };
    const isQualityInsufficient = !iqa.qualityPass;

    // 2. Rules Layer (30%)
    coverage.rules = LAYER_WEIGHTS.rules;
    if (rules.details?.aadhaarChecksum && !rules.details.aadhaarChecksum.valid && !rules.details.aadhaarChecksum.isMasked) {
      if (humanFeedback['RULE_AADHAAR_CHECKSUM_FAIL'] !== 'REJECTED') {
        penalties.rules += 30;
        flaggedCodes.add('RULE_AADHAAR_CHECKSUM_FAIL');
        negativeSignalCount++;
      }
    }
    if (rules.details?.panStructure && !rules.details.panStructure.valid) {
      if (humanFeedback['RULE_PAN_FORMAT_INVALID'] !== 'REJECTED') {
        penalties.rules += 25;
        flaggedCodes.add('RULE_PAN_FORMAT_INVALID');
        negativeSignalCount++;
      }
    }
    if (rules.details?.passportFormat && !rules.details.passportFormat.valid) {
      penalties.rules += 25;
      flaggedCodes.add('RULE_PASSPORT_INVALID_FORMAT');
      negativeSignalCount++;
    }
    if (rules.details?.passportMRZ && !rules.details.passportMRZ.valid) {
      penalties.rules += 30;
      flaggedCodes.add('RULE_PASSPORT_MRZ_CHECKSUM_FAIL');
      negativeSignalCount++;
    }
    if (rules.details?.mrzVisibleMatch && rules.details.mrzVisibleMatch.matchStatus !== 'MATCH') {
      penalties.rules += 30;
      flaggedCodes.add('RULE_PASSPORT_VISIBLE_MISMATCH');
      negativeSignalCount++;
    }
    if (rules.details?.dobValidation && !rules.details.dobValidation.valid) {
      penalties.rules += 15;
      flaggedCodes.add('RULE_DOB_INVALID');
    }
    penalties.rules = Math.min(LAYER_WEIGHTS.rules, penalties.rules);

    // 3. Forensics Layer (25%)
    coverage.forensics = LAYER_WEIGHTS.forensics;
    if (forensics.ela?.hasLocalizedAnomaly) {
      if (humanFeedback['FORENSICS_LOCAL_ELA_SPIKE'] !== 'REJECTED') {
        penalties.forensics += Math.min(20, (forensics.ela.globalTileStdDev * 4) + 10);
        flaggedCodes.add('FORENSICS_LOCAL_ELA_SPIKE');
        negativeSignalCount++;
      }
    } else if (forensics.ela?.isUniformRecompression) {
      penalties.forensics += 3;
      flaggedCodes.add('FORENSICS_UNIFORM_COMPRESSION');
    }
    if (forensics.noise?.hasNoiseMismatch) {
      if (humanFeedback['FORENSICS_NOISE_DISCONTINUITY'] !== 'REJECTED') {
        penalties.forensics += 10;
        flaggedCodes.add('FORENSICS_NOISE_DISCONTINUITY');
        negativeSignalCount++;
      }
    }
    if (forensics.noise?.edgeDiscontinuityScore > 0.4) {
      if (humanFeedback['FORENSICS_EDGE_SPLICING'] !== 'REJECTED') {
        penalties.forensics += 10;
        flaggedCodes.add('FORENSICS_EDGE_SPLICING');
        negativeSignalCount++;
      }
    }
    penalties.forensics = Math.min(LAYER_WEIGHTS.forensics, penalties.forensics);

    // 4. Template Layout Layer (15%)
    coverage.template = LAYER_WEIGHTS.template;
    if (!template.layoutPass) {
      penalties.template += Math.min(LAYER_WEIGHTS.template, 15 * (1 - (template.layoutScore / 100)));
      flaggedCodes.add('TEMPLATE_LAYOUT_ANOMALY');
    }

    // 5. QR / MRZ Cross-Check Layer (15%)
    coverage.crossCheck = LAYER_WEIGHTS.crossCheck;
    if (qrCross.status === 'MISMATCH') {
      penalties.crossCheck += LAYER_WEIGHTS.crossCheck;
      flaggedCodes.add('QR_OCR_DOB_MISMATCH');
      negativeSignalCount++;
    }

    // 6. OCR Layer (10%)
    coverage.ocr = LAYER_WEIGHTS.ocr;
    const ocrConf = Number.isFinite(ocr.confidence) ? ocr.confidence : 0.80;
    if (ocrConf < 0.60) {
      penalties.ocr += LAYER_WEIGHTS.ocr * (1 - ocrConf);
      flaggedCodes.add('OCR_LOW_CONFIDENCE');
    }
    penalties.ocr = Math.min(LAYER_WEIGHTS.ocr, penalties.ocr);

    // 7. Reference Layer (5%)
    if (ref.status === 'MATCH') {
      coverage.reference = LAYER_WEIGHTS.reference;
    } else if (ref.status === 'MISMATCH') {
      coverage.reference = LAYER_WEIGHTS.reference;
      penalties.reference = LAYER_WEIGHTS.reference;
      flaggedCodes.add('REF_DATA_MISMATCH');
      negativeSignalCount++;
    }

    // Final Score Calculation
    const totalPenalty = Object.values(penalties).reduce((a, b) => a + b, 0);
    let totalScore = Math.max(0, 100 - totalPenalty);
    const totalCoverage = Object.values(coverage).reduce((a, b) => a + b, 0);

    let riskBand = 'LOW';
    let recommendedAction = 'ACCEPT';

    if (isQualityInsufficient || totalCoverage < 50) {
      riskBand = 'MEDIUM';
      recommendedAction = 'MANUAL_REVIEW';
      flaggedCodes.add('INSUFFICIENT_EVIDENCE');
      totalScore = Math.min(totalScore, 65);
    } else if (totalScore >= 85 && negativeSignalCount === 0) {
      riskBand = 'LOW';
      recommendedAction = 'ACCEPT';
      if (flaggedCodes.size === 0) flaggedCodes.add('CLEAN_VERIFICATION');
    } else if (totalScore < 55 || negativeSignalCount >= 2) {
      riskBand = 'HIGH';
      recommendedAction = 'ESCALATE';
    } else {
      riskBand = 'MEDIUM';
      recommendedAction = 'MANUAL_REVIEW';
    }

    const reasonsList = Array.from(flaggedCodes).map(code => ({
      code,
      description: REASON_DESCRIPTIONS[code] || code,
      isHumanOverridden: Boolean(humanFeedback[code])
    }));

    return {
      trustScore: Number(totalScore.toFixed(1)),
      riskBand,
      recommendedAction,
      evidenceCoveragePct: Math.round(totalCoverage),
      penalties,
      coverage,
      reasons: reasonsList,
      negativeSignals: negativeSignalCount,
      isQualityInsufficient,
      weights: LAYER_WEIGHTS
    };
  }

  const TrustIDFusion = {
    fuseEvidence,
    LAYER_WEIGHTS,
    REASON_DESCRIPTIONS
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrustIDFusion;
  } else {
    global.TrustIDFusion = TrustIDFusion;
  }
})(typeof window !== 'undefined' ? window : this);
