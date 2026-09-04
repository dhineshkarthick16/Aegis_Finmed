import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:ble_test_app/services/data_buffer.dart';

void main() {
  group('CrashDataBuffer Tests', () {
    test('Correctly accumulates chunks and emits 8.4 KB array on reaching target',
        () async {
      const targetSize = 8400; // 8.4 KB
      final buffer = CrashDataBuffer(targetSizeBytes: targetSize);

      Uint8List? completedPayload;
      buffer.crashEventStream.listen((data) {
        completedPayload = data;
      });

      // Send 32 chunks of 256 bytes = 8192 bytes
      for (int i = 0; i < 32; i++) {
        final chunk = List<int>.filled(256, (i % 255));
        buffer.appendChunk(chunk);
      }

      expect(buffer.currentBytes, 8192);
      expect(completedPayload, isNull);
      expect(buffer.progressFraction, closeTo(8192 / 8400, 0.001));

      // Send the final 208 bytes to reach exactly 8400 bytes
      final lastChunk = List<int>.filled(208, 99);
      buffer.appendChunk(lastChunk);

      expect(completedPayload, isNotNull);
      expect(completedPayload!.length, targetSize);
      expect(buffer.currentBytes, 0); // Reset after clean emission
      expect(buffer.chunkCount, 0);

      buffer.dispose();
    });

    test('Handles overflow bytes when chunk exceeds target size', () async {
      const targetSize = 1000;
      final buffer = CrashDataBuffer(targetSizeBytes: targetSize);

      Uint8List? completedPayload;
      buffer.crashEventStream.listen((data) {
        completedPayload = data;
      });

      // Send 900 bytes
      buffer.appendChunk(List<int>.filled(900, 1));
      expect(completedPayload, isNull);

      // Send 200 bytes (total 1100 bytes -> 1000 consumed, 100 overflow retained)
      buffer.appendChunk(List<int>.filled(200, 2));

      expect(completedPayload, isNotNull);
      expect(completedPayload!.length, 1000);
      expect(buffer.currentBytes, 100); // 100 bytes retained in next buffer cycle

      buffer.dispose();
    });

    test('Buffer reset clears state and progress', () {
      final buffer = CrashDataBuffer(targetSizeBytes: 8400);
      buffer.appendChunk(List<int>.filled(500, 1));
      expect(buffer.currentBytes, 500);

      buffer.reset();
      expect(buffer.currentBytes, 0);
      expect(buffer.chunkCount, 0);
      expect(buffer.progressFraction, 0.0);

      buffer.dispose();
    });

    test('Correctly reassembles and decodes ESP32 <CRASH_START>...<CRASH_END> 20-byte chunks', () async {
      final buffer = CrashDataBuffer();

      Uint8List? completedBytes;
      Map<String, dynamic>? decodedJson;

      buffer.crashEventStream.listen((bytes) {
        completedBytes = bytes;
      });

      buffer.parsedCrashStream.listen((json) {
        decodedJson = json;
      });

      const frame = '<CRASH_START>\n{"protocode":"ACKO-2W-TN09-9842","timestamp":1725440000,"peak_shock":9.84,"peak_rotation":318.20,"pre_crash":[],"post_crash":[]}\n<CRASH_END>\n';
      final frameBytes = frame.codeUnits;

      // Stream in 20-byte chunks
      const mtu = 20;
      for (int i = 0; i < frameBytes.length; i += mtu) {
        final end = (i + mtu < frameBytes.length) ? i + mtu : frameBytes.length;
        buffer.appendChunk(frameBytes.sublist(i, end));
      }

      expect(completedBytes, isNotNull);
      expect(decodedJson, isNotNull);
      expect(decodedJson!['protocode'], 'ACKO-2W-TN09-9842');
      expect(decodedJson!['peak_shock'], 9.84);
      expect(decodedJson!['peak_rotation'], 318.20);
      expect(buffer.currentBytes, 0);

      buffer.dispose();
    });
  });
}
