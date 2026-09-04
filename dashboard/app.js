/**
 * AegisLink Command Portal & Twin Consoles
 * Interactive Application Logic & State Engine
 */

(function () {
  'use strict';

  // --- APPLICATION STATE ---
  const state = {
    currentScreen: 'auth', // 'auth' | 'hospital' | 'finance'
    selectedRole: 'hospital', // 'hospital' | 'finance'
    incidentId: '#CR-8821',
    sharedPatient: {
      name: 'Murugan K.',
      fleet: 'Zomato Partner',
      age: 28,
      bloodGroup: 'B+',
      location: 'GST Road, near Vandalur Flyover (12.8912° N, 80.0813° E)',
      peakG: 9.2,
      tilt: 74,
      speed: 52,
      protocolCodeHospital: 'AL-ESP32-TN11AX4412',
      protocolCodeFinance: 'PROTO-TN11AX4412-NODE781',
      upiAdvanceAmount: 5000,
      upiId: 'murugan.zomato@okaxis',
      utr: 'UPI-ACKO-882941075',
      cashlessPreAuth: 25000,
      etaSeconds: 348 // 5m 48s
    },
    traumaBayReserved: false,
    bloodBankAlerted: false,
    payoutReleased: true,
    surveyorFlagged: false,
    isDiverted: false,
    audioAlertMuted: false,
    ambulanceProgress: 0.45, // 0 to 1 along the route path
    approvalsToday: 142
  };

  // --- DOM ELEMENTS ---
  const el = {
    // Nav & Demo Switcher
    navbar: document.getElementById('global-navbar'),
    demoPillBtn: document.getElementById('demo-pill-btn'),
    demoPillDropdown: document.getElementById('demo-pill-dropdown'),
    demoPillLabel: document.getElementById('demo-pill-label'),
    globalIncidentTag: document.getElementById('global-incident-tag'),

    // Screens
    authScreen: document.getElementById('auth-screen'),
    hospitalScreen: document.getElementById('hospital-screen'),
    financeScreen: document.getElementById('finance-screen'),

    // Auth Elements
    roleCardHospital: document.getElementById('role-card-hospital'),
    roleCardFinance: document.getElementById('role-card-finance'),
    inputOperatorId: document.getElementById('input-operator-id'),
    inputSecurityKey: document.getElementById('input-security-key'),
    btnRequestBypass: document.getElementById('btn-request-bypass'),
    btnAuthenticate: document.getElementById('btn-authenticate'),

    // Hospital Controls & Counters
    toggleDivertBtn: document.getElementById('toggle-divert-btn'),
    divertText: document.getElementById('divert-text'),
    bedsCount: document.getElementById('beds-count'),
    btnSimulateCrash: document.getElementById('btn-simulate-crash'),
    criticalAlertBanner: document.getElementById('critical-alert-banner'),
    btnDismissAlert: document.getElementById('btn-dismiss-alert'),
    hospitalEtaTimer: document.getElementById('hospital-eta-timer'),
    mapLiveEta: document.getElementById('map-live-eta'),
    emergencyRoutePath: document.getElementById('emergency-route-path'),
    liveAmbulanceMarker: document.getElementById('live-ambulance-marker'),

    // Hospital Dock
    btnReserveBay: document.getElementById('btn-reserve-bay'),
    statusTagBay: document.getElementById('status-tag-bay'),
    btnAlertBlood: document.getElementById('btn-alert-blood'),
    statusTagBlood: document.getElementById('status-tag-blood'),
    btnCallParamedic: document.getElementById('btn-call-paramedic'),
    btnDownloadFnolHospital: document.getElementById('btn-download-fnol-hospital'),

    // Finance Controls
    btnFinanceSimCrash: document.getElementById('btn-finance-sim-crash'),
    valApprovalsCount: document.getElementById('val-approvals-count'),
    btnReleasePayout: document.getElementById('btn-release-payout'),
    btnExportFnolPack: document.getElementById('btn-export-fnol-pack'),
    btnFlagSurveyor: document.getElementById('btn-flag-surveyor'),
    btnDownloadCsv: document.getElementById('btn-download-csv'),
    utrReferenceCode: document.getElementById('utr-reference-code'),
    telemetryCanvas: document.getElementById('telemetry-waveform-canvas'),
    canvasTooltip: document.getElementById('canvas-scrubber-tooltip'),
    ttTime: document.getElementById('tt-time'),
    ttGforce: document.getElementById('tt-gforce'),
    ttSpeed: document.getElementById('tt-speed'),
    ttTilt: document.getElementById('tt-tilt'),

    // Drawers
    btnOpenVehicleModal: document.getElementById('btn-open-vehicle-modal'),
    vehicleDrawerBackdrop: document.getElementById('vehicle-drawer-backdrop'),
    vehicleDrawer: document.getElementById('vehicle-drawer'),
    btnCloseVehicleDrawer: document.getElementById('btn-close-vehicle-drawer'),
    btnDrawerCopyHash: document.getElementById('btn-drawer-copy-hash'),

    btnOpenInsuranceDossier: document.getElementById('btn-open-insurance-dossier'),
    insuranceDrawerBackdrop: document.getElementById('insurance-drawer-backdrop'),
    insuranceDrawer: document.getElementById('insurance-drawer'),
    btnCloseInsuranceDrawer: document.getElementById('btn-close-insurance-drawer'),
    btnViewUtrReceipt: document.getElementById('btn-view-utr-receipt'),
    btnTrackTow: document.getElementById('btn-track-tow'),
    btnFlagAudit: document.getElementById('btn-flag-audit'),

    // Modals
    fnolModal: document.getElementById('fnol-modal'),
    btnCloseFnolModal: document.getElementById('btn-close-fnol-modal'),
    btnPrintVoucher: document.getElementById('btn-print-voucher'),
    voipModal: document.getElementById('voip-modal'),
    btnCloseVoipModal: document.getElementById('btn-close-voip-modal'),
    btnEndVoip: document.getElementById('btn-end-voip')
  };

  // --- INITIALIZATION ---
  function init() {
    setupEventListeners();
    initWaveformCanvas();
    startEtaTimer();
    updateAmbulancePosition();
  }

  // --- NAVIGATION & DEMO PILL SWITCHER ---
  function switchScreen(target) {
    state.currentScreen = target;

    // Hide all screens
    el.authScreen.classList.add('hidden');
    el.hospitalScreen.classList.add('hidden');
    el.financeScreen.classList.add('hidden');

    // Close any open drawers/modals
    closeAllDrawers();

    if (target === 'auth') {
      el.navbar.classList.add('hidden');
      el.authScreen.classList.remove('hidden');
    } else {
      el.navbar.classList.remove('hidden');
      if (target === 'hospital') {
        el.hospitalScreen.classList.remove('hidden');
        el.demoPillLabel.textContent = '🏥 Hospital Trauma Desk';
        updateDropdownActiveState('hospital');
      } else if (target === 'finance') {
        el.financeScreen.classList.remove('hidden');
        el.demoPillLabel.textContent = '⚡ ACKO InsurTech';
        updateDropdownActiveState('finance');
        // Render waveform canvas when becoming visible
        setTimeout(drawWaveform, 50);
      }
    }
  }

  function updateDropdownActiveState(target) {
    const items = el.demoPillDropdown.querySelectorAll('.dropdown-item');
    items.forEach((item) => {
      if (item.dataset.target === target) {
        item.classList.add('active');
        if (!item.querySelector('.check-badge')) {
          const title = item.querySelector('.item-title');
          const oldBadge = title.querySelector('.arrow-badge');
          if (oldBadge) oldBadge.remove();
          const badge = document.createElement('span');
          badge.className = 'check-badge';
          badge.textContent = '✓';
          title.appendChild(badge);
        }
      } else {
        item.classList.remove('active');
        const check = item.querySelector('.check-badge');
        if (check) {
          check.className = 'arrow-badge';
          check.textContent = '→';
        }
      }
    });
  }

  // --- WEB AUDIO COLLISION CHIME SYNTHESIZER ---
  function playCollisionAlertSound() {
    if (state.audioAlertMuted) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      // Two-tone urgent ER trauma beep
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.setValueAtTime(587.33, now + 0.15);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.4);

      // Repeat second chime pulse
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, now + 0.45);
      osc2.frequency.setValueAtTime(1174.66, now + 0.6);
      gain2.gain.setValueAtTime(0.35, now + 0.45);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.85);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.45);
      osc2.stop(now + 0.9);
    } catch (e) {
      console.log('Audio synthesizer unavailable:', e);
    }
  }

  // --- LIVE ETA COUNTDOWN & MAP AMBULANCE MOVEMENT ---
  function startEtaTimer() {
    setInterval(() => {
      if (state.sharedPatient.etaSeconds > 60) {
        state.sharedPatient.etaSeconds -= 1;
        state.ambulanceProgress = Math.min(0.92, state.ambulanceProgress + 0.001);
      } else {
        state.sharedPatient.etaSeconds = 348; // Loop demo
        state.ambulanceProgress = 0.25;
      }
      updateEtaDisplay();
      updateAmbulancePosition();
    }, 1000);
  }

  function updateEtaDisplay() {
    const mins = Math.floor(state.sharedPatient.etaSeconds / 60);
    const secs = state.sharedPatient.etaSeconds % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    const dynamicFormatted = `${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;

    if (el.hospitalEtaTimer) el.hospitalEtaTimer.textContent = formatted;
    if (el.mapLiveEta) el.mapLiveEta.textContent = dynamicFormatted;
  }

  function updateAmbulancePosition() {
    if (!el.emergencyRoutePath || !el.liveAmbulanceMarker) return;
    try {
      const pathLength = el.emergencyRoutePath.getTotalLength();
      const currentPoint = el.emergencyRoutePath.getPointAtLength(pathLength * state.ambulanceProgress);
      el.liveAmbulanceMarker.setAttribute('transform', `translate(${currentPoint.x}, ${currentPoint.y})`);
    } catch (e) {
      // SVG not yet rendered
    }
  }

  // --- CRASH SIMULATION TRIGGER ---
  function triggerCollisionSimulation() {
    state.sharedPatient.etaSeconds = 360; // 6 mins
    state.ambulanceProgress = 0.15;
    state.traumaBayReserved = false;
    state.bloodBankAlerted = false;
    updateBayButtonState();
    updateBloodButtonState();

    playCollisionAlertSound();

    // Show and flash alert banner
    if (el.criticalAlertBanner) {
      el.criticalAlertBanner.classList.remove('hidden');
      el.criticalAlertBanner.classList.add('flash-pulse');
    }

    // Flash incident card
    const card = document.getElementById('card-cr-8821');
    if (card) {
      card.classList.add('flash-pulse');
      setTimeout(() => card.classList.remove('flash-pulse'), 3000);
    }

    // Increment today's approvals count
    state.approvalsToday += 1;
    if (el.valApprovalsCount) {
      el.valApprovalsCount.textContent = `${state.approvalsToday} Claims`;
    }

    // Alert toast
    showToast('🚨 Telemetry Ingestion: ESP32 9.2G shock verified on #CR-8821. Auto-FNOL pushed to ER Desk & ACKO Liquidity Engine!');
  }

  // --- ONE-CLICK ACTION STATES (HOSPITAL) ---
  function toggleTraumaBayReservation() {
    state.traumaBayReserved = !state.traumaBayReserved;
    updateBayButtonState();

    if (state.traumaBayReserved) {
      el.bedsCount.textContent = '2';
      showToast('🛏️ Trauma Bay 1 Reserved! Nursing station and surgical ortho team notified.');
    } else {
      el.bedsCount.textContent = '3';
      showToast('Trauma Bay 1 released to open status.');
    }
  }

  function updateBayButtonState() {
    if (state.traumaBayReserved) {
      el.statusTagBay.textContent = 'RESERVED';
      el.statusTagBay.className = 'dock-status-tag reserved';
    } else {
      el.statusTagBay.textContent = 'HOLD BAY';
      el.statusTagBay.className = 'dock-status-tag';
    }
  }

  function toggleBloodBankAlert() {
    state.bloodBankAlerted = !state.bloodBankAlerted;
    updateBloodButtonState();

    if (state.bloodBankAlerted) {
      showToast('🩸 Chettinad/Apollo Blood Bank Alerted: 2 Units B+ Positive Cross-Matched & Reserved!');
    } else {
      showToast('Blood Bank request reset.');
    }
  }

  function updateBloodButtonState() {
    if (state.bloodBankAlerted) {
      el.statusTagBlood.textContent = 'RESERVED (2U)';
      el.statusTagBlood.className = 'dock-status-tag reserved';
    } else {
      el.statusTagBlood.textContent = 'REQUEST';
      el.statusTagBlood.className = 'dock-status-tag';
    }
  }

  // --- SHIFT STATUS DIVERTER TOGGLE ---
  function toggleShiftDivert() {
    state.isDiverted = !state.isDiverted;
    if (state.isDiverted) {
      el.toggleDivertBtn.className = 'status-toggle-pill diverted';
      el.toggleDivertBtn.style.background = 'rgba(239, 68, 68, 0.2)';
      el.toggleDivertBtn.style.color = '#F87171';
      el.toggleDivertBtn.style.border = '1px solid rgba(239, 68, 68, 0.5)';
      el.divertText.textContent = 'Divert to Chettinad';
      showToast('⚠️ ER Status Diverted: New inbound telemetry routed to Chettinad Health City.');
    } else {
      el.toggleDivertBtn.className = 'status-toggle-pill accepting';
      el.toggleDivertBtn.style.background = 'rgba(16, 185, 129, 0.15)';
      el.toggleDivertBtn.style.color = '#34D399';
      el.toggleDivertBtn.style.border = '1px solid rgba(16, 185, 129, 0.4)';
      el.divertText.textContent = 'Accepting Inbound';
      showToast('✅ ER Status: Accepting All Inbound Trauma.');
    }
  }

  // --- DRAWERS & MODALS LOGIC ---
  function openVehicleDrawer() {
    el.vehicleDrawerBackdrop.classList.remove('hidden');
    el.vehicleDrawer.classList.remove('hidden');
  }

  function closeVehicleDrawer() {
    el.vehicleDrawerBackdrop.classList.add('hidden');
    el.vehicleDrawer.classList.add('hidden');
  }

  function openInsuranceDrawer() {
    el.insuranceDrawerBackdrop.classList.remove('hidden');
    el.insuranceDrawer.classList.remove('hidden');
  }

  function closeInsuranceDrawer() {
    el.insuranceDrawerBackdrop.classList.add('hidden');
    el.insuranceDrawer.classList.add('hidden');
  }

  function closeAllDrawers() {
    closeVehicleDrawer();
    closeInsuranceDrawer();
    if (el.fnolModal && el.fnolModal.open) el.fnolModal.close();
    if (el.voipModal && el.voipModal.open) el.voipModal.close();
    el.demoPillDropdown.classList.add('hidden');
  }

  // --- RAW TELEMETRY CSV GENERATOR & DOWNLOAD ---
  function downloadRawTelemetryCsv() {
    const rows = [
      ['timestamp_ms', 'time_offset_s', 'accel_x_g', 'accel_y_g', 'accel_z_g', 'gyro_x_dps', 'gyro_y_dps', 'gyro_z_dps', 'speed_kmh', 'tilt_deg', 'lat', 'lon', 'hash_sig']
    ];

    // Generate 15 seconds at 100 Hz = 1500 records
    const baseTime = 1725400935000;
    const baseLat = 12.8912;
    const baseLon = 80.0813;

    for (let i = 0; i < 1500; i++) {
      const tSec = (i - 1000) / 100; // -10.00s to +5.00s (0 is impact)
      const ms = baseTime + i * 10;
      let ax = (Math.random() * 0.1 - 0.05).toFixed(3);
      let ay = (Math.random() * 0.1 - 0.05).toFixed(3);
      let az = (1.0 + (Math.random() * 0.08 - 0.04)).toFixed(3);
      let gx = (Math.random() * 2.0 - 1.0).toFixed(2);
      let gy = (Math.random() * 2.0 - 1.0).toFixed(2);
      let gz = (Math.random() * 2.0 - 1.0).toFixed(2);
      let speed = 52.0;
      let tilt = 4.2;

      if (tSec < 0) {
        speed = (52.0 + Math.random() * 2.0 - 1.0).toFixed(1);
        tilt = (4.0 + Math.random() * 2.0).toFixed(1);
      } else if (tSec >= 0 && tSec <= 0.11) {
        // Impact shock spike!
        const factor = Math.sin((tSec / 0.11) * Math.PI);
        az = (1.0 + factor * 8.2).toFixed(3); // 9.2G peak
        ax = (factor * -5.4).toFixed(3);
        ay = (factor * 6.8).toFixed(3);
        speed = ((1 - tSec / 0.11) * 52.0).toFixed(1);
        tilt = (4.0 + (tSec / 0.11) * 70.0).toFixed(1);
      } else {
        // Post-crash: stationary & sideways tilt
        speed = '0.0';
        tilt = '74.0';
        ax = '0.012';
        ay = '0.961';
        az = '0.274';
      }

      const sig = (i === 1000) ? 'e8f2a9c1480d8f7b901ab49a' : '';
      rows.push([ms, tSec.toFixed(2), ax, ay, az, gx, gy, gz, speed, tilt, baseLat, baseLon, sig]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'MPU6050_BlackBox_15s_Stream_CR8821.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('📁 Downloaded forensic black-box log: MPU6050_BlackBox_15s_Stream_CR8821.csv (128 KB)');
  }

  // --- INTERACTIVE WAVEFORM CANVAS CHART ---
  let canvasData = [];
  function initWaveformCanvas() {
    // Generate synthetic 15-second data curve (T-10s to T+5s)
    canvasData = [];
    const points = 300;
    for (let i = 0; i < points; i++) {
      const t = -10 + (i / points) * 15; // -10s to +5s
      let g = 1.0 + (Math.sin(i * 0.4) * 0.15);
      let speed = 52 - (i > 180 && i < 200 ? ((i - 180) / 20) * 52 : i >= 200 ? 52 : 0);
      let tilt = 4.0;

      // Impact peak around index 200 (T=0)
      if (Math.abs(i - 200) < 4) {
        g = 9.2 - Math.abs(i - 200) * 1.8;
      }
      if (i >= 200) {
        tilt = 74.0;
      }

      canvasData.push({ t, g, speed, tilt });
    }

    setupCanvasHover();
  }

  function drawWaveform(highlightIndex = null) {
    const canvas = el.telemetryCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#182234';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Zero-line / baseline
    const baseY = h - 30;

    // 1. Draw Tilt Curve (Amber)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < canvasData.length; i++) {
      const x = (i / canvasData.length) * w;
      const y = baseY - (canvasData[i].tilt / 90) * (h - 60);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 2. Draw Speed Curve (Cyan)
    ctx.beginPath();
    ctx.strokeStyle = '#06B6D4';
    ctx.lineWidth = 2;
    for (let i = 0; i < canvasData.length; i++) {
      const x = (i / canvasData.length) * w;
      const y = baseY - (canvasData[i].speed / 60) * (h - 70);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 3. Draw G-Force Deceleration Spike (Crimson with glow)
    ctx.save();
    ctx.shadowColor = '#EF4444';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < canvasData.length; i++) {
      const x = (i / canvasData.length) * w;
      const y = baseY - (canvasData[i].g / 10) * (h - 50);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    // Vertical Impact Indicator Line at T-0 (Index 200)
    const impactX = (200 / canvasData.length) * w;
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(impactX, 0);
    ctx.lineTo(impactX, h);
    ctx.stroke();
    ctx.setLineDash([]);

    // Impact Callout Tag
    ctx.fillStyle = '#DC2626';
    ctx.fillRect(impactX - 40, 8, 80, 20);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 9px "JetBrains Mono"';
    ctx.textAlign = 'center';
    ctx.fillText('9.2G IMPACT', impactX, 22);

    // Scrubber vertical line if scrubbing
    if (highlightIndex !== null && highlightIndex >= 0 && highlightIndex < canvasData.length) {
      const sx = (highlightIndex / canvasData.length) * w;
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, h);
      ctx.stroke();

      // Dot on G-Force
      const sy = baseY - (canvasData[highlightIndex].g / 10) * (h - 50);
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function setupCanvasHover() {
    const canvas = el.telemetryCanvas;
    if (!canvas) return;

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const ratio = mouseX / rect.width;
      const index = Math.min(canvasData.length - 1, Math.max(0, Math.floor(ratio * canvasData.length)));
      const pt = canvasData[index];

      drawWaveform(index);

      // Update Tooltip
      if (el.canvasTooltip) {
        el.canvasTooltip.classList.remove('hidden');
        el.canvasTooltip.style.left = `${Math.min(rect.width - 120, Math.max(10, mouseX - 60))}px`;
        el.ttTime.textContent = `T: ${pt.t >= 0 ? '+' : ''}${pt.t.toFixed(2)}s`;
        el.ttGforce.textContent = `G-Force: ${pt.g.toFixed(1)}G`;
        el.ttSpeed.textContent = `Speed: ${pt.speed.toFixed(0)} km/h`;
        el.ttTilt.textContent = `Tilt: ${pt.tilt.toFixed(0)}°`;
      }
    });

    canvas.addEventListener('mouseleave', () => {
      drawWaveform(null);
      if (el.canvasTooltip) el.canvasTooltip.classList.add('hidden');
    });
  }

  // --- SIMPLE TOAST NOTIFICATION HELPER ---
  function showToast(msg) {
    let toast = document.getElementById('aegis-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'aegis-toast';
      toast.style.position = 'fixed';
      toast.style.bottom = '24px';
      toast.style.right = '24px';
      toast.style.background = '#0F172A';
      toast.style.color = '#FFFFFF';
      toast.style.border = '1px solid #38BDF8';
      toast.style.borderRadius = '8px';
      toast.style.padding = '12px 20px';
      toast.style.fontSize = '13px';
      toast.style.fontWeight = '600';
      toast.style.boxShadow = '0 10px 30px rgba(0,0,0,0.6)';
      toast.style.zIndex = '9999';
      toast.style.maxWidth = '420px';
      toast.style.transition = 'all 0.3s ease';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';

    clearTimeout(toast.hideTimeout);
    toast.hideTimeout = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
    }, 4000);
  }

  // --- EVENT LISTENERS ---
  function setupEventListeners() {
    // 1. Auth Role Selection
    el.roleCardHospital.addEventListener('click', () => {
      state.selectedRole = 'hospital';
      el.roleCardHospital.classList.add('active');
      el.roleCardFinance.classList.remove('active');
      el.inputOperatorId.value = 'ER-APOLLO-78241';
    });

    el.roleCardFinance.addEventListener('click', () => {
      state.selectedRole = 'finance';
      el.roleCardFinance.classList.add('active');
      el.roleCardHospital.classList.remove('active');
      el.inputOperatorId.value = 'ACKO-UW-409';
    });

    // 2. Bypass Auto-fill
    el.btnRequestBypass.addEventListener('click', () => {
      el.inputSecurityKey.value = 'MASTER-BYPASS-PROD-2026';
      showToast('🔑 Master bypass credentials injected for verified demo node.');
    });

    // 3. Authenticate Button
    el.btnAuthenticate.addEventListener('click', () => {
      const btn = el.btnAuthenticate;
      btn.style.opacity = '0.7';
      btn.querySelector('.btn-text').textContent = 'Validating Node Key...';

      setTimeout(() => {
        btn.style.opacity = '1';
        btn.querySelector('.btn-text').textContent = 'Authenticate & Enter Console →';
        switchScreen(state.selectedRole);
        showToast(`Authenticated as ${state.selectedRole.toUpperCase()} Operator. Live node stream connected.`);
      }, 450);
    });

    // 4. Demo Pill Toggle & Dropdown
    el.demoPillBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      el.demoPillDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!el.demoPillWrapper?.contains(e.target)) {
        el.demoPillDropdown.classList.add('hidden');
      }
    });

    // Dropdown Items Switcher
    el.demoPillDropdown.querySelectorAll('.dropdown-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        const target = item.dataset.target;
        el.demoPillDropdown.classList.add('hidden');
        switchScreen(target);
      });
    });

    // 5. Crash Simulation Triggers
    if (el.btnSimulateCrash) el.btnSimulateCrash.addEventListener('click', triggerCollisionSimulation);
    if (el.btnFinanceSimCrash) el.btnFinanceSimCrash.addEventListener('click', triggerCollisionSimulation);
    if (el.btnDismissAlert) {
      el.btnDismissAlert.addEventListener('click', () => {
        el.criticalAlertBanner.classList.add('hidden');
        state.audioAlertMuted = true;
      });
    }

    // 6. Hospital Actions
    el.btnReserveBay.addEventListener('click', toggleTraumaBayReservation);
    el.btnAlertBlood.addEventListener('click', toggleBloodBankAlert);
    el.toggleDivertBtn.addEventListener('click', toggleShiftDivert);

    el.btnCallParamedic.addEventListener('click', () => {
      el.voipModal.showModal();
    });
    el.btnCloseVoipModal.addEventListener('click', () => el.voipModal.close());
    el.btnEndVoip.addEventListener('click', () => {
      el.voipModal.close();
      showToast('Paramedic radio link disconnected.');
    });

    el.btnDownloadFnolHospital.addEventListener('click', () => {
      el.fnolModal.showModal();
    });
    el.btnCloseFnolModal.addEventListener('click', () => el.fnolModal.close());
    el.btnPrintVoucher.addEventListener('click', () => {
      window.print();
    });

    // 7. Finance Actions
    el.btnReleasePayout.addEventListener('click', () => {
      const newUtr = `UPI-ACKO-${Math.floor(100000000 + Math.random() * 900000000)}`;
      el.utrReferenceCode.textContent = newUtr;
      showToast(`⚡ Instant Payout Released! ₹5,000 sent to ${state.sharedPatient.upiId}. UTR: ${newUtr}`);
    });

    el.btnExportFnolPack.addEventListener('click', () => {
      el.fnolModal.showModal();
    });

    el.btnFlagSurveyor.addEventListener('click', () => {
      state.surveyorFlagged = !state.surveyorFlagged;
      if (state.surveyorFlagged) {
        showToast('⚠️ Claim Flagged for Manual Surveyor Inspection. Parametric auto-settlement paused.');
      } else {
        showToast('✅ Manual Surveyor Hold Lifted. Parametric auto-settlement restored.');
      }
    });

    el.btnDownloadCsv.addEventListener('click', downloadRawTelemetryCsv);

    // 8. Drawers Triggers
    el.btnOpenVehicleModal.addEventListener('click', openVehicleDrawer);
    el.btnCloseVehicleDrawer.addEventListener('click', closeVehicleDrawer);
    el.vehicleDrawerBackdrop.addEventListener('click', closeVehicleDrawer);

    el.btnOpenInsuranceDossier.addEventListener('click', openInsuranceDrawer);
    el.btnCloseInsuranceDrawer.addEventListener('click', closeInsuranceDrawer);
    el.insuranceDrawerBackdrop.addEventListener('click', closeInsuranceDrawer);

    el.btnDrawerCopyHash.addEventListener('click', () => {
      navigator.clipboard.writeText('SHA-256: e8f2a9c1480d8f7b901ab49ae8f2a9c1480d8f7b901ab49a');
      showToast('📋 Cryptographic payload hash copied to clipboard!');
    });

    el.btnViewUtrReceipt.addEventListener('click', () => {
      showToast(`Banking Receipt: ₹5,000 to murugan.zomato@okaxis on Sep 04, 2026 at 08:42:30 PM. UTR: ${el.utrReferenceCode.textContent}`);
    });

    el.btnTrackTow.addEventListener('click', () => {
      showToast('📍 Tow Service: Partner Unit dispatched from Tambaram hub (ETA 18 mins).');
    });

    el.btnFlagAudit.addEventListener('click', () => {
      showToast('Post-repair audit condition scheduled upon final invoice upload.');
    });

    // Keyboard shortcuts (Escape closes drawers)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAllDrawers();
    });
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
