/**
 * Guards the crash that happened on leaving any chat.
 *
 * `useAudioRecorder` releases its native object when the component unmounts,
 * and React runs effect cleanups in the order the effects were declared — so
 * the library's cleanup runs before this hook's. Reading a property off the
 * recorder there is a use-after-release, which throws in expo-modules-core
 * and takes the app down, because the throw happens inside an effect.
 *
 * The mock below reproduces exactly that: a recorder whose properties throw
 * once released, released by the same hook the real one is.
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const mockReleased: string[] = [];
const mockAudioModeCalls: unknown[] = [];

jest.mock('../../monitoring/sentry', () => ({ reportHandledError: () => {} }));
jest.mock('../fileBytes', () => ({ readFileBytes: async () => new Uint8Array(4) }));

jest.mock('expo-audio', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const react = require('react') as typeof React;

  const makeRecorder = () => {
    let released = false;
    const guard = <T,>(value: T): T => {
      if (released) {
        throw new Error('Unable to find the native object. It may have been released.');
      }
      return value;
    };
    return {
      id: 'rec-1',
      get isRecording() {
        return guard(false);
      },
      get uri() {
        return guard('file:///voice.m4a');
      },
      prepareToRecordAsync: async () => guard(undefined),
      record: () => guard(undefined),
      stop: async () => guard(undefined),
      getStatus: () => guard({ canRecord: true, isRecording: false, durationMillis: 0, url: null }),
      release: () => {
        released = true;
        mockReleased.push('rec-1');
      },
    };
  };

  return {
    AudioQuality: { MEDIUM: 'medium' },
    IOSOutputFormat: { MPEG4AAC: 'aac ' },
    requestRecordingPermissionsAsync: async () => ({ granted: true }),
    setAudioModeAsync: async (mode: unknown) => {
      mockAudioModeCalls.push(mode);
    },
    // The real hook releases on unmount, and registers that cleanup before
    // anything the calling hook adds afterwards.
    useAudioRecorder: () => {
      const recorder = react.useMemo(makeRecorder, []);
      react.useEffect(() => () => recorder.release(), [recorder]);
      return recorder;
    },
    useAudioRecorderState: () => ({
      canRecord: true,
      isRecording: false,
      durationMillis: 0,
      mediaServicesDidReset: false,
      url: null,
    }),
  };
});

import { useVoiceRecorder } from '../voiceRecorder';

function Probe() {
  useVoiceRecorder();
  return null;
}

beforeEach(() => {
  mockReleased.length = 0;
  mockAudioModeCalls.length = 0;
});

/** Mount and unmount the way a screen does, with every step committed. */
function mountThenUnmount(element: React.ReactElement) {
  let tree: TestRenderer.ReactTestRenderer | null = null;
  act(() => {
    tree = TestRenderer.create(element);
  });
  act(() => {
    tree!.unmount();
  });
}

describe('useVoiceRecorder', () => {
  it('unmounts without touching the recorder the library has already released', () => {
    expect(() => mountThenUnmount(<Probe />)).not.toThrow();
    // The fake really did release it, so the test could have caught a touch.
    expect(mockReleased).toEqual(['rec-1']);
  });

  it('leaves the audio session alone when nothing was ever recorded', () => {
    mountThenUnmount(<Probe />);
    expect(mockAudioModeCalls).toEqual([]);
  });

  it('mounts and unmounts repeatedly, the way moving between chats does', () => {
    for (let i = 0; i < 5; i += 1) {
      expect(() => mountThenUnmount(<Probe />)).not.toThrow();
    }
    expect(mockReleased).toHaveLength(5);
  });
});

describe('the fake matches expo-modules-core', () => {
  it('throws when a released recorder is read, which is what made this fatal', () => {
    let captured: { isRecording: boolean; release: () => void } | null = null;
    function Capture() {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { useAudioRecorder } = require('expo-audio');
      captured = useAudioRecorder();
      return null;
    }
    mountThenUnmount(<Capture />);
    expect(() => captured!.isRecording).toThrow(/released/);
  });
});
