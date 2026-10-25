import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  AudioQuality,
  IOSOutputFormat,
  RecordingOptions,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { reportHandledError } from '../monitoring/sentry';
import { MAX_ATTACHMENT_BYTES, PendingAttachment, storedMimeType } from './attachments';
import { readFileBytes } from './fileBytes';

/**
 * Recording settings for a voice note.
 *
 * Deliberately not `RecordingPresets.HIGH_QUALITY`: that is stereo 44.1kHz at
 * 128kbps, which is right for music and wasteful for somebody talking into a
 * phone. Mono at 24kHz and 32kbps is about 4KB a second, so a minute of
 * speech is a quarter of a megabyte — small enough to send on a bad
 * connection and still perfectly clear.
 */
export const VOICE_RECORDING: RecordingOptions = {
  extension: '.m4a',
  sampleRate: 24000,
  numberOfChannels: 1,
  bitRate: 32000,
  android: { outputFormat: 'mpeg4', audioEncoder: 'aac' },
  ios: {
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.MEDIUM,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: { mimeType: 'audio/webm', bitsPerSecond: 32000 },
};

/**
 * Where a recording stops on its own.
 *
 * Five minutes at the bitrate above is well inside the ten-megabyte
 * attachment limit, so the cap is about the format rather than the file: a
 * voice note longer than this is a conversation, and nobody listens to it.
 * The UI stops at the limit rather than refusing afterwards, so the recording
 * is kept instead of thrown away.
 */
export const MAX_VOICE_MS = 5 * 60 * 1000;

/** The type and extension differ by platform: a phone records AAC in an mp4
 * container, a browser records webm. */
const FORMAT = Platform.OS === 'web'
  ? { mime: 'audio/webm', name: 'voice.webm' }
  : { mime: 'audio/mp4', name: 'voice.m4a' };

export type VoiceRecorder = {
  recording: boolean;
  /** Elapsed time, for the counter in the recording bar. */
  durationMs: number;
  /** True once the recording has run to `MAX_VOICE_MS`. */
  atLimit: boolean;
  /** False when the microphone was refused or the recorder would not start. */
  start: () => Promise<boolean>;
  /** Stops and returns the note, or null if nothing usable was captured. */
  stop: () => Promise<PendingAttachment | null>;
  /** Stops and throws the recording away. */
  cancel: () => Promise<void>;
};

/**
 * Records one voice note.
 *
 * The elapsed time is polled rather than pushed, which is what expo-audio
 * offers; 200ms is fine for a counter showing whole seconds and keeps the
 * recording bar from lagging behind the last digit.
 */
export function useVoiceRecorder(): VoiceRecorder {
  const recorder = useAudioRecorder(VOICE_RECORDING);
  const state = useAudioRecorderState(recorder, 200);
  const [recording, setRecording] = useState(false);

  // `stop()` resets the recorder's own state, so the length has to be taken
  // from the last poll before stopping rather than read back afterwards.
  const durationRef = useRef(0);
  if (state.isRecording) durationRef.current = state.durationMillis;

  const durationMs = recording ? state.durationMillis : 0;

  // Leaving the screen mid-recording should not leave the microphone open.
  useEffect(() => {
    return () => {
      if (recorder.isRecording) void recorder.stop();
    };
  }, [recorder]);

  const start = useCallback(async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) return false;

    try {
      // Without this iOS records through the earpiece route and plays nothing
      // back; it also lets the recording continue with the screen locked.
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      durationRef.current = 0;
      recorder.record();
      setRecording(true);
      return true;
    } catch (error) {
      reportHandledError(error, { where: 'start voice recording' });
      return false;
    }
  }, [recorder]);

  const finish = useCallback(async (): Promise<string | null> => {
    if (!recording) return null;
    setRecording(false);
    try {
      await recorder.stop();
      // Recording leaves the audio session in record mode, which makes
      // playback quiet on iOS — hand it back before anything is played.
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      return recorder.uri;
    } catch (error) {
      reportHandledError(error, { where: 'stop voice recording' });
      return null;
    }
  }, [recorder, recording]);

  const stop = useCallback(async (): Promise<PendingAttachment | null> => {
    const uri = await finish();
    if (!uri) return null;

    const duration = durationRef.current;
    // Under a third of a second is a mis-tap, not a message.
    if (duration < 350) return null;

    try {
      const bytes = await readFileBytes(uri);
      if (bytes.length === 0 || bytes.length > MAX_ATTACHMENT_BYTES) return null;

      return {
        kind: 'voice',
        uri,
        bytes,
        mime: storedMimeType(FORMAT.mime, 'voice'),
        name: FORMAT.name,
        size: bytes.length,
        width: null,
        height: null,
        durationMs: duration,
      };
    } catch (error) {
      reportHandledError(error, { where: 'read voice recording' });
      return null;
    }
  }, [finish]);

  const cancel = useCallback(async () => {
    await finish();
  }, [finish]);

  return {
    recording,
    durationMs,
    atLimit: recording && state.durationMillis >= MAX_VOICE_MS,
    start,
    stop,
    cancel,
  };
}
