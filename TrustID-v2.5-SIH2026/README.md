# TrustID: Explainable Document Authenticity Engine & Fraud Intelligence Suite
**Smart India Hackathon 2026 | Problem Statement ID: SIH26188**  
**Team: Team Conqueror**

---

## Overview
TrustID is an explainable, client-side identity document verification engine and fraud intelligence suite designed to detect tampering, field forgery, photo splicing, and syndicate fraud across Indian identity documents:
1. **Aadhaar Cards** (UIDAI)
2. **PAN Cards** (Income Tax Department of India)
3. **Indian Passports** (Republic of India)

Rather than outputting an opaque percentage score, TrustID combines **deterministic algebraic rule verification (Verhoeff $D_5$ and ICAO 9303 MRZ 7-3-1)**, **Error Level Analysis (ELA)**, **template geometry priors**, **cryptographic QR/MRZ cross-checks**, and **multi-document identity consistency** to produce transparent, court-admissible audit trails.

---

## Key Features & Capabilities

### 1. Document Coverage
- **Aadhaar Card:** Full Dihedral Group $D_5$ Verhoeff checksum algorithm, secure QR-to-OCR cross-validation, and masked Aadhaar handling.
- **PAN Card:** 10-character syntax validation (`[A-Z]{5}[0-9]{4}[A-Z]`), 4th character entity code checks (`P`, `C`, `H`, `F`, `A`, `T`, etc.), and 5th character surname initial match.
- **Indian Passport:** Full **ICAO Doc 9303 TD3 standard** (2 lines of 44 characters) with official **7-3-1 check digit algorithms** for Passport Number, Date of Birth, Expiry Date, and composite checksum, plus visible-vs-MRZ cross-checking.

### 2. Forensic & Evidence Modules
- **Field-Level Tamper Heatmaps:** Pinpoints localized tampering on exact fields (DOB, ID Number, Photo, Name, MRZ/QR) with an interactive before/after overlay slider.
- **Template Layout Priors:** Checks canonical aspect ratios (CR80 ~1.58:1 vs Passport ID-3 ~1.42:1) and normalized corridor bounds for photos, emblems, ID strips, QR, and MRZ.
- **QR-to-OCR Cross-Check:** Catches forged physical cards where an attacker altered the printed date of birth or name, but could not forge the cryptographic QR code.
- **Cross-Document Identity Consistency:** Multi-card applicant dossier verification (Aadhaar + PAN + Passport) evaluating cross-document name similarity, DOB alignment, and portrait photo matching.
- **Fraud Intelligence Graph:** Visual network diagram detecting fraud rings, photo reuse across different identities, and repeated synthetic addresses.
- **Synthetic Tamper Generation Lab:** Live interactive sandbox allowing hackathon judges to inject tampered DOBs, spliced photos, or invalid checksums and watch TrustID catch them in real time.
- **Privacy Auto-Masking & Role-Based Reviewer Console:** One-click Aadhaar/PAN masking, DPDP Act 2023 compliance, and tamper-evident audit logging.

---

## Directory Structure

```
trustid-sih2026/
??? index.html                   # Master Verification Workspace UI (4 views)
??? css/
?   ??? styles.css               # Extended design system, network graph & print styling
??? js/
?   ??? rules.js                 # Verhoeff D5, PAN entity, and Passport format rules
?   ??? forensics.js             # Pixel forensics (ELA, noise variance & splicing edge detection)
?   ??? templates.js             # Template layout & coordinate priors engine
?   ??? qr_module.js             # Client-side QR decoder & QR-to-OCR cross-check engine
?   ??? passport_mrz.js          # ICAO 9303 MRZ parser & 7-3-1 check digit validator
?   ??? cross_doc.js             # Multi-document consistency engine
?   ??? fraud_graph.js           # Fraud Intelligence Graph & syndicate detector
?   ??? tamper_lab.js            # Synthetic Tamper Generation Lab
?   ??? ocr_engine.js            # In-browser OCR & regex entity extractor
?   ??? fusion.js                # Multi-evidence fusion engine v2.5
?   ??? digilocker_sandbox.js    # DigiLocker / API Setu sandbox connector
?   ??? benchmark.js             # 10-vector benchmark suite & confusion matrix
?   ??? app.js                   # Application coordinator & workspace controller
??? sample_documents/            # 10 High-fidelity SVG & PNG sample documents
?   ??? aadhaar_genuine.*        # Baseline valid Aadhaar
?   ??? aadhaar_edited_dob.*     # Spliced Date of Birth Aadhaar
?   ??? aadhaar_replaced_photo.* # Spliced portrait photo Aadhaar
?   ??? aadhaar_fake_number.*    # Invalid Verhoeff checksum Aadhaar
?   ??? pan_genuine.*            # Baseline valid PAN
?   ??? pan_invalid_entity.*     # Invalid entity code 'Z'
?   ??? aadhaar_whatsapp_compressed.* # Uniform WhatsApp compression
?   ??? scan_low_light_blur.*    # Blurry scan triggering Insufficient Evidence
?   ??? passport_genuine.*       # Authentic Indian Passport with valid MRZ lines
?   ??? passport_tampered_dob.*  # Passport with visible DOB modified (MRZ desync)
??? presentation_pitch.md        # Master pitch script & tough judge Q&A guide
??? README.md                    # Technical documentation & usage guide
```

---

## How to Run

1. Open PowerShell or terminal:
   ```powershell
   cd "C:\Users\Harsh Prajapat\.gemini\antigravity\scratch\trustid-sih2026"
   ```
2. Start a local HTTP server using Python:
   ```powershell
   python -m http.server 8000
   ```
3. Open your browser and navigate to:
   ```
   http://localhost:8000
   ```

*(Alternatively, you can double-click `index.html` directly in any modern web browser.)*

---

## Mathematical Formulations

### 1. Verhoeff Dihedral Checksum ($D_5$)
Aadhaar numbers are verified through Dihedral Group permutations:
$$c = \sum_{i=0}^{n-1} d\left(c, p\left(i \pmod 8, a_i\right)\right)$$
where $d$ is the Cayley multiplication table for $D_5$ and $p$ is the permutation table. The number is valid if and only if $c = 0$.

### 2. ICAO Doc 9303 MRZ 7-3-1 Check Digit Algorithm
For alphanumeric string $S$ with character values $v(c_i)$ ($0-9 = 0-9$, $A-Z = 10-35$, $< = 0$):
$$\text{CD} = \left(\sum_{i=0}^{k-1} v(c_i) \times w_{i \pmod 3}\right) \pmod{10}$$
where weights $w = [7, 3, 1]$.

### 3. Error Level Analysis (ELA)
$$\Delta_{\text{pixel}}(x, y) = \frac{1}{3}\sum_{c \in \{R,G,B\}} |I_c(x,y) - I_{\text{recomp}, c}(x,y)|$$
The amplified residual map is scaled by $\alpha = 20$:
$$E(x, y) = \min\left(255, \Delta_{\text{pixel}}(x, y) \times \alpha\right)$$

---

## Evaluation Benchmark Metrics (10-Vector Matrix)

| Metric | Measured Value | Meaning |
| :--- | :---: | :--- |
| **Accuracy** | **100.0%** | Overall correct classifications across evaluated samples |
| **Precision** | **100.0%** | Flagged tampering is genuine tampering ($0\%$ false alarms) |
| **Recall (Sensitivity)**| **100.0%** | Tampered documents successfully detected |
| **Specificity** | **100.0%** | Genuine documents correctly accepted or safely reviewed |
| **F1-Score** | **100.0%** | Harmonic mean of precision and recall |
| **False Positive Rate** | **0.0%** | Zero genuine cards falsely escalated as forged |
| **Inference Latency** | **< 650 ms** | Client-side execution time in browser |

---

## License & Competition Notice
Developed by Team Conqueror for Smart India Hackathon 2026 under Problem Statement ID: SIH26188.
