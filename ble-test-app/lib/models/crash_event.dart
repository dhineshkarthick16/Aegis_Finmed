import 'dart:convert';
import 'dart:typed_data';

/// Represents a crash telemetry event captured by the IoT Edge Gateway.
class CrashEvent {
  final DateTime timestamp;
  final String deviceName;
  final String deviceId;
  final Uint8List rawBytes;
  final Map<String, dynamic> location;
  final String eventType;

  final String? protocode;
  final double? peakShock;
  final double? peakRotation;
  final Map<String, dynamic>? parsedJson;

  CrashEvent({
    required this.timestamp,
    required this.deviceName,
    required this.deviceId,
    required this.rawBytes,
    required this.location,
    this.eventType = 'CRASH_EVENT',
    this.protocode,
    this.peakShock,
    this.peakRotation,
    this.parsedJson,
  });

  /// Base64 encoded representation of the raw byte array
  String get base64Data => base64Encode(rawBytes);

  /// Total size of the reassembled payload in bytes
  int get byteCount => rawBytes.length;

  /// Effective protocode from either direct argument or parsed JSON
  String get effectiveProtocode =>
      protocode ??
      (parsedJson?['protocode'] as String?) ??
      'ACKO-2W-TN09-9842';

  /// Effective peak shock in Gs
  double get effectivePeakShock {
    if (peakShock != null) return peakShock!;
    final parsed = parsedJson?['peak_shock'];
    if (parsed is num) return parsed.toDouble();
    if (parsed is String) return double.tryParse(parsed) ?? 9.8;
    return 9.8;
  }

  /// Effective peak rotation in deg/s
  double get effectivePeakRotation {
    if (peakRotation != null) return peakRotation!;
    final parsed = parsedJson?['peak_rotation'];
    if (parsed is num) return parsed.toDouble();
    if (parsed is String) return double.tryParse(parsed) ?? 320.0;
    return 74.0;
  }

  /// Rider ID extracted from protocode or device
  String get riderId {
    final proto = effectiveProtocode;
    if (proto.contains('-')) {
      final parts = proto.split('-');
      if (parts.length >= 3) {
        return parts.sublist(parts.length - 2).join('-');
      }
    }
    return deviceName.isNotEmpty ? deviceName : deviceId;
  }

  /// Serializes into JSON payload required by both AegisLink backend and mock endpoints
  Map<String, dynamic> toJson() {
    final lat = location['latitude'] ?? 12.9716;
    final lng = location['longitude'] ?? 80.0435;

    return {
      'event': eventType,
      'timestamp': timestamp.toUtc().toIso8601String(),
      // Top-level fields required by AegisLink server.py (/api/crash-report)
      'rider_id': riderId,
      'latitude': lat,
      'longitude': lng,
      'protocode': effectiveProtocode,
      'peak_shock': effectivePeakShock,
      'peak_rotation': effectivePeakRotation,
      'kinematics_payload': {
        'peak_g': effectivePeakShock,
        'tilt_angle': effectivePeakRotation,
        'pre_speed_kmh': 48.5,
        'protocode': effectiveProtocode,
        'payload_hash': 'al-${timestamp.millisecondsSinceEpoch.toRadixString(16)}',
        if (parsedJson != null) 'firmware_data': parsedJson,
      },
      // Original structured fields for backwards compatibility and audit logging
      'device': {
        'name': deviceName,
        'id': deviceId,
      },
      'payload': {
        'size_bytes': byteCount,
        'size_kb': (byteCount / 1024).toStringAsFixed(2),
        'telemetry_base64': base64Data,
      },
      'location': location,
      'gateway_metadata': {
        'agent': 'AgeisLink IoT Edge Gateway',
        'version': '1.0.0',
        'hardware_node': 'AEGIS_NODE_9842',
      }
    };
  }

  /// Serializes into the exact schema required by the Supabase `crash_events` database table
  Map<String, dynamic> toSupabaseJson() {
    final lat = location['latitude'] is num
        ? (location['latitude'] as num).toDouble()
        : 12.9716;
    final lng = location['longitude'] is num
        ? (location['longitude'] as num).toDouble()
        : 80.2209;
    final accuracy = location['accuracy'] is num
        ? (location['accuracy'] as num).toDouble()
        : 5.0;

    List<dynamic> preCrash = [];
    List<dynamic> postCrash = [];

    if (parsedJson != null) {
      if (parsedJson!['pre_crash'] is List) {
        preCrash = parsedJson!['pre_crash'] as List;
      }
      if (parsedJson!['post_crash'] is List) {
        postCrash = parsedJson!['post_crash'] as List;
      }
    }

    if (preCrash.isEmpty) {
      preCrash = [
        {
          'timestamp_ms': 1000,
          'ax': 0.12,
          'ay': 0.98,
          'az': -0.05,
          'gx': 1.2,
          'gy': -0.8,
          'gz': 0.4
        },
        {
          'timestamp_ms': 1100,
          'ax': 0.15,
          'ay': 1.02,
          'az': -0.03,
          'gx': 1.5,
          'gy': -0.5,
          'gz': 0.2
        },
      ];
    }

    if (postCrash.isEmpty) {
      postCrash = [
        {
          'timestamp_ms': 2000,
          'ax': -4.20,
          'ay': effectivePeakShock,
          'az': 3.10,
          'gx': 145.2,
          'gy': effectivePeakRotation,
          'gz': 88.1
        },
        {
          'timestamp_ms': 2100,
          'ax': -1.20,
          'ay': 3.40,
          'az': 1.10,
          'gx': 45.2,
          'gy': 20.1,
          'gz': 15.4
        },
      ];
    }

    return {
      'protocode': effectiveProtocode,
      'event_timestamp': timestamp.toUtc().toIso8601String(),
      'latitude': lat,
      'longitude': lng,
      'gps_accuracy_m': accuracy,
      'pre_crash_data': preCrash,
      'post_crash_data': postCrash,
    };
  }

  /// Formatted JSON string for display and logging
  String toPrettyJson() {
    const encoder = JsonEncoder.withIndent('  ');
    return encoder.convert(toJson());
  }
}
