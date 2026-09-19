/**
 * TrustID - Synthetic Tamper Generation Lab
 * Smart India Hackathon 2026 | PS ID: SIH26188 | Team Conqueror
 * 
 * Interactive Tamper Injection Suite for Hackathon Demonstrations:
 * Allows judges and operators to take a genuine card and inject controlled forgeries:
 * 1. Spliced Date of Birth patch (Font & ELA noise mismatch)
 * 2. Swapped Face Photograph (Edge gradient boundary discontinuity)
 * 3. Corrupted Verhoeff / PAN check digit
 * 4. WhatsApp 8x8 block quantization re-compression
 * 5. Desync Visible text vs. Cryptographic QR / MRZ payload
 * 
 * Then immediately runs TrustID's multi-evidence engine to catch the injected tamper!
 */

(function (global) {
  'use strict';

  /**
   * Clone an image onto a fresh canvas for mutation
   */
  function cloneToCanvas(imgElement) {
    const canvas = document.createElement('canvas');
    const w = imgElement.naturalWidth || imgElement.width || 600;
    const h = imgElement.naturalHeight || imgElement.height || 380;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgElement, 0, 0, w, h);
    return canvas;
  }

  /**
   * Attack 1: Inject Spliced DOB Patch
   */
  function injectSplicedDob(canvas, newDobText = '01/01/2000') {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Approximate DOB region for standard Indian cards
    const bx = Math.floor(w * 0.31);
    const by = Math.floor(h * 0.33);
    const bw = Math.floor(w * 0.36);
    const bh = Math.floor(h * 0.09);

    // Step A: Patch background with slightly different color (simulating Photoshop clone/patch)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bx, by, bw, bh);

    // Step B: Render altered text with mismatched font
    ctx.font = 'bold 15px Arial, sans-serif';
    ctx.fillStyle = '#000000';
    ctx.fillText(`DOB: ${newDobText}`, bx + 6, by + bh - 8);

    // Step C: Inject localized high-frequency compression noise in this box
    const patchData = ctx.getImageData(bx, by, bw, bh);
    const d = patchData.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > 200) { // white area
        const noise = (Math.random() - 0.5) * 22;
        d[i] = Math.min(255, Math.max(0, d[i] + noise));
        d[i+1] = Math.min(255, Math.max(0, d[i+1] + noise));
        d[i+2] = Math.min(255, Math.max(0, d[i+2] + noise));
      }
    }
    ctx.putImageData(patchData, bx, by);

    return {
      attackType: 'SPLICED_DOB',
      injectedText: newDobText,
      bbox: [bx, by, bw, bh],
      description: `Injected digital DOB patch ('${newDobText}') with font and local compression noise mismatch.`
    };
  }

  /**
   * Attack 2: Swap Portrait Photograph with Splicing Boundary
   */
  function injectSwappedPhoto(canvas) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    const px = Math.floor(w * 0.05);
    const py = Math.floor(h * 0.22);
    const pw = Math.floor(w * 0.20);
    const ph = Math.floor(h * 0.44);

    // Draw foreign avatar with sharp edge boundary
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(px, py, pw, ph);

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(px + pw/2, py + ph*0.38, pw*0.30, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(px + pw*0.2, py + ph*0.65, pw*0.6, ph*0.35);

    // Unnatural sharp border
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(px, py, pw, ph);

    return {
      attackType: 'SWAPPED_PHOTO',
      bbox: [px, py, pw, ph],
      description: 'Swapped facial portrait with razor-sharp boundary edge gradient mismatch.'
    };
  }

  /**
   * Attack 3: Corrupt Checksum / Number Digit
   */
  function injectCorruptedChecksum(canvas, badNumberText = '9876 5432 1099') {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    const ix = Math.floor(w * 0.15);
    const iy = Math.floor(h * 0.74);
    const iw = Math.floor(w * 0.70);
    const ih = Math.floor(h * 0.15);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(ix, iy, iw, ih);

    ctx.font = '900 24px Courier New, monospace';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.fillText(badNumberText, ix + iw/2, iy + ih*0.68);
    ctx.textAlign = 'start';

    return {
      attackType: 'CORRUPT_CHECKSUM',
      injectedText: badNumberText,
      bbox: [ix, iy, iw, ih],
      description: `Mutated 12-digit Aadhaar to '${badNumberText}', intentionally violating the Verhoeff D5 dihedral checksum.`
    };
  }

  /**
   * Attack 4: Uniform WhatsApp 8x8 Block Recompression
   */
  function injectWhatsAppRecompression(canvas) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;

    // Simulate 8x8 discrete cosine transform block quantization
    for (let y = 0; y < h; y++) {
      const by = Math.floor(y / 8) * 8;
      for (let x = 0; x < w; x++) {
        const bx = Math.floor(x / 8) * 8;
        const qNoise = ((bx * 13 + by * 29) % 18) - 9;
        const idx = (y * w + x) * 4;
        d[idx] = Math.min(255, Math.max(0, d[idx] + qNoise));
        d[idx+1] = Math.min(255, Math.max(0, d[idx+1] + qNoise));
        d[idx+2] = Math.min(255, Math.max(0, d[idx+2] + qNoise));
      }
    }
    ctx.putImageData(imgData, 0, 0);

    return {
      attackType: 'WHATSAPP_COMPRESSION',
      description: 'Applied uniform 8x8 block quantization noise simulating WhatsApp image compression.'
    };
  }

  const TrustIDTamperLab = {
    cloneToCanvas,
    injectSplicedDob,
    injectSwappedPhoto,
    injectCorruptedChecksum,
    injectWhatsAppRecompression
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrustIDTamperLab;
  } else {
    global.TrustIDTamperLab = TrustIDTamperLab;
  }
})(typeof window !== 'undefined' ? window : this);
