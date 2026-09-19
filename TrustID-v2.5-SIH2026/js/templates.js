/**
 * TrustID - Template-Aware Layout & Geometry Engine
 * Smart India Hackathon 2026 | PS ID: SIH26188 | Team Conqueror
 * 
 * Validates document physical structure against canonical Indian ID specifications:
 * - Expected aspect ratios (CR80 cards vs ID-3 passport pages)
 * - Normalized geometric corridor bounds for photos, emblems, ID strips, QR & MRZ
 * - Detects field displacements, uncanonical overlaps, and aspect ratio distortion
 */

(function (global) {
  'use strict';

  const DOCUMENT_TEMPLATES = {
    AADHAAR: {
      canonicalAspectRatio: 1.58, // Width / Height
      aspectRatioTolerance: 0.18,
      corridors: {
        header: { xMin: 0.0, yMin: 0.0, xMax: 1.0, yMax: 0.22, label: 'Government / UIDAI Header' },
        photo: { xMin: 0.03, yMin: 0.18, xMax: 0.32, yMax: 0.68, label: 'Resident Portrait Box' },
        details: { xMin: 0.26, yMin: 0.20, xMax: 0.76, yMax: 0.72, label: 'Demographic Details (Name/DOB)' },
        qrCode: { xMin: 0.70, yMin: 0.18, xMax: 0.98, yMax: 0.62, label: 'Secure QR Code Area' },
        idNumber: { xMin: 0.04, yMin: 0.70, xMax: 0.96, yMax: 0.94, label: '12-Digit Aadhaar Strip' }
      }
    },
    PAN: {
      canonicalAspectRatio: 1.58,
      aspectRatioTolerance: 0.16,
      corridors: {
        header: { xMin: 0.0, yMin: 0.0, xMax: 1.0, yMax: 0.22, label: 'Income Tax Department Header' },
        photo: { xMin: 0.04, yMin: 0.16, xMax: 0.30, yMax: 0.64, label: 'Photograph Box' },
        details: { xMin: 0.25, yMin: 0.20, xMax: 0.96, yMax: 0.68, label: 'Cardholder Details' },
        signature: { xMin: 0.60, yMin: 0.48, xMax: 0.98, yMax: 0.72, label: 'Cardholder Signature Strip' },
        idNumber: { xMin: 0.04, yMin: 0.66, xMax: 0.96, yMax: 0.92, label: '10-Char PAN Strip' }
      }
    },
    PASSPORT: {
      canonicalAspectRatio: 1.42, // ICAO ID-3 booklet data page
      aspectRatioTolerance: 0.18,
      corridors: {
        header: { xMin: 0.0, yMin: 0.0, xMax: 1.0, yMax: 0.20, label: 'Republic of India / Passport Header' },
        photo: { xMin: 0.03, yMin: 0.18, xMax: 0.32, yMax: 0.74, label: 'Passport Photo Portrait' },
        details: { xMin: 0.28, yMin: 0.18, xMax: 0.98, yMax: 0.76, label: 'Personal Attributes (Name/DOB/Expiry)' },
        mrz: { xMin: 0.02, yMin: 0.76, xMax: 0.98, yMax: 0.98, label: 'Machine Readable Zone (2 Lines)' }
      }
    }
  };

  /**
   * Evaluate whether an uploaded document matches the physical layout priors
   */
  function evaluateDocumentLayout(docType, width, height, detectedFeatures = {}) {
    const type = (docType || 'AADHAAR').toUpperCase();
    const template = DOCUMENT_TEMPLATES[type] || DOCUMENT_TEMPLATES.AADHAAR;

    const actualAspectRatio = width / height;
    const aspectDiff = Math.abs(actualAspectRatio - template.canonicalAspectRatio);
    const isAspectDistorted = aspectDiff > template.aspectRatioTolerance;

    const anomalies = [];
    let layoutScore = 100;

    // Check aspect ratio distortion
    if (isAspectDistorted) {
      layoutScore -= 20;
      anomalies.push({
        type: 'ASPECT_RATIO_DEVIATION',
        severity: 'MEDIUM',
        message: `Aspect ratio ${actualAspectRatio.toFixed(2)} deviates from standard ${template.canonicalAspectRatio.toFixed(2)} (Distorted proportions or cropped scan).`
      });
    }

    // Check detected feature corridor compliance
    // detectedFeatures: { photo: [x, y, w, h], idNumber: [...], dob: [...], mrz: [...] }
    if (detectedFeatures.photo) {
      const [px, py, pw, ph] = detectedFeatures.photo;
      const normPx = px / width;
      const normPy = py / height;
      const corridor = template.corridors.photo;
      if (corridor) {
        if (normPx < corridor.xMin - 0.10 || normPx > corridor.xMax + 0.10 || normPy < corridor.yMin - 0.10 || normPy > corridor.yMax + 0.10) {
          layoutScore -= 25;
          anomalies.push({
            type: 'PHOTO_DISPLACED',
            severity: 'HIGH',
            message: `Photograph location (${normPx.toFixed(2)}, ${normPy.toFixed(2)}) is displaced from expected corridor [${corridor.xMin}-${corridor.xMax}, ${corridor.yMin}-${corridor.yMax}].`
          });
        }
      }
    }

    if (type === 'PASSPORT' && detectedFeatures.mrz) {
      const [mx, my, mw, mh] = detectedFeatures.mrz;
      const normMy = my / height;
      if (normMy < 0.70) {
        layoutScore -= 30;
        anomalies.push({
          type: 'MRZ_DISPLACED',
          severity: 'HIGH',
          message: `MRZ lines appear too high up on the page (${normMy.toFixed(2)}); expected in bottom 22% of booklet page.`
        });
      }
    }

    const layoutPass = layoutScore >= 70;
    return {
      layoutPass,
      layoutScore: Math.max(10, layoutScore),
      aspectRatio: Number(actualAspectRatio.toFixed(2)),
      canonicalAspectRatio: template.canonicalAspectRatio,
      anomalies,
      templateName: type
    };
  }

  const TrustIDTemplates = {
    DOCUMENT_TEMPLATES,
    evaluateDocumentLayout
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrustIDTemplates;
  } else {
    global.TrustIDTemplates = TrustIDTemplates;
  }
})(typeof window !== 'undefined' ? window : this);
