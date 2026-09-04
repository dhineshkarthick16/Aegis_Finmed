import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

/// Reassembles incoming BLE byte chunks.
/// Supports both:
/// 1. Hardware Delimited Framing: detects <CRASH_START> ... <CRASH_END> and extracts JSON payload.
/// 2. Byte Count Buffering: accumulates chunks until targetSizeBytes (e.g. 8.4 KB).
class CrashDataBuffer {
  /// Default target size for crash event telemetry (8.4 KB = 8,400 bytes)
  static const int defaultTargetSizeBytes = 8400;

  static const String startDelimiter = '<CRASH_START>';
  static const String endDelimiter = '<CRASH_END>';

  final int targetSizeBytes;
  final BytesBuilder _builder = BytesBuilder(copy: false);
  final StringBuffer _textBuffer = StringBuffer();

  int _chunkCount = 0;
  DateTime? _firstChunkTimestamp;
  DateTime? _lastChunkTimestamp;
  bool _isReceivingFramedCrash = false;

  Map<String, dynamic>? _lastParsedPayload;

  final StreamController<double> _progressController =
      StreamController<double>.broadcast(sync: true);
  final StreamController<Uint8List> _crashEventController =
      StreamController<Uint8List>.broadcast(sync: true);
  final StreamController<Map<String, dynamic>> _parsedCrashController =
      StreamController<Map<String, dynamic>>.broadcast(sync: true);

  CrashDataBuffer({this.targetSizeBytes = defaultTargetSizeBytes});

  /// Stream of completion progress from 0.0 to 1.0 (0% to 100%)
  Stream<double> get progressStream => _progressController.stream;

  /// Stream emitting completed crash telemetry byte arrays
  Stream<Uint8List> get crashEventStream => _crashEventController.stream;

  /// Stream emitting parsed crash JSON data from firmware
  Stream<Map<String, dynamic>> get parsedCrashStream =>
      _parsedCrashController.stream;

  /// Last parsed JSON payload from <CRASH_START> ... <CRASH_END>
  Map<String, dynamic>? get lastParsedPayload => _lastParsedPayload;

  bool get isReceivingFramedCrash => _isReceivingFramedCrash;

  /// Number of bytes currently collected in the buffer
  int get currentBytes => _builder.length;

  /// Total number of chunks received for current buffer
  int get chunkCount => _chunkCount;

  /// Progress fraction (0.0 to 1.0)
  double get progressFraction {
    if (_isReceivingFramedCrash) {
      // While streaming framed payload, estimate based on typical 6KB payload
      const estTotal = 6000;
      final frac = _builder.length / estTotal;
      return frac > 0.95 ? 0.95 : frac;
    }
    if (targetSizeBytes <= 0) return 1.0;
    final frac = _builder.length / targetSizeBytes;
    return frac > 1.0 ? 1.0 : frac;
  }

  /// Progress percentage (0 to 100)
  double get progressPercentage => progressFraction * 100.0;

  /// Calculates the transfer throughput in KB/s
  double get throughputKbps {
    if (_firstChunkTimestamp == null || _lastChunkTimestamp == null) return 0.0;
    final elapsedMs =
        _lastChunkTimestamp!.difference(_firstChunkTimestamp!).inMilliseconds;
    if (elapsedMs <= 0) return 0.0;
    return (_builder.length / 1024.0) / (elapsedMs / 1000.0);
  }

  /// Appends an incoming chunk of bytes to the internal buffer.
  void appendChunk(List<int> chunk) {
    if (chunk.isEmpty) return;

    final now = DateTime.now();
    _firstChunkTimestamp ??= now;
    _lastChunkTimestamp = now;
    _chunkCount++;

    _builder.add(chunk);

    // Try decoding text for <CRASH_START> and <CRASH_END> protocol markers
    try {
      final chunkText = utf8.decode(chunk, allowMalformed: true);
      _textBuffer.write(chunkText);
      final currentFullText = _textBuffer.toString();

      if (currentFullText.contains(startDelimiter)) {
        _isReceivingFramedCrash = true;
      }

      if (_isReceivingFramedCrash && currentFullText.contains(endDelimiter)) {
        final startIndex = currentFullText.indexOf(startDelimiter);
        final endIndex = currentFullText.indexOf(endDelimiter);

        if (endIndex > startIndex) {
          final jsonSection = currentFullText
              .substring(startIndex + startDelimiter.length, endIndex)
              .trim();

          Map<String, dynamic>? parsedJson;
          try {
            parsedJson = jsonDecode(jsonSection) as Map<String, dynamic>?;
          } catch (_) {
            // Extract innermost JSON object if extra whitespace or symbols
            final firstBrace = jsonSection.indexOf('{');
            final lastBrace = jsonSection.lastIndexOf('}');
            if (firstBrace != -1 && lastBrace > firstBrace) {
              try {
                final cleanJson =
                    jsonSection.substring(firstBrace, lastBrace + 1);
                parsedJson = jsonDecode(cleanJson) as Map<String, dynamic>?;
              } catch (_) {}
            }
          }

          _lastParsedPayload = parsedJson;
          if (parsedJson != null) {
            _parsedCrashController.add(parsedJson);
          }

          final fullPayloadBytes =
              Uint8List.fromList(utf8.encode(jsonSection));

          // Clean up buffers
          _textBuffer.clear();
          final leftover =
              currentFullText.substring(endIndex + endDelimiter.length);
          if (leftover.isNotEmpty) {
            _textBuffer.write(leftover);
          }
          _builder.clear();
          _chunkCount = 0;
          _isReceivingFramedCrash = false;
          _firstChunkTimestamp = null;

          _progressController.add(1.0);
          _crashEventController.add(fullPayloadBytes);
          return;
        }
      }
    } catch (_) {
      // Non-UTF8 chunks fallback to byte counter
    }

    final currentLen = _builder.length;
    _progressController.add(progressFraction);

    // Fallback: If not in framed mode and byte count reached target
    if (!_isReceivingFramedCrash && currentLen >= targetSizeBytes) {
      final allBytes = _builder.takeBytes();

      // Extract exactly targetSizeBytes for the current crash event
      final completedEventData = Uint8List.fromList(
        allBytes.sublist(0, targetSizeBytes),
      );

      // Retain any excess overflow bytes for next event cycle
      if (allBytes.length > targetSizeBytes) {
        final overflowBytes = allBytes.sublist(targetSizeBytes);
        _builder.add(overflowBytes);
        _chunkCount = 1;
        _firstChunkTimestamp = DateTime.now();
      } else {
        _chunkCount = 0;
        _firstChunkTimestamp = null;
      }

      _progressController.add(progressFraction);
      _crashEventController.add(completedEventData);
    }
  }

  /// Resets the buffer and metrics
  void reset() {
    _builder.clear();
    _textBuffer.clear();
    _chunkCount = 0;
    _isReceivingFramedCrash = false;
    _firstChunkTimestamp = null;
    _lastChunkTimestamp = null;
    _lastParsedPayload = null;
    _progressController.add(0.0);
  }

  /// Disposes internal stream controllers
  void dispose() {
    _progressController.close();
    _crashEventController.close();
    _parsedCrashController.close();
  }
}
