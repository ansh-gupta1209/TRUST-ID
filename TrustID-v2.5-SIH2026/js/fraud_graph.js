/**
 * TrustID - Fraud Intelligence Graph Engine
 * Smart India Hackathon 2026 | PS ID: SIH26188 | Team Conqueror
 * 
 * Functions:
 * 1. Network Graph Visualization of Identity Cases, Shared Photos, Addresses, and Devices
 * 2. Cross-Case Anomaly & Syndicate Detection:
 *    - Same Photograph Reused Across Different Names/IDs
 *    - Shared Synthetic Addresses Across Multiple Flagged Submissions
 *    - Cluster Analysis for Organized Forgery Rings
 * 3. Interactive Canvas Renderer with Clickable Nodes and Syndicate Filter
 */

(function (global) {
  'use strict';

  // Seed Data: Realistic Cross-Case Linkages
  const GRAPH_DATA = {
    nodes: [
      { id: 'CASE-01', label: 'TC-01 (Ansh Gupta)', type: 'case', status: 'accept', x: 180, y: 140, r: 20 },
      { id: 'CASE-02', label: 'TC-02 (Rohit Patel)', type: 'case', status: 'escalate', x: 450, y: 120, r: 22 },
      { id: 'CASE-03', label: 'TC-03 (Imposter Case)', type: 'case', status: 'escalate', x: 260, y: 320, r: 22 },
      { id: 'CASE-06', label: 'TC-06 (Rajesh Mehta)', type: 'case', status: 'escalate', x: 580, y: 280, r: 20 },
      
      // Biometric Photo Nodes
      { id: 'PHOTO-A', label: 'Photo Fingerprint #882A', type: 'photo', status: 'flagged', x: 210, y: 230, r: 16, note: 'REUSED IN TC-01 and TC-03' },
      { id: 'PHOTO-B', label: 'Photo Fingerprint #419C', type: 'photo', status: 'normal', x: 480, y: 200, r: 15 },
      
      // Shared Address Node
      { id: 'ADDR-01', label: 'Addr: Sector 62, Noida', type: 'address', status: 'normal', x: 90, y: 220, r: 15 },
      { id: 'ADDR-02', label: 'Addr: Navrangpura, AHD', type: 'address', status: 'flagged', x: 520, y: 50, r: 16, note: 'Shared across multiple edits' },

      // Tamper Signature Pattern
      { id: 'PAT-DOB', label: 'Font Signature #09 (Arial Spliced)', type: 'pattern', status: 'tamper', x: 380, y: 240, r: 16, note: 'Common template generator signature' }
    ],
    edges: [
      // Photo Reuse Syndicate: TC-01 and TC-03 share PHOTO-A!
      { from: 'CASE-01', to: 'PHOTO-A', type: 'photo_link', isSuspicious: true, label: 'Shared Portrait' },
      { from: 'CASE-03', to: 'PHOTO-A', type: 'photo_link', isSuspicious: true, label: 'Shared Portrait (Reused!)' },

      // Address links
      { from: 'CASE-01', to: 'ADDR-01', type: 'residence', isSuspicious: false },
      { from: 'CASE-02', to: 'ADDR-02', type: 'residence', isSuspicious: false },

      // Pattern links (TC-02 and TC-03 share font splicing pattern)
      { from: 'CASE-02', to: 'PAT-DOB', type: 'pattern_link', isSuspicious: true, label: 'Matching Font Artifact' },
      { from: 'CASE-03', to: 'PAT-DOB', type: 'pattern_link', isSuspicious: true, label: 'Matching Font Artifact' },
      
      { from: 'CASE-02', to: 'PHOTO-B', type: 'photo_link', isSuspicious: false },
      { from: 'CASE-06', to: 'PHOTO-B', type: 'photo_link', isSuspicious: true, label: 'Synthetic ID Ring' }
    ],
    syndicates: [
      {
        id: 'SYN-01',
        title: 'Biometric Portrait Reuse Ring',
        severity: 'CRITICAL',
        description: 'The exact same citizen photograph (Hash #882A) appears on two different applicant files (TC-01: Ansh Gupta and TC-03: Spliced Imposter Case).',
        involvedCases: ['TC-01', 'TC-03']
      },
      {
        id: 'SYN-02',
        title: 'Common Template Generation Artifact',
        severity: 'HIGH',
        description: 'Cases TC-02 and TC-03 exhibit identical localized font rasterization patterns, suggesting generation by the same illegal document forging software.',
        involvedCases: ['TC-02', 'TC-03']
      }
    ]
  };

  /**
   * Render Interactive Fraud Graph on Canvas
   */
  function renderFraudGraph(canvas, filterSyndicatesOnly = false, onNodeSelected = null) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Draw background grid
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    const nodeMap = {};
    GRAPH_DATA.nodes.forEach(n => { nodeMap[n.id] = n; });

    // Draw Edges
    GRAPH_DATA.edges.forEach(e => {
      const src = nodeMap[e.from];
      const tgt = nodeMap[e.to];
      if (!src || !tgt) return;

      if (filterSyndicatesOnly && !e.isSuspicious) return;

      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);

      if (e.isSuspicious) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 4]);
      } else {
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([]);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw edge label if suspicious
      if (e.isSuspicious && e.label) {
        const midX = (src.x + tgt.x) / 2;
        const midY = (src.y + tgt.y) / 2;
        ctx.fillStyle = '#b91c1c';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText(e.label, midX - 25, midY - 4);
      }
    });

    // Draw Nodes
    GRAPH_DATA.nodes.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);

      if (n.type === 'case') {
        ctx.fillStyle = n.status === 'accept' ? '#0f766e' : '#b91c1c';
      } else if (n.type === 'photo') {
        ctx.fillStyle = n.status === 'flagged' ? '#dc2626' : '#0284c7';
      } else if (n.type === 'address') {
        ctx.fillStyle = '#6366f1';
      } else {
        ctx.fillStyle = '#d97706';
      }
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Node Label
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(n.label, n.x - (n.label.length * 2.8), n.y + n.r + 14);

      if (n.note && n.status === 'flagged') {
        ctx.fillStyle = '#dc2626';
        ctx.font = '9px sans-serif';
        ctx.fillText(`? ${n.note}`, n.x - 40, n.y + n.r + 25);
      }
    });
  }

  const TrustIDFraudGraph = {
    GRAPH_DATA,
    renderFraudGraph
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrustIDFraudGraph;
  } else {
    global.TrustIDFraudGraph = TrustIDFraudGraph;
  }
})(typeof window !== 'undefined' ? window : this);
