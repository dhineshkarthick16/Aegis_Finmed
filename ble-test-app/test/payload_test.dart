import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:ble_test_app/models/crash_event.dart';

void main() {
  group('CrashEvent Payload Tests', () {
    test('Correctly serializes 8.4 KB byte array to Base64 and valid JSON', () {
      final sampleBytes = Uint8List.fromList(List<int>.generate(8400, (i) => i % 256));
      final locationMap = {
        'status': 'ACQUIRED',
        'latitude': 37.7749,
        'longitude': -122.4194,
        'altitude': 15.0,
        'accuracy': 3.5,
      };

      final event = CrashEvent(
        timestamp: DateTime.parse('2026-09-03T21:48:00.000Z'),
        deviceName: 'ESP32_ALERT_DEVICE',
        deviceId: 'AA:BB:CC:DD:EE:FF',
        rawBytes: sampleBytes,
        location: locationMap,
      );

      expect(event.byteCount, 8400);

      // Verify Base64 roundtrip
      final decodedBytes = base64Decode(event.base64Data);
      expect(decodedBytes, sampleBytes);

      // Verify JSON structure
      final json = event.toJson();
      expect(json['event'], 'CRASH_EVENT');
      expect(json['device']['name'], 'ESP32_ALERT_DEVICE');
      expect(json['device']['id'], 'AA:BB:CC:DD:EE:FF');
      expect(json['payload']['size_bytes'], 8400);
      expect(json['payload']['telemetry_base64'], event.base64Data);
      expect(json['location']['latitude'], 37.7749);
      expect(json['location']['longitude'], -122.4194);
      expect(json['gateway_metadata']['agent'], contains('AgeisLink'));
    });

    test('Correctly serializes ESP32 AEGIS_NODE_9842 telemetry for server.py backend', () {
      final sampleBytes = Uint8List.fromList(utf8.encode('{"protocode":"ACKO-2W-TN09-9842"}'));
      final locationMap = {
        'status': 'ACQUIRED',
        'latitude': 12.9716,
        'longitude': 80.0435,
      };

      final event = CrashEvent(
        timestamp: DateTime.parse('2026-09-04T05:30:00.000Z'),
        deviceName: 'AEGIS_NODE_9842',
        deviceId: '6E:40:00:01:B5:A3',
        rawBytes: sampleBytes,
        location: locationMap,
        protocode: 'ACKO-2W-TN09-9842',
        peakShock: 9.84,
        peakRotation: 318.20,
      );

      expect(event.riderId, 'TN09-9842');
      expect(event.effectiveProtocode, 'ACKO-2W-TN09-9842');
      expect(event.effectivePeakShock, 9.84);
      expect(event.effectivePeakRotation, 318.20);

      final json = event.toJson();
      expect(json['rider_id'], 'TN09-9842');
      expect(json['latitude'], 12.9716);
      expect(json['longitude'], 80.0435);
      expect(json['protocode'], 'ACKO-2W-TN09-9842');
      expect(json['peak_shock'], 9.84);
      expect(json['peak_rotation'], 318.20);
      expect(json['kinematics_payload']['peak_g'], 9.84);
      expect(json['kinematics_payload']['tilt_angle'], 318.20);
      expect(json['gateway_metadata']['hardware_node'], 'AEGIS_NODE_9842');
    });
  });
}
