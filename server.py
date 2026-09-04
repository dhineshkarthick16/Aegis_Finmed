#!/usr/bin/env python3
"""
AegisLink Real-Time Telematics & Parametric Claims Server
Flask + Flask-CORS + Flask-SocketIO
"""

import os
import sys
import time
import json
import logging

# Ensure UTF-8 output encoding on Windows consoles
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("AegisServer")

# Initialize Flask app
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DASHBOARD_DIR = os.path.join(BASE_DIR, "dashboard")

app = Flask(__name__, static_folder=DASHBOARD_DIR, static_url_path="")
CORS(app, resources={r"/*": {"origins": "*"}})

# Initialize Socket.IO with CORS support for all origins
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

# In-memory incident store for audit & forensic history
incidents_db = []


# --- HTTP STATIC & ROOT ROUTES ---

@app.route("/")
def index():
    """Serve the AegisLink command dashboard."""
    if os.path.exists(os.path.join(DASHBOARD_DIR, "index.html")):
        return send_from_directory(DASHBOARD_DIR, "index.html")
    return jsonify({"status": "active", "service": "AegisLink Telematics Core v2.4"})


@app.route("/<path:path>")
def static_proxy(path):
    """Serve static assets from the dashboard directory."""
    if os.path.exists(os.path.join(DASHBOARD_DIR, path)):
        return send_from_directory(DASHBOARD_DIR, path)
    return jsonify({"error": "File not found"}), 404


@app.route("/api/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "service": "AegisLink Telematics Core",
        "version": "2.4.1-PROD",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_incidents": len(incidents_db)
    }), 200


# --- REAL-TIME CRASH INGESTION API ---

@app.route("/api/crash-report", methods=["POST"])
def crash_report():
    """
    POST /api/crash-report
    Receives an ESP32 / Mobile IoT crash report payload:
      - rider_id (required/string)
      - latitude (required/float or str)
      - longitude (required/float or str)
      - kinematics_payload (required/dict or str)
    Immediately broadcasts it via WebSocket 'crash_alert' event to all connected dashboards.
    """
    payload = request.get_json(silent=True)

    if not payload:
        logger.warning("Rejected /api/crash-report: Missing JSON body")
        return jsonify({
            "status": "error",
            "message": "Invalid or missing JSON payload"
        }), 400

    # Extract required fields with flexible fallbacks
    rider_id = payload.get("rider_id")
    latitude = payload.get("latitude")
    longitude = payload.get("longitude")
    kinematics = payload.get("kinematics_payload")

    if rider_id is None or latitude is None or longitude is None:
        logger.warning(f"Rejected /api/crash-report: Missing required keys in {payload}")
        return jsonify({
            "status": "error",
            "message": "Missing required fields: rider_id, latitude, longitude"
        }), 422

    # Parse kinematics if passed as JSON string
    if isinstance(kinematics, str):
        try:
            kinematics = json.loads(kinematics)
        except Exception:
            kinematics = {"raw": kinematics}
    elif not isinstance(kinematics, dict):
        kinematics = {}

    # Extract or calculate kinematic indicators
    peak_g = kinematics.get("peak_g", kinematics.get("impact_g", 9.2))
    tilt_angle = kinematics.get("tilt_angle", kinematics.get("tilt", 74.0))
    speed_kmh = kinematics.get("pre_speed_kmh", kinematics.get("speed", 52.0))
    payload_hash = kinematics.get("payload_hash", "e8f2a9c1480d8f7b901ab49a")

    # Generate sequential or unique incident ID
    incident_counter = len(incidents_db) + 8822
    incident_id = payload.get("incident_id", f"#CR-{incident_counter}")
    claim_id = payload.get("claim_id", f"#ACKO-CL-{int(time.time()) % 100000}")
    formatted_time = time.strftime("%I:%M:%S %p")

    # Construct the broadcast payload
    alert_payload = {
        "incident_id": incident_id,
        "rider_id": str(rider_id),
        "rider_name": payload.get("rider_name", f"Rider #{rider_id}"),
        "fleet": payload.get("fleet", "Zomato Fleet Operations"),
        "latitude": float(latitude) if isinstance(latitude, (int, float, str)) and str(latitude).replace('.', '', 1).replace('-', '', 1).isdigit() else latitude,
        "longitude": float(longitude) if isinstance(longitude, (int, float, str)) and str(longitude).replace('.', '', 1).replace('-', '', 1).isdigit() else longitude,
        "location_name": payload.get("location_name", f"GST Corridor ({latitude}° N, {longitude}° E)"),
        "timestamp": formatted_time,
        "kinematics_payload": {
            "peak_g": float(peak_g) if str(peak_g).replace('.', '', 1).isdigit() else 9.2,
            "tilt_angle": float(tilt_angle) if str(tilt_angle).replace('.', '', 1).isdigit() else 74.0,
            "pre_speed_kmh": float(speed_kmh) if str(speed_kmh).replace('.', '', 1).isdigit() else 52.0,
            "impact_speed_kmh": 0.0,
            "decel_time_ms": kinematics.get("decel_time_ms", 110),
            "payload_hash": payload_hash,
            "axis": kinematics.get("axis", "Multi-Axis MPU-6050")
        },
        "claim_status": payload.get("claim_status", "ACKO Pre-Approved Incident"),
        "claim_id": claim_id,
        "protocol_code": payload.get("protocol_code", f"AL-ESP32-{str(rider_id).replace(' ', '')}"),
        "ambulance_unit": payload.get("ambulance_unit", "108 Unit TN-09-G-412"),
        "ambulance_status": payload.get("ambulance_status", "Ambulance Dispatched (108 Unit)"),
        "eta_minutes": payload.get("eta_minutes", 6),
        "severity": payload.get("severity", f"CRITICAL // {peak_g}G Peak • Vehicle Downed"),
        "blood_group": payload.get("blood_group", "B+ Positive"),
        "age": payload.get("age", 28),
        "emergency_advance_upi": 5000,
        "hospital_preauth_token": f"AUTH-APOLLO-GST-25K-{incident_counter}"
    }

    # Store in history
    incidents_db.append(alert_payload)

    # Immediately broadcast over WebSocket to all connected clients
    logger.info(f"[BROADCAST] crash_alert triggered: Rider '{rider_id}' at ({latitude}, {longitude}) | Peak G: {peak_g}G")
    socketio.emit("crash_alert", alert_payload)

    return jsonify({
        "status": "success",
        "message": "Crash report ingested and broadcasted via WebSocket crash_alert",
        "incident_id": incident_id,
        "data": alert_payload
    }), 201


# --- WEBSOCKET EVENT HANDLERS ---

@socketio.on("connect")
def handle_connect():
    client_id = request.sid
    logger.info(f"[SOCKET] Client connected: {client_id}")
    emit("connection_ack", {
        "status": "connected",
        "server_time": time.strftime("%I:%M:%S %p"),
        "active_incidents": len(incidents_db)
    })


@socketio.on("disconnect")
def handle_disconnect():
    client_id = request.sid
    logger.info(f"[SOCKET] Client disconnected: {client_id}")


@socketio.on("ping_server")
def handle_ping(data):
    emit("pong_server", {"timestamp": time.time(), "echo": data})


# --- SERVER ENTRY POINT ---

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print("=" * 65)
    print("  [AEGIS] AEGISLINK TELEMATICS REAL-TIME BACKEND ACTIVE")
    print(f"  * Web Dashboard:  http://localhost:{port}/")
    print(f"  * Ingest API:     POST http://localhost:{port}/api/crash-report")
    print(f"  * WebSocket:      Socket.IO engine listening on all interfaces")
    print("=" * 65)
    socketio.run(app, host="0.0.0.0", port=port, debug=False, allow_unsafe_werkzeug=True)
