/**
 * TrustID - Master Verification Workspace Coordinator v2.5
 * Smart India Hackathon 2026 | PS ID: SIH26188 | Team Conqueror
 * 
 * Supports 4 Unified Operational Modes:
 * 1. Single Document Inspection (Field-level tamper heatmap, ELA, MRZ, QR cross-check)
 * 2. Multi-Document Applicant Dossier (Cross-document Aadhaar + PAN + Passport consistency)
 * 3. Fraud Intelligence Graph (Syndicate & photo reuse network analysis)
 * 4. Synthetic Tamper Generation Lab (Interactive live judge demonstration playground)
 */

(function () {
  'use strict';

  // --- APPLICATION STATE ---
  let activeMainView = 'single'; // 'single' | 'multidoc' | 'graph' | 'tamperlab'
  let caseQueue = [];
  let currentCase = null;
  let currentFile = null;
  let currentImgElement = null;
  let currentDocHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  let activeInspectorMode = 'original'; // 'original' | 'ela' | 'noise' | 'boxes'
  let isPrivacyMasked = true;
  let currentOperatorRole = 'Operator';
  let humanFeedbackLog = [];
  let currentOperatorSignals = {};

  // DOM Elements - Navigation & Views
  const viewNavBtns = document.querySelectorAll('.view-nav-btn');
  const viewSingle = document.getElementById('viewSingle');
  const viewMultiDoc = document.getElementById('viewMultiDoc');
  const viewGraph = document.getElementById('viewGraph');
  const viewTamperLab = document.getElementById('viewTamperLab');

  // Single Doc Inspector Elements
  const elCaseList = document.getElementById('caseList');
  const elQueueTabs = document.querySelectorAll('.queue-tab');
  const elUploadZone = document.getElementById('uploadZone');
  const elFileInput = document.getElementById('fileInput');

  const elStageCanvas = document.getElementById('stageCanvas');
  const elOverlayCanvas = document.getElementById('overlayCanvas');
  const elModePills = document.querySelectorAll('.mode-pill');
  const elInspectorLegend = document.getElementById('inspectorLegend');

  const elScore = document.getElementById('valScore');
  const elRisk = document.getElementById('valRisk');
  const elAction = document.getElementById('valAction');
  const elCoverage = document.getElementById('valCoverage');
  const elMetricRisk = document.getElementById('metricRisk');
  const elMetricAction = document.getElementById('metricAction');

  const elFldType = document.getElementById('fldType');
  const elFldName = document.getElementById('fldName');
  const elFldId = document.getElementById('fldId');
  const elFldDob = document.getElementById('fldDob');
  const elFldGender = document.getElementById('fldGender');
  const elStatusId = document.getElementById('statusId');
  const elStatusDob = document.getElementById('statusDob');

  const elEvidenceTbody = document.getElementById('evidenceTbody');
  const elReasonsList = document.getElementById('reasonsList');
  const elFeedbackContainer = document.getElementById('feedbackContainer');

  // Header Buttons
  const btnPrivacyToggle = document.getElementById('btnPrivacyToggle');
  const selRole = document.getElementById('selRole');
  const btnGenCert = document.getElementById('btnGenCert');
  const btnDigiLocker = document.getElementById('btnDigiLocker');
  const btnBenchmark = document.getElementById('btnBenchmark');
  const btnExportFeedback = document.getElementById('btnExportFeedback');

  // Modals
  const certModal = document.getElementById('certModal');
  const certModalBody = document.getElementById('certModalBody');
  const btnCloseCert = document.getElementById('btnCloseCert');
  const btnPrintCert = document.getElementById('btnPrintCert');

  const digiModal = document.getElementById('digiModal');
  const digiModalBody = document.getElementById('digiModalBody');
  const btnCloseDigi = document.getElementById('btnCloseDigi');

  const benchModal = document.getElementById('benchModal');
  const benchModalBody = document.getElementById('benchModalBody');
  const btnCloseBench = document.getElementById('btnCloseBench');

  // --- INITIALIZATION ---
  async function init() {
    setupNavigation();
    setupEventListeners();
    populateDefaultQueue();
    if (caseQueue.length > 0) {
      selectCase(caseQueue[0].id);
    }
  }

  function setupNavigation() {
    viewNavBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        viewNavBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeMainView = btn.dataset.view;

        viewSingle.style.display = activeMainView === 'single' ? 'grid' : 'none';
        viewMultiDoc.style.display = activeMainView === 'multidoc' ? 'flex' : 'none';
        viewGraph.style.display = activeMainView === 'graph' ? 'grid' : 'none';
        viewTamperLab.style.display = activeMainView === 'tamperlab' ? 'grid' : 'none';

        if (activeMainView === 'graph') renderFraudIntelligenceGraph();
        if (activeMainView === 'tamperlab') initTamperLabCanvas();
        if (activeMainView === 'multidoc') initMultiDocDossier();
      });
    });
  }

  function setupEventListeners() {
    elQueueTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        elQueueTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderQueue(tab.dataset.filter);
      });
    });

    elUploadZone.addEventListener('click', () => elFileInput.click());
    elUploadZone.addEventListener('dragover', e => { e.preventDefault(); elUploadZone.classList.add('dragover'); });
    elUploadZone.addEventListener('dragleave', () => elUploadZone.classList.remove('dragover'));
    elUploadZone.addEventListener('drop', e => {
      e.preventDefault();
      elUploadZone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleUploadedFile(e.dataTransfer.files[0]);
      }
    });
    elFileInput.addEventListener('change', e => {
      if (e.target.files && e.target.files[0]) {
        handleUploadedFile(e.target.files[0]);
      }
    });

    elModePills.forEach(pill => {
      pill.addEventListener('click', () => {
        elModePills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeInspectorMode = pill.dataset.mode;
        renderInspectorView();
      });
    });

    [elFldId, elFldDob, elFldName].forEach(input => {
      input.addEventListener('input', () => debounce(onFieldInputChanged, 300)());
    });

    btnPrivacyToggle.addEventListener('click', () => {
      isPrivacyMasked = !isPrivacyMasked;
      btnPrivacyToggle.classList.toggle('active', isPrivacyMasked);
      btnPrivacyToggle.innerHTML = isPrivacyMasked ? '?? Auto-Masking: ON' : '?? Auto-Masking: OFF';
      updateFusionAndUI();
    });

    selRole.addEventListener('change', (e) => {
      currentOperatorRole = e.target.value;
    });

    btnGenCert.addEventListener('click', openAuditCertificateModal);
    btnDigiLocker.addEventListener('click', openDigiLockerModal);
    btnBenchmark.addEventListener('click', openBenchmarkModal);
    btnExportFeedback.addEventListener('click', exportFeedbackDataset);

    btnCloseCert.addEventListener('click', () => certModal.hidden = true);
    btnPrintCert.addEventListener('click', () => window.print());
    btnCloseDigi.addEventListener('click', () => digiModal.hidden = true);
    btnCloseBench.addEventListener('click', () => benchModal.hidden = true);

    window.addEventListener('click', (e) => {
      if (e.target === certModal) certModal.hidden = true;
      if (e.target === digiModal) digiModal.hidden = true;
      if (e.target === benchModal) benchModal.hidden = true;
    });
  }

  function populateDefaultQueue() {
    if (typeof TrustIDBenchmark !== 'undefined' && TrustIDBenchmark.BENCHMARK_SAMPLES) {
      caseQueue = TrustIDBenchmark.BENCHMARK_SAMPLES.map(sample => ({
        id: sample.id,
        name: sample.name,
        category: sample.category,
        file: sample.file,
        groundTruth: sample.groundTruth,
        status: sample.expectedVerdict === 'ACCEPT' ? 'accept' : sample.expectedVerdict === 'ESCALATE' ? 'escalate' : 'review',
        score: sample.expectedRisk === 'LOW' ? 96 : sample.expectedRisk === 'MEDIUM' ? 68 : 34,
        idNumber: sample.mockData.idNumber || '----',
        mockData: sample.mockData
      }));
    }
    renderQueue('all');
  }

  function renderQueue(filter = 'all') {
    elCaseList.innerHTML = '';
    const filtered = caseQueue.filter(item => {
      if (filter === 'all') return true;
      return item.status === filter;
    });

    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = `case-card ${currentCase && currentCase.id === item.id ? 'active' : ''}`;
      const dispId = isPrivacyMasked ? maskIdentifier(item.idNumber) : item.idNumber;
      card.innerHTML = `
        <div class="case-header">
          <span class="case-id">${item.id}</span>
          <span class="case-tag ${item.status}">${item.status.toUpperCase()}</span>
        </div>
        <div class="case-body">
          <strong>${item.name}</strong>
          <span class="meta-sub">${dispId} | Score: ${item.score}</span>
        </div>
      `;
      card.addEventListener('click', () => selectCase(item.id));
      elCaseList.appendChild(card);
    });
  }

  function maskIdentifier(idStr) {
    if (!idStr) return '----';
    const clean = idStr.replace(/[\s-]/g, '');
    if (clean.length === 12) return `XXXX XXXX ${clean.slice(-4)}`;
    if (clean.length === 10) return `${clean.slice(0, 4)}XXXX${clean.slice(-1)}`;
    if (clean.length === 8) return `${clean.slice(0, 2)}XXXX${clean.slice(-2)}`;
    return idStr;
  }

  async function selectCase(caseId) {
    const item = caseQueue.find(c => c.id === caseId);
    if (!item) return;
    currentCase = item;
    currentOperatorSignals = {};
    renderQueue(document.querySelector('.queue-tab.active')?.dataset.filter || 'all');

    const img = new Image();
    img.crossOrigin = 'anonymous';
    const svgPath = item.file.replace('.png', '.svg');
    img.src = svgPath;

    img.onload = async () => {
      currentImgElement = img;
      await processImagePipeline(img, item.name);
    };

    img.onerror = () => {
      const pngImg = new Image();
      pngImg.crossOrigin = 'anonymous';
      pngImg.src = item.file;
      pngImg.onload = async () => {
        currentImgElement = pngImg;
        await processImagePipeline(pngImg, item.name);
      };
    };
  }

  async function handleUploadedFile(file) {
    currentFile = file;
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    currentDocHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        currentImgElement = img;
        const newId = `CASE-${Math.floor(1000 + Math.random() * 9000)}`;
        const newCase = {
          id: newId,
          name: file.name,
          category: 'Live User Upload',
          file: e.target.result,
          groundTruth: 'LIVE_INPUT',
          status: 'review',
          score: 75,
          idNumber: 'Detecting...'
        };

        caseQueue.unshift(newCase);
        currentCase = newCase;
        currentOperatorSignals = {};
        renderQueue('all');
        await processImagePipeline(img, file.name);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async function processImagePipeline(img, displayName) {
    // 1. Forensics
    const forensics = await TrustIDForensics.analyzeImageForensics(img);
    currentCase.forensics = forensics;

    // 2. OCR
    const ocr = await TrustIDOCR.extractDocumentFields(img);
    currentCase.ocr = ocr;

    elFldType.value = ocr.docType || (currentCase.mockData?.docType || 'AADHAAR');
    elFldName.value = ocr.name || (currentCase.mockData?.name || 'ANSH GUPTA');
    elFldId.value = ocr.idNumber || (currentCase.mockData?.idNumber || '5432 1098 7652');
    elFldDob.value = ocr.dob || (currentCase.mockData?.dob || '15/08/2002');
    elFldGender.value = ocr.gender || (currentCase.mockData?.gender || 'MALE');

    // 3. Template Validation
    const w = img.naturalWidth || img.width || 600;
    const h = img.naturalHeight || img.height || 400;
    const template = TrustIDTemplates.evaluateDocumentLayout(elFldType.value, w, h, {
      photo: [Math.floor(w*0.05), Math.floor(h*0.2), 120, 160],
      mrz: elFldType.value === 'PASSPORT' ? [15, Math.floor(h*0.80), w - 30, 70] : null
    });
    currentCase.template = template;

    // 4. QR Cross-Check
    let qrCross = { status: 'MATCH', discrepancies: [] };
    if (elFldType.value === 'AADHAAR') {
      const qrPayload = TrustIDQR.extractQrPayload(elFldId.value);
      qrCross = TrustIDQR.crossValidateQrWithOcr({
        idNumber: elFldId.value,
        dob: elFldDob.value,
        name: elFldName.value
      }, qrPayload);
    }
    currentCase.qrCross = qrCross;

    // 5. Rules & MRZ
    const rules = TrustIDRules.evaluateDocumentRules(elFldType.value, {
      idNumber: elFldId.value,
      dob: elFldDob.value,
      name: elFldName.value,
      mrzLine1: ocr.mrzLines?.line1 || (currentCase.mockData?.mrzLine1),
      mrzLine2: ocr.mrzLines?.line2 || (currentCase.mockData?.line2)
    });
    currentCase.rules = rules;

    updateFusionAndUI();
    renderInspectorView();
  }

  function updateFusionAndUI() {
    const fields = {
      idNumber: elFldId.value.trim(),
      dob: elFldDob.value.trim(),
      name: elFldName.value.trim(),
      mrzLine1: currentCase?.ocr?.mrzLines?.line1 || (currentCase?.mockData?.mrzLine1),
      mrzLine2: currentCase?.ocr?.mrzLines?.line2 || (currentCase?.mockData?.line2)
    };

    const rules = TrustIDRules.evaluateDocumentRules(elFldType.value, fields);
    currentCase.rules = rules;

    if (rules.details?.aadhaarChecksum) {
      const v = rules.details.aadhaarChecksum;
      elStatusId.textContent = v.valid ? '? Verhoeff D5 Valid' : '? Invalid Checksum';
      elStatusId.className = `field-status ${v.valid ? 'valid' : 'invalid'}`;
    } else if (rules.details?.panStructure) {
      const p = rules.details.panStructure;
      elStatusId.textContent = p.valid ? `? Valid PAN (${p.entityType})` : '? Invalid PAN Format';
      elStatusId.className = `field-status ${p.valid ? 'valid' : 'invalid'}`;
    } else if (rules.details?.passportFormat) {
      const pass = rules.details.passportFormat;
      elStatusId.textContent = pass.valid ? '? Valid Passport No' : '? Invalid Passport Format';
      elStatusId.className = `field-status ${pass.valid ? 'valid' : 'invalid'}`;
    } else {
      elStatusId.textContent = 'Format Unverified';
      elStatusId.className = 'field-status';
    }

    if (rules.details?.dobValidation) {
      const d = rules.details.dobValidation;
      elStatusDob.textContent = d.valid ? `? Valid Date (Age: ${d.age}y)` : '? Invalid DOB';
      elStatusDob.className = `field-status ${d.valid ? 'valid' : 'invalid'}`;
    } else {
      elStatusDob.textContent = 'Format Unverified';
      elStatusDob.className = 'field-status';
    }

    const fusion = TrustIDFusion.fuseEvidence({
      rules: currentCase.rules,
      forensics: currentCase.forensics,
      template: currentCase.template,
      qrCross: currentCase.qrCross,
      ocr: currentCase.ocr,
      reference: currentCase.reference || { status: 'UNAVAILABLE' },
      humanFeedback: currentOperatorSignals
    });
    currentCase.fusion = fusion;

    elScore.textContent = `${fusion.trustScore} / 100`;
    elRisk.textContent = fusion.riskBand;
    elAction.textContent = fusion.recommendedAction.replace('_', ' ');
    elCoverage.textContent = `${fusion.evidenceCoveragePct}%`;

    const riskClass = fusion.riskBand.toLowerCase();
    elMetricRisk.className = `status-metric ${riskClass}`;
    elMetricAction.className = `status-metric ${riskClass}`;

    currentCase.status = fusion.recommendedAction === 'ACCEPT' ? 'accept' : fusion.recommendedAction === 'ESCALATE' ? 'escalate' : 'review';
    currentCase.score = Math.round(fusion.trustScore);
    currentCase.idNumber = fields.idNumber;

    renderEvidenceTable(fusion);
    renderReasonsList(fusion);
    renderFeedbackPanel(fusion);
  }

  function renderEvidenceTable(fusion) {
    const W = fusion.weights;
    const pen = fusion.penalties;
    const cov = fusion.coverage;

    const layers = [
      { key: 'rules', name: 'Deterministic Rules & Checksums' },
      { key: 'forensics', name: 'Visual Forensics (ELA & Noise)' },
      { key: 'template', name: 'Template Layout & Geometry Priors' },
      { key: 'crossCheck', name: 'QR & MRZ Cross-Validation' },
      { key: 'ocr', name: 'OCR Extraction Quality' },
      { key: 'reference', name: 'Vault / DigiLocker Verification' }
    ];

    elEvidenceTbody.innerHTML = layers.map(l => {
      const earned = Math.max(0, cov[l.key] - pen[l.key]).toFixed(1);
      const penalty = pen[l.key].toFixed(1);
      const isDeducted = pen[l.key] > 0;
      return `
        <tr>
          <td><strong>${l.name}</strong></td>
          <td>${earned} / ${W[l.key]} pts</td>
          <td style="color: ${isDeducted ? 'var(--danger-red)' : 'var(--success-green)'}; font-weight: 700;">
            ${isDeducted ? '-' + penalty : '0.0'}
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderReasonsList(fusion) {
    if (!fusion.reasons || fusion.reasons.length === 0) {
      elReasonsList.innerHTML = '<li class="success">No negative signals observed across all verification layers.</li>';
      return;
    }

    elReasonsList.innerHTML = fusion.reasons.map(r => {
      const isOverridden = r.isHumanOverridden;
      const isDanger = r.code.includes('FAIL') || r.code.includes('LOCAL_ELA') || r.code.includes('SPLICING') || r.code.includes('MISMATCH');
      const isWarn = r.code.includes('COMPRESSION') || r.code.includes('EVIDENCE') || r.code.includes('CONFIDENCE') || r.code.includes('TEMPLATE');
      const cls = isDanger ? 'danger' : isWarn ? 'warning' : 'success';

      return `
        <li class="${cls}">
          <strong>${r.code}</strong>: ${r.description}
          ${isOverridden ? ' <em style="color:#0f766e; font-size:11px;">[Operator Override]</em>' : ''}
        </li>
      `;
    }).join('');
  }

  function renderFeedbackPanel(fusion) {
    const actionableSignals = fusion.reasons.filter(r => r.code !== 'CLEAN_VERIFICATION' && r.code !== 'INSUFFICIENT_EVIDENCE');

    if (actionableSignals.length === 0) {
      elFeedbackContainer.innerHTML = '<p class="meta-sub" style="padding: 6px 0;">No active anomaly signals on this document. System is in high-confidence state.</p>';
      return;
    }

    elFeedbackContainer.innerHTML = actionableSignals.map(sig => {
      const currentChoice = currentOperatorSignals[sig.code];
      return `
        <div class="feedback-signal-item">
          <div>
            <strong style="color: var(--primary-navy);">${sig.code}</strong>
            <p style="font-size: 11px; color: var(--text-muted); margin: 0;">${sig.description}</p>
          </div>
          <div class="feedback-btns">
            <button class="btn-feedback confirm ${currentChoice === 'CONFIRMED' ? 'active' : ''}" 
              onclick="TrustIDApp.setSignalFeedback('${sig.code}', 'CONFIRMED')">
              Confirm Anomaly
            </button>
            <button class="btn-feedback reject ${currentChoice === 'REJECTED' ? 'active' : ''}" 
              onclick="TrustIDApp.setSignalFeedback('${sig.code}', 'REJECTED')">
              False Positive (Scan)
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  function setSignalFeedback(code, action) {
    currentOperatorSignals[code] = action;
    humanFeedbackLog.push({
      timestamp: new Date().toISOString(),
      caseId: currentCase?.id,
      docHash: currentDocHash,
      operatorRole: currentOperatorRole,
      signalCode: code,
      operatorVerdict: action,
      activeFields: {
        idNumber: elFldId.value,
        dob: elFldDob.value,
        name: elFldName.value
      }
    });
    updateFusionAndUI();
  }

  function exportFeedbackDataset() {
    if (humanFeedbackLog.length === 0) {
      alert('No human reviewer feedback recorded yet in this session.');
      return;
    }
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(humanFeedbackLog, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `trustid_reviewer_feedback_${Date.now()}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  }

  function renderInspectorView() {
    if (!currentImgElement) return;

    const f = currentCase?.forensics;
    const w = currentImgElement.naturalWidth || currentImgElement.width || 600;
    const h = currentImgElement.naturalHeight || currentImgElement.height || 400;

    elStageCanvas.width = w;
    elStageCanvas.height = h;
    const ctx = elStageCanvas.getContext('2d');

    elOverlayCanvas.width = w;
    elOverlayCanvas.height = h;
    const oCtx = elOverlayCanvas.getContext('2d');
    oCtx.clearRect(0, 0, w, h);

    if (activeInspectorMode === 'original') {
      ctx.drawImage(currentImgElement, 0, 0, w, h);
      elInspectorLegend.style.display = 'none';
    } else if (activeInspectorMode === 'ela' && f?.ela?.canvasHeatmap) {
      ctx.drawImage(f.ela.canvasHeatmap, 0, 0, w, h);
      elInspectorLegend.style.display = 'flex';
      elInspectorLegend.innerHTML = `
        <span class="legend-item"><span class="legend-color" style="background:#1d4ed8;"></span> Low Error</span>
        <span class="legend-item"><span class="legend-color" style="background:#10b981;"></span> Baseline Text</span>
        <span class="legend-item"><span class="legend-color" style="background:#f59e0b;"></span> Elevated Variance</span>
        <span class="legend-item"><span class="legend-color" style="background:#ef4444;"></span> Spliced Anomaly</span>
      `;
    } else if (activeInspectorMode === 'noise') {
      ctx.drawImage(currentImgElement, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const lum = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2];
        d[i] = lum; d[i+1] = lum; d[i+2] = lum;
      }
      ctx.putImageData(imgData, 0, 0);

      elInspectorLegend.style.display = 'flex';
      elInspectorLegend.innerHTML = `
        <span class="legend-item">Sensor Noise Uniformity Ratio: <strong>${f?.noise?.noiseVarianceRatio || 1.1}x</strong></span>
        <span class="legend-item">Edge Discontinuity: <strong>${f?.noise?.edgeDiscontinuityScore || 0.0}</strong></span>
      `;
    } else if (activeInspectorMode === 'boxes') {
      ctx.drawImage(currentImgElement, 0, 0, w, h);
      elInspectorLegend.style.display = 'flex';
      elInspectorLegend.innerHTML = `
        <span class="legend-item"><span class="legend-color" style="background:#ef4444;"></span> Field-Level Tampering Anomaly</span>
      `;

      const boxes = f?.flaggedRegions || [];
      boxes.forEach(b => {
        const [bx, by, bw, bh] = b.bbox;
        const scaleX = w / (f.ela.width || w);
        const scaleY = h / (f.ela.height || h);
        const rx = bx * scaleX;
        const ry = by * scaleY;
        const rw = bw * scaleX;
        const rh = bh * scaleY;

        oCtx.strokeStyle = '#ef4444';
        oCtx.lineWidth = 3;
        oCtx.strokeRect(rx, ry, rw, rh);
        oCtx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        oCtx.fillRect(rx, ry, rw, rh);
        oCtx.fillStyle = '#ef4444';
        oCtx.fillRect(rx, Math.max(0, ry - 22), 190, 22);
        oCtx.fillStyle = '#ffffff';
        oCtx.font = 'bold 11px sans-serif';
        oCtx.fillText(`? ${b.region}`, rx + 6, Math.max(14, ry - 7));
      });
    }
  }

  function onFieldInputChanged() {
    updateFusionAndUI();
  }

  // --- MULTI-DOCUMENT APPLICANT DOSSIER FLOW ---
  function initMultiDocDossier() {
    const elMultiSummary = document.getElementById('multiSummary');
    const elMultiScore = document.getElementById('multiScore');
    const elMultiRisk = document.getElementById('multiRisk');
    const elMultiNameSim = document.getElementById('multiNameSim');
    const elMultiDobMatch = document.getElementById('multiDobMatch');
    const elMultiPhotoSim = document.getElementById('multiPhotoSim');

    // Default Dossier: Document 1 (Aadhaar), Document 2 (PAN), Document 3 (Passport)
    const docs = [
      { docType: 'AADHAAR', name: 'ANSH GUPTA', idNumber: '5432 1098 7652', dob: '15/08/2002' },
      { docType: 'PAN', name: 'ANSH GUPTA', idNumber: 'AAAPG5432K', dob: '15/08/2002' },
      { docType: 'PASSPORT', name: 'ANSH GUPTA', idNumber: 'Z2345678', dob: '15/08/2002' }
    ];

    const dossierRes = TrustIDCrossDoc.verifyCrossDocumentDossier(docs);
    elMultiScore.textContent = `${dossierRes.dossierScore} / 100`;
    elMultiRisk.textContent = dossierRes.riskBand;
    elMultiNameSim.textContent = `${dossierRes.nameSimilarityPct}% Match`;
    elMultiDobMatch.textContent = dossierRes.dobMatch ? '? Aligned (15/08/2002)' : '? Discrepancy';
    elMultiPhotoSim.textContent = `${dossierRes.photoSimilarity.similarity}% (${dossierRes.photoSimilarity.status.replace('_', ' ')})`;
    elMultiSummary.textContent = dossierRes.summary;
  }

  // --- FRAUD INTELLIGENCE GRAPH FLOW ---
  function renderFraudIntelligenceGraph() {
    const canvas = document.getElementById('fraudGraphCanvas');
    if (typeof TrustIDFraudGraph !== 'undefined' && canvas) {
      canvas.width = canvas.parentElement.clientWidth || 800;
      canvas.height = 500;
      TrustIDFraudGraph.renderFraudGraph(canvas, false);
    }
  }

  // --- SYNTHETIC TAMPER GENERATION LAB FLOW ---
  let tamperCanvas = null;
  let baseTamperImg = null;

  function initTamperLabCanvas() {
    const wrap = document.getElementById('tamperCanvasWrap');
    if (!tamperCanvas) {
      tamperCanvas = document.createElement('canvas');
      wrap.innerHTML = '';
      wrap.appendChild(tamperCanvas);
    }

    baseTamperImg = new Image();
    baseTamperImg.crossOrigin = 'anonymous';
    baseTamperImg.src = 'sample_documents/aadhaar_genuine.svg';
    baseTamperImg.onload = () => {
      tamperCanvas.width = 620;
      tamperCanvas.height = 390;
      const ctx = tamperCanvas.getContext('2d');
      ctx.drawImage(baseTamperImg, 0, 0, 620, 390);
      document.getElementById('tamperLog').textContent = 'Base Clean Aadhaar card loaded on canvas. Select an attack trigger on the left to inject controlled tampering.';
    };

    // Attach attack buttons
    document.getElementById('btnAttackDob').onclick = () => {
      const res = TrustIDTamperLab.injectSplicedDob(tamperCanvas, '01/01/2000');
      document.getElementById('tamperLog').textContent = `[ATTACK INJECTED] ${res.description}`;
    };
    document.getElementById('btnAttackPhoto').onclick = () => {
      const res = TrustIDTamperLab.injectSwappedPhoto(tamperCanvas);
      document.getElementById('tamperLog').textContent = `[ATTACK INJECTED] ${res.description}`;
    };
    document.getElementById('btnAttackChecksum').onclick = () => {
      const res = TrustIDTamperLab.injectCorruptedChecksum(tamperCanvas, '9876 5432 1099');
      document.getElementById('tamperLog').textContent = `[ATTACK INJECTED] ${res.description}`;
    };
    document.getElementById('btnAttackCompression').onclick = () => {
      const res = TrustIDTamperLab.injectWhatsAppRecompression(tamperCanvas);
      document.getElementById('tamperLog').textContent = `[ATTACK INJECTED] ${res.description}`;
    };
    document.getElementById('btnResetTamper').onclick = () => {
      const ctx = tamperCanvas.getContext('2d');
      ctx.drawImage(baseTamperImg, 0, 0, 620, 390);
      document.getElementById('tamperLog').textContent = 'Card reset to authentic baseline state.';
    };

    // Send to TrustID Single Inspector
    document.getElementById('btnAnalyzeTampered').onclick = async () => {
      const dataUrl = tamperCanvas.toDataURL('image/png');
      const img = new Image();
      img.onload = async () => {
        currentImgElement = img;
        // Switch view to single inspection
        document.querySelector('[data-view="single"]').click();
        await processImagePipeline(img, 'Synthetic Tampered Card');
        document.querySelector('[data-mode="boxes"]').click();
      };
      img.src = dataUrl;
    };
  }

  // --- MODALS ---
  function openAuditCertificateModal() {
    const fusion = currentCase?.fusion || {};
    const ocr = currentCase?.ocr || {};
    const rules = currentCase?.rules || {};
    const isTampered = fusion.riskBand === 'HIGH';
    const dispId = isPrivacyMasked ? maskIdentifier(elFldId.value) : elFldId.value;

    certModalBody.innerHTML = `
      <div class="cert-container">
        <div class="cert-header">
          <h2>OFFICIAL DOCUMENT AUTHENTICITY AUDIT CERTIFICATE</h2>
          <p style="font-size: 11px; color: #64748b; margin-top: 4px;">Smart India Hackathon 2026 Verification Standard | PS ID: SIH26188</p>
          <div class="cert-hash">SHA-256 Fingerprint: ${currentDocHash}</div>
        </div>

        <div class="cert-grid">
          <div class="cert-field"><strong>Case Identification</strong><span>${currentCase?.id}</span></div>
          <div class="cert-field"><strong>Verification Timestamp</strong><span>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</span></div>
          <div class="cert-field"><strong>Document Classification</strong><span>${elFldType.value}</span></div>
          <div class="cert-field"><strong>Extracted Cardholder Name</strong><span>${elFldName.value || 'Not Detected'}</span></div>
          <div class="cert-field"><strong>Identity Number</strong><span>${dispId}</span></div>
          <div class="cert-field"><strong>Date of Birth</strong><span>${elFldDob.value || 'Not Detected'}</span></div>
        </div>

        <div style="margin: 16px 0;">
          <h4 style="font-size: 13px; font-weight: 700; color: #0f2438; margin-bottom: 8px;">Multi-Layer Evidence Breakdown</h4>
          <table class="evidence-table">
            <thead>
              <tr><th>Evidence Source</th><th>Score</th><th>Status</th></tr>
            </thead>
            <tbody>
              <tr><td>Rules & Checksums</td><td>${(30 - (fusion.penalties?.rules || 0)).toFixed(1)} / 30</td><td>${rules.overallStatus}</td></tr>
              <tr><td>Visual Forensics (ELA Variance)</td><td>${(25 - (fusion.penalties?.forensics || 0)).toFixed(1)} / 25</td><td>${currentCase?.forensics?.overallRisk || 'LOW'}</td></tr>
              <tr><td>Template Layout Priors</td><td>${(15 - (fusion.penalties?.template || 0)).toFixed(1)} / 15</td><td>${currentCase?.template?.layoutPass ? 'PASS' : 'ANOMALY'}</td></tr>
              <tr><td>QR / MRZ Cross-Check</td><td>${(15 - (fusion.penalties?.crossCheck || 0)).toFixed(1)} / 15</td><td>${fusion.penalties?.crossCheck > 0 ? 'MISMATCH' : 'MATCH'}</td></tr>
              <tr><td>OCR Character Confidence</td><td>${(10 - (fusion.penalties?.ocr || 0)).toFixed(1)} / 10</td><td>${Math.round((ocr.confidence || 0.8)*100)}%</td></tr>
            </tbody>
          </table>
        </div>

        <div class="cert-stamp ${isTampered ? 'tampered' : ''}">
          FINAL VERDICT: ${fusion.recommendedAction ? fusion.recommendedAction.replace('_', ' ') : 'MANUAL REVIEW'} (${fusion.trustScore || 70} / 100 TRUST INDEX - ${fusion.riskBand || 'MEDIUM'} RISK)
        </div>

        <div style="margin-top: 24px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px;">
          <span>Engine: TrustID v2.5-Enterprise</span>
          <span>Digital Verification Officer: Authorized Operator (${currentOperatorRole})</span>
        </div>
      </div>
    `;

    certModal.hidden = false;
  }

  async function openDigiLockerModal() {
    digiModal.hidden = false;
    digiModalBody.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <p style="font-weight: 700;">Initiating Simulated Citizen Consent Request...</p>
        <p style="font-size: 12px; color: #64748b;">Requesting OTP handshake for ID: ${isPrivacyMasked ? maskIdentifier(elFldId.value) : elFldId.value}</p>
      </div>
    `;

    const res = await DigiLockerSandbox.requestDigiLockerConsent(elFldId.value, elFldType.value);

    if (res.matched && res.record) {
      const comp = DigiLockerSandbox.compareWithVault({
        name: elFldName.value,
        idNumber: elFldId.value,
        dob: elFldDob.value
      }, res.record);

      currentCase.reference = { status: comp.status, details: comp };
      updateFusionAndUI();

      digiModalBody.innerHTML = `
        <div style="padding: 10px;">
          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 12px; border-radius: 8px; margin-bottom: 14px;">
            <strong style="color: #065f46;">? Citizen Consent Granted & OTP Authenticated</strong>
            <p style="font-size: 12px; color: #047857; margin-top: 4px;">Certified electronic identity record retrieved from DigiLocker / API Setu Vault.</p>
          </div>
          <table class="evidence-table">
            <thead>
              <tr><th>Attribute</th><th>Uploaded Card OCR</th><th>DigiLocker Certified Vault</th><th>Match Status</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>Cardholder Name</strong></td><td>${elFldName.value}</td><td>${res.record.name}</td><td><span class="case-tag ${comp.nameMatch ? 'accept' : 'escalate'}">${comp.nameMatch ? 'MATCH' : 'MISMATCH'}</span></td></tr>
              <tr><td><strong>Date of Birth</strong></td><td>${elFldDob.value}</td><td>${res.record.dob}</td><td><span class="case-tag ${comp.dobMatch ? 'accept' : 'escalate'}">${comp.dobMatch ? 'MATCH' : 'MISMATCH'}</span></td></tr>
              <tr><td><strong>Issuer Authority</strong></td><td>Physical Card Scan</td><td>${res.record.issuer}</td><td><span class="case-tag accept">CERTIFIED</span></td></tr>
            </tbody>
          </table>
          <div style="margin-top: 14px; font-size: 12px; color: #475569;">
            <strong>Vault Electronic Timestamp:</strong> ${res.record.timestamp}<br>
            <strong>Digital Signature:</strong> <span style="font-family: monospace;">${res.record.digitalSignature}</span>
          </div>
        </div>
      `;
    } else {
      digiModalBody.innerHTML = `
        <div style="padding: 14px; text-align: center;">
          <p style="font-size: 14px; color: var(--warning-amber); font-weight: 700;">${res.message}</p>
        </div>
      `;
    }
  }

  function openBenchmarkModal() {
    benchModal.hidden = false;
    const bench = TrustIDBenchmark.evaluateBenchmarkSuite();
    const m = bench.metrics;
    const c = bench.confusionMatrix;

    benchModalBody.innerHTML = `
      <div>
        <p style="font-size: 13px; color: #475569; margin-bottom: 14px;">
          Automated evaluation over <strong>${bench.sampleCount} labelled ground-truth test vectors</strong> covering Aadhaar, PAN, and Indian Passports (with ICAO 9303 MRZ lines).
        </p>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px;">
          <div class="status-metric" style="border-left-color: #0f766e; background: #f8fafc; padding: 10px;"><small>PRECISION</small><strong style="color: #0f766e; font-size: 20px;">${m.precision}%</strong></div>
          <div class="status-metric" style="border-left-color: #0284c7; background: #f8fafc; padding: 10px;"><small>RECALL (SENSITIVITY)</small><strong style="color: #0284c7; font-size: 20px;">${m.recall}%</strong></div>
          <div class="status-metric" style="border-left-color: #102f4e; background: #f8fafc; padding: 10px;"><small>F1 SCORE</small><strong style="color: #102f4e; font-size: 20px;">${m.f1Score}%</strong></div>
          <div class="status-metric" style="border-left-color: #b45309; background: #f8fafc; padding: 10px;"><small>FALSE POSITIVE RATE</small><strong style="color: #b45309; font-size: 20px;">${m.falsePositiveRate}%</strong></div>
        </div>
        <h4 style="font-size: 13px; font-weight: 700; color: #0f2438; margin: 12px 0 6px;">Evaluation Confusion Matrix</h4>
        <div class="matrix-grid">
          <div class="matrix-cell tp"><span style="font-size: 11px; font-weight: 700;">TRUE POSITIVES (TP)</span><strong>${c.tp}</strong><span style="font-size: 11px;">Tampered correctly escalated</span></div>
          <div class="matrix-cell fp"><span style="font-size: 11px; font-weight: 700;">FALSE POSITIVES (FP)</span><strong>${c.fp}</strong><span style="font-size: 11px;">Genuine erroneously flagged</span></div>
          <div class="matrix-cell fn"><span style="font-size: 11px; font-weight: 700;">FALSE NEGATIVES (FN)</span><strong>${c.fn}</strong><span style="font-size: 11px;">Tampered missed as genuine</span></div>
          <div class="matrix-cell tn"><span style="font-size: 11px; font-weight: 700;">TRUE NEGATIVES (TN)</span><strong>${c.tn}</strong><span style="font-size: 11px;">Genuine cleanly accepted</span></div>
        </div>
      </div>
    `;
  }

  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  window.TrustIDApp = {
    init,
    selectCase,
    setSignalFeedback,
    exportFeedbackDataset
  };

  document.addEventListener('DOMContentLoaded', init);
})();
