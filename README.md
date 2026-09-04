# AegisLink (Aegis_Finmed)

**Parametric Protection Meets Algorithmic Mobility.**

Continuous edge-computing telematics enabling instant zero-touch claim liquidity and real-time emergency response for commercial two-wheeler fleets.

---

## 🚀 Live Dashboard & Command Consoles

AegisLink provides an institutional dual-console web system designed for real-time golden-hour emergency trauma response and instant parametric insurtech underwriting.

### Key Console Features

1. **Brand & Authentication Portal (Split-Screen View)**
   - **Left Panel (Dark Tech Theme `#0B0F19`)**: Technical dot-grid, interactive two-wheeler telemetry mesh wireframe, node ping indicators (GPS, IMU 6-Axis, Network latency <28ms), 99.98% uptime node status.
   - **Right Panel (Clean Minimalist `#F9FAFB`)**: Segmented interactive role selector cards (Hospital Emergency Response vs. ACKO Finance & InsurTech), node operator credentials with master bypass link.

2. **Hospital Emergency Trauma Console (Apollo Trauma & Emergency Care)**
   - **Live Capacity Bar**: Real-time trauma beds, ICU ventilators, and on-duty surgical lead. Shift status toggle (*Accepting Inbound* vs. *Divert to Nearest Facility*) and State 108 hotline.
   - **Left Panel (380px)**: Priority Inbound Feed ranked by Golden-Hour urgency, live traffic-adjusted ETA countdown, critical collision banner, and clickable `[ 🔗 AL-ESP32-TN11AX4412 ]` hardware protocol pill.
   - **Center Panel (Interactive Map)**: Dynamic GST Road / Vandalur arterial corridor with traffic congestion layers (green/amber/red), pulsating crash origin pin, and live moving ambulance marker with transit statistics.
   - **Right Panel (360px)**: Pre-Arrival Trauma Sheet (patient profile, blood group B+, ICE contact, crash physics: 9.2G peak impact, 74° tilt, 52 → 0 km/h deceleration in 110ms) and One-Click Action Dock (*Reserve Trauma Bay 1*, *Alert Blood Bank*, *Call Paramedic VoIP*, *Generate Cashless Slip*).

3. **Finance & InsurTech Console (ACKO × AegisLink)**
   - **Top Solvency Bar**: Zero-touch approvals counter, 7.4-second mean settlement speed, and automated liquidity pool reserve metrics.
   - **Left Panel (400px)**: Claims queue, auto-verified parametric triggers, and clickable `[ 🔗 PROTO-TN11AX4412-NODE781 ]` insurance dossier pill.
   - **Center Panel (580px)**: Interactive 15-second MPU sensor telemetry waveform canvas (pre-impact speed, 9.2G shock, post-crash tilt) with cursor scrubbing, downloadable raw 100 Hz CSV log (`MPU6050_BlackBox_15s_Stream_CR8821.csv`), and algorithmic fraud score bars (99.4% kinetic validity, 0.2% false drop).
   - **Right Panel (460px)**: Calculated damage bracket (₹8,500 – ₹12,000), instant UPI micro-advance (₹5,000 to `murugan.zomato@okaxis` with banking UTR code), ₹25,000 hospital pre-authorization token, and underwriter action overrides.

4. **Interactive Modals & Drawers**
   - **Vehicle Detail Drawer**: TVS iQube Electric specs, VIN, ESP32-WROOM-32D firmware status, battery health (91%), and cryptographic SHA-256 edge signature.
   - **Insurance Dossier & Real-Time Timeline Drawer**: Commercial gig policy coverage, IDV, mobility score (865/900), and second-by-second settlement progression (T-0 to T+15s).
   - **Cashless Admission Slip / Auto-FNOL Modal**: Printable voucher for zero upfront deposit admission.
   - **En-Route Paramedic VoIP Terminal**: Radio bridge with live telemetry vitals stream (HR 104, SpO2 96%, BP 112/74).

5. **"God Mode" Demo Switcher Pill**
   - Floating navbar pill (`🏥 Hospital Trauma Desk ▾` / `⚡ ACKO InsurTech ▾`) linking shared incident `#CR-8821` in real time, with an instant crash simulation trigger for live pitch demonstrations.

---

## 💻 How to Run the Dashboard

The dashboard is built with zero external runtime dependencies and can be launched instantly:

### Option A: Direct Browser Launch
Double-click `dashboard/index.html` or `index.html` in your file explorer to open it in Chrome, Edge, Safari, or Firefox.

### Option B: Local Static Server
```bash
# Using npx serve
npx serve dashboard

# Or using Python 3
python -m http.server 8000
```
Open `http://localhost:8000` (or `http://localhost:3000`) in your browser.

### Option C: Real-Time Python Backend (Flask-SocketIO)
Run the real-time WebSocket telematics server:
```bash
# Install dependencies
pip install flask flask-cors flask-socketio simple-websocket

# Start real-time server
python server.py
```
Open `http://localhost:5000` in your browser.

#### Ingesting Live Crash Telemetry:
Post an IoT crash report to trigger instant zero-refresh dashboard updates:
```bash
# Using Python test client
python test_crash_report.py "TN-09-CB-1234"

# Or using cURL
curl -X POST http://localhost:5000/api/crash-report \
  -H "Content-Type: application/json" \
  -d '{
    "rider_id": "TN-11-AX-4412",
    "latitude": 12.8912,
    "longitude": 80.0813,
    "kinematics_payload": {
      "peak_g": 9.2,
      "tilt_angle": 74.0,
      "pre_speed_kmh": 52.0
    }
  }'
```
All connected Hospital and ACKO dashboards immediately receive the `crash_alert` WebSocket event, dynamically render a new `CRITICAL // NEW COLLISION` incident card, play an audible chime, and prepend the event to the Inbound Feed without any page refresh.

---

## 📱 Mobile App (`ble-test-app`)

The repository also includes the Flutter client app (`ble-test-app`) for connecting directly over Bluetooth Low Energy (BLE) to on-bike ESP32 crash detection nodes, buffering accelerometer data, and dispatching parametric FNOL payloads to the gateway.

```bash
cd ble-test-app
flutter pub get
flutter run
```

---

## 📄 License
MIT License
