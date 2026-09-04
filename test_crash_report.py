#!/usr/bin/env python3
"""
AegisLink Real-Time Telematics Ingestion Test Client
Simulates an ESP32 / Mobile IoT node posting a crash report to /api/crash-report.
"""

import sys
import json
import time
import urllib.request

def send_crash_report(rider_id="TN-11-AX-4412", lat=12.8912, lon=80.0813, peak_g=9.2, tilt=74.0):
    url = "http://localhost:5000/api/crash-report"
    payload = {
        "rider_id": rider_id,
        "rider_name": "Murugan K.",
        "fleet": "Zomato Delivery Partner",
        "latitude": lat,
        "longitude": lon,
        "location_name": "GST Road, near Vandalur Flyover",
        "kinematics_payload": {
            "peak_g": peak_g,
            "tilt_angle": tilt,
            "pre_speed_kmh": 52.0,
            "impact_speed_kmh": 0.0,
            "decel_time_ms": 110,
            "payload_hash": "e8f2a9c1480d8f7b901ab49a"
        },
        "claim_status": "ACKO Pre-Approved Incident",
        "ambulance_status": "Ambulance Dispatched (108 Unit TN-09-G-412)",
        "eta_minutes": 5
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )

    print(f"[*] Posting crash report to {url}...")
    print(f"    Rider: {rider_id} | Location: ({lat}, {lon}) | Peak G: {peak_g}G | Tilt: {tilt} deg")

    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"[+] Response ({resp.status}): {data.get('message')}")
            print(f"    Incident ID: {data.get('incident_id')}")
            print(f"    Broadcasting over WebSocket 'crash_alert' event to connected dashboards!")
    except Exception as e:
        print(f"[-] Request failed: {e}")
        print("    Ensure python server.py is running on port 5000.")

if __name__ == "__main__":
    rider = sys.argv[1] if len(sys.argv) > 1 else "TN-11-AX-4412"
    send_crash_report(rider_id=rider)
