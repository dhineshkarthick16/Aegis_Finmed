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
    inboundFeedList: document.getElementById('inbound-feed-list'),
    feedIncidentCount: document.getElementById('feed-incident-count'),
    claimsQueueList: document.querySelector('.finance-layout .feed-scroll-container'),

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
    initSocket();
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

  // --- REAL-TIME WEBSOCKET (SOCKET.IO) CLIENT ---
  let socket = null;
  let activeIncidentCount = 3;

  function initSocket() {
    if (typeof io === 'undefined') {
      console.warn('[AegisLink] Socket.IO client library not loaded. Retrying in 1s...');
      setTimeout(initSocket, 1000);
      return;
    }

    try {
      // Connect to backend: if served from flask on port 5000, connect to origin;
      // if served from port 3000, 8000, or file://, connect to http://localhost:5000
      const serverUrl =
        window.location.protocol.startsWith('http') && window.location.port === '5000'
          ? undefined
          : 'http://localhost:5000';

      socket = io(serverUrl, {
        reconnectionAttempts: 20,
        reconnectionDelay: 1000,
        timeout: 5000,
        transports: ['websocket', 'polling']
      });

      socket.on('connect', () => {
        console.log('⚡ [AegisLink] Connected to Python Socket.IO Real-Time Backend (SID: ' + socket.id + ')');
        showToast('⚡ Connected to AegisLink Telematics Real-Time Backend');
      });

      socket.on('connection_ack', (data) => {
        console.log('⚡ [AegisLink] Server ACK:', data);
      });

      // LISTEN FOR crash_alert WEBSOCKET EVENT
      socket.on('crash_alert', (payload) => {
        console.log('🚨 [AegisLink] Received crash_alert WebSocket event:', payload);
        handleIncomingCrashAlert(payload);
      });

      socket.on('disconnect', () => {
        console.log('🔌 [AegisLink] Disconnected from Real-Time Backend');
      });

      socket.on('connect_error', (err) => {
        console.log('⚠️ [AegisLink] Socket.IO connection attempt:', err.message);
      });
    } catch (err) {
      console.error('[AegisLink] Error initializing Socket.IO client:', err);
    }
  }

  // --- DYNAMIC DOM MANIPULATION FOR CRASH ALERT ---
  function handleIncomingCrashAlert(data) {
    if (!data) return;

    const riderId = data.rider_id || 'UNKNOWN';
    const lat = data.latitude !== undefined ? Number(data.latitude).toFixed(4) : '12.8912';
    const lon = data.longitude !== undefined ? Number(data.longitude).toFixed(4) : '80.0813';
    const kinematics = data.kinematics_payload || {};
    const peakG = kinematics.peak_g || data.peak_g || 9.2;
    const tilt = kinematics.tilt_angle || data.tilt_angle || 74;
    const speed = kinematics.pre_speed_kmh || data.pre_speed_kmh || 52;
    const incidentId = data.incident_id || `#CR-${Math.floor(8822 + Math.random() * 1000)}`;
    const riderName = data.rider_name || `Rider #${riderId}`;
    const fleet = data.fleet || 'Zomato Partner';
    const claimStatus = data.claim_status || 'ACKO Pre-Approved Incident';
    const protocolCode = data.protocol_code || `AL-ESP32-${String(riderId).replace(/[^a-zA-Z0-9]/g, '')}`;
    const ambStatus = data.ambulance_status || 'Ambulance Dispatched (108 Unit)';
    const etaMins = data.eta_minutes || 6;
    const timestamp = data.timestamp || 'Just now';
    const locationName = data.location_name || `GST Corridor (${lat}° N, ${lon}° E)`;

    // 1. Construct the new 'CRITICAL // NEW COLLISION' incident card DOM Element
    const card = document.createElement('article');
    card.className = 'incident-card active-incident flash-pulse';
    card.id = `card-${incidentId.replace(/[^a-zA-Z0-9]/g, '')}`;

    card.innerHTML = `
      <div class="card-top-row">
        <div class="patient-title-group">
          <h3 class="patient-name">${riderName}</h3>
          <span class="fleet-tag zomato">${fleet}</span>
        </div>
        <span class="time-ago-tag">${timestamp}</span>
      </div>

      <!-- Parametric Claim Status -->
      <div class="claim-status-row">
        <span class="acko-shield-icon">🛡️</span>
        <span class="claim-text">${claimStatus} <strong>${incidentId}</strong></span>
        <span class="zero-touch-tag">Zero-Touch Cashless</span>
      </div>

      <!-- Location & Hardware Protocol Pill -->
      <div class="location-row">
        <span class="loc-pin">📍</span>
        <span class="loc-text">${locationName} • GPS: ${lat}° N, ${lon}° E</span>
      </div>

      <div class="protocol-code-row">
        <button class="protocol-pill-btn" id="btn-proto-${incidentId.replace(/[^a-zA-Z0-9]/g, '')}" title="Click to view Vehicle & ESP32 Black-Box Hardware Drawer">
          <span class="link-icon">🔗</span>
          <span class="code-text">${protocolCode}</span>
          <span class="tag-hint">Inspect Hardware →</span>
        </button>
      </div>

      <!-- Ambulance Status & Live ETA -->
      <div class="card-status-grid">
        <div class="status-col">
          <div class="label">AMBULANCE STATUS</div>
          <div class="ambulance-pill dispatched">
            <span class="amb-icon">🚑</span>
            <span>${ambStatus}</span>
          </div>
        </div>
        <div class="status-col eta-col">
          <div class="label">LIVE ARRIVAL COUNTDOWN</div>
          <div class="eta-countdown-badge">
            <span class="eta-timer">0${etaMins}:00</span>
            <span class="eta-km">(3.2 km away)</span>
          </div>
        </div>
      </div>

      <!-- Severity Indicator -->
      <div class="severity-footer critical">
        <div class="sev-badge">CRITICAL // NEW COLLISION</div>
        <div class="sev-metric">${peakG}G Peak Impact • Rider: ${riderId} • (${lat}° N, ${lon}° E)</div>
      </div>
    `;

    // 2. Prepend to the top of Left Panel (Inbound Feed) container completely without page refresh!
    const feedContainer = el.inboundFeedList || document.getElementById('inbound-feed-list');
    if (feedContainer) {
      feedContainer.prepend(card);
    }

    // Wire the protocol pill button to open Vehicle Detail Drawer
    const protoBtn = card.querySelector('.protocol-pill-btn');
    if (protoBtn) {
      protoBtn.addEventListener('click', () => {
        openVehicleDrawer();
      });
    }

    // 3. Remove flash pulse animation after 4 seconds
    setTimeout(() => {
      card.classList.remove('flash-pulse');
    }, 4000);

    // 4. Update the Active Inbound Count badge
    activeIncidentCount += 1;
    const badgeCount = el.feedIncidentCount || document.getElementById('feed-incident-count');
    if (badgeCount) {
      badgeCount.textContent = `${activeIncidentCount} Active`;
    }

    // 5. Trigger audio-visual alert banner with real-time info
    if (el.criticalAlertBanner) {
      el.criticalAlertBanner.classList.remove('hidden');
      el.criticalAlertBanner.classList.add('flash-pulse');
      const headline = el.criticalAlertBanner.querySelector('.alert-headline');
      const desc = el.criticalAlertBanner.querySelector('.alert-desc');
      if (headline) headline.textContent = `CRITICAL // NEW COLLISION: RIDER ${riderId}`;
      if (desc) desc.textContent = `ESP32 ${peakG}G Decel Spike at (${lat}° N, ${lon}° E) • Auto-FNOL Verified`;
    }

    // 6. Play collision alarm chime
    playCollisionAlertSound();

    // 7. Reset live ETA & ambulance marker on map
    state.sharedPatient.etaSeconds = etaMins * 60;
    state.ambulanceProgress = 0.12;
    updateAmbulancePosition();

    // 8. Also dynamically prepend to Finance Claims Queue if present
    const claimsQueue = el.claimsQueueList || document.querySelector('.finance-layout .feed-scroll-container');
    if (claimsQueue) {
      const financeCard = document.createElement('article');
      financeCard.className = 'incident-card active-incident finance-card flash-pulse';
      financeCard.innerHTML = `
        <div class="card-top-row">
          <div class="patient-title-group">
            <h3 class="patient-name">${riderName}</h3>
            <span class="fleet-tag zomato">${fleet}</span>
          </div>
          <span class="time-ago-tag">${timestamp}</span>
        </div>
        <div class="protocol-code-row">
          <button class="protocol-pill-btn finance-pill" title="Click to view deep Insurance Dossier & Real-time Claims Timeline">
            <span class="link-icon">🔗</span>
            <span class="code-text">PROTO-${String(riderId).replace(/[^a-zA-Z0-9]/g, '')}-NODE781</span>
            <span class="tag-hint">Insurance Dossier →</span>
          </button>
        </div>
        <div class="incident-meta-block">
          <div class="meta-line">
            <span class="meta-k">Rider & GPS:</span>
            <span class="meta-v">ID: ${riderId} • (${lat}° N, ${lon}° E)</span>
          </div>
          <div class="meta-line">
            <span class="meta-k">Damage Vector:</span>
            <span class="meta-v highlight-amber">Chassis & Fork (${peakG}G shock • ${tilt}° tilt)</span>
          </div>
        </div>
        <div class="claim-status-badge-row">
          <div class="status-badge-verified">
            <span class="badge-check">✓</span>
            <span>Auto-Verified (Parametric Trigger Met)</span>
          </div>
        </div>
        <div class="claim-financials-peek">
          <div class="peek-item">
            <span class="pk-label">TOWING / UPI ADVANCE</span>
            <span class="pk-val green-text">₹5,000 Disbursed</span>
          </div>
          <div class="peek-item">
            <span class="pk-label">ER PRE-AUTH TOKEN</span>
            <span class="pk-val cyan-text">₹25,000 Active</span>
          </div>
        </div>
      `;
      claimsQueue.prepend(financeCard);
      const finProtoBtn = financeCard.querySelector('.protocol-pill-btn');
      if (finProtoBtn) {
        finProtoBtn.addEventListener('click', openInsuranceDrawer);
      }
      setTimeout(() => financeCard.classList.remove('flash-pulse'), 4000);
    }

    // 9. Increment Solvency Approvals Counter
    state.approvalsToday += 1;
    if (el.valApprovalsCount) {
      el.valApprovalsCount.textContent = `${state.approvalsToday} Claims`;
    }

    // 10. Show live toast confirmation
    showToast(`🚨 [LIVE WEBSOCKET] Ingested Collision: Rider ${riderId} at (${lat}° N, ${lon}° E) - Peak: ${peakG}G`);
  }

  // --- CRASH SIMULATION TRIGGER ---
  function triggerCollisionSimulation() {
    const demoRiderId = `TN-11-AX-${Math.floor(1000 + Math.random() * 9000)}`;
    const demoPayload = {
      rider_id: demoRiderId,
      rider_name: 'Murugan K.',
      fleet: 'Zomato Partner',
      latitude: 12.8912 + (Math.random() * 0.008 - 0.004),
      longitude: 80.0813 + (Math.random() * 0.008 - 0.004),
      location_name: 'GST Road, near Vandalur Flyover',
      kinematics_payload: {
        peak_g: 9.2,
        tilt_angle: 74.0,
        pre_speed_kmh: 52.0,
        impact_speed_kmh: 0.0,
        decel_time_ms: 110,
        payload_hash: 'e8f2a9c1480d8f7b901ab49a'
      },
      claim_status: 'ACKO Pre-Approved Incident',
      eta_minutes: 6
    };

    // Try posting to Flask real-time backend endpoint
    const backendUrl =
      window.location.protocol.startsWith('http') && window.location.port === '5000'
        ? '/api/crash-report'
        : 'http://localhost:5000/api/crash-report';

    fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(demoPayload)
    })
      .then((res) => res.json())
      .then((data) => {
        console.log('✅ [API] Dispatched crash report to server:', data);
        // Note: The WebSocket broadcast will trigger handleIncomingCrashAlert automatically!
      })
      .catch((err) => {
        console.warn('⚠️ [API] Server not reachable, executing local simulation fallback:', err.message);
        handleIncomingCrashAlert(demoPayload);
      });
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

  // Expose global controller for testing & manual simulation
  window.AegisLink = {
    state,
    getSocket: () => socket,
    handleIncomingCrashAlert,
    triggerCollisionSimulation,
    switchScreen
  };

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
