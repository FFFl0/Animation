import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

type UrlListener = (event: { url: string }) => void;

const mockListeners: UrlListener[] = [];
let mockRemoveCount = 0;
let mockInitialUrl: string | null = null;
// Set to hold getInitialURL open, for the case where it settles after the
// component is already gone. It has to go through the mock factory: the hook
// imports the module as a namespace, which Babel copies, so reassigning
// `getInitialURL` from the test would not reach the hook's own reference.
let mockInitialPending: Promise<string | null> | null = null;

jest.mock('expo-linking', () => ({
  createURL: (path: string) => `animequiz://${path}`,
  getInitialURL: () => mockInitialPending ?? Promise.resolve(mockInitialUrl),
  addEventListener: (_type: string, handler: UrlListener) => {
    mockListeners.push(handler);
    return {
      remove: () => {
        mockRemoveCount += 1;
        const at = mockListeners.indexOf(handler);
        if (at >= 0) mockListeners.splice(at, 1);
      },
    };
  },
}));

import { useBattleInviteLink } from '../useBattleInviteLink';

function Probe({ onInvite }: { onInvite: (code: string) => void }) {
  useBattleInviteLink(onInvite);
  return null;
}

/** Mounts and lets the getInitialURL promise settle, the way the app does
 * before its first paint. */
async function mount(ui: React.ReactElement) {
  let tree: TestRenderer.ReactTestRenderer | null = null;
  await act(async () => {
    tree = TestRenderer.create(ui);
  });
  return tree!;
}

function deliver(url: string) {
  act(() => {
    for (const listener of [...mockListeners]) listener({ url });
  });
}

beforeEach(() => {
  mockListeners.length = 0;
  mockRemoveCount = 0;
  mockInitialUrl = null;
  mockInitialPending = null;
});

describe('useBattleInviteLink', () => {
  it('reports the invite the app was opened with', async () => {
    mockInitialUrl = 'animequiz://battle/QW7XK';
    const codes: string[] = [];
    await mount(<Probe onInvite={(code) => codes.push(code)} />);
    expect(codes).toEqual(['QW7XK']);
  });

  it('reports an invite that arrives while the app is already running', async () => {
    const codes: string[] = [];
    await mount(<Probe onInvite={(code) => codes.push(code)} />);
    deliver('animequiz://battle/ABCDE');
    expect(codes).toEqual(['ABCDE']);
  });

  it('reports the same invite again, so re-tapping a link still works', async () => {
    const codes: string[] = [];
    await mount(<Probe onInvite={(code) => codes.push(code)} />);
    deliver('animequiz://battle/ABCDE');
    deliver('animequiz://battle/ABCDE');
    expect(codes).toEqual(['ABCDE', 'ABCDE']);
  });

  it('leaves the other deep links alone', async () => {
    mockInitialUrl = 'animequiz://#access_token=a&refresh_token=b&type=recovery';
    const codes: string[] = [];
    await mount(<Probe onInvite={(code) => codes.push(code)} />);
    deliver('animequiz://#access_token=a&refresh_token=b');
    deliver('animequiz://chat/ABCDE');
    expect(codes).toEqual([]);
  });

  it('subscribes once and calls the newest callback', async () => {
    const first: string[] = [];
    const second: string[] = [];
    const tree = await mount(<Probe onInvite={(code) => first.push(code)} />);
    act(() => {
      tree.update(<Probe onInvite={(code) => second.push(code)} />);
    });
    expect(mockListeners).toHaveLength(1);
    deliver('animequiz://battle/ABCDE');
    expect(first).toEqual([]);
    expect(second).toEqual(['ABCDE']);
  });

  it('removes its listener on unmount', async () => {
    const tree = await mount(<Probe onInvite={() => {}} />);
    act(() => {
      tree.unmount();
    });
    expect(mockRemoveCount).toBe(1);
    expect(mockListeners).toHaveLength(0);
  });

  it('does not report an invite that resolves after unmount', async () => {
    let release: ((url: string | null) => void) | null = null;
    mockInitialPending = new Promise<string | null>((resolve) => {
      release = resolve;
    });

    const codes: string[] = [];
    let tree: TestRenderer.ReactTestRenderer | null = null;
    act(() => {
      tree = TestRenderer.create(<Probe onInvite={(code) => codes.push(code)} />);
    });
    act(() => {
      tree!.unmount();
    });
    await act(async () => {
      release!('animequiz://battle/ABCDE');
      await mockInitialPending;
    });

    expect(codes).toEqual([]);
  });
});
