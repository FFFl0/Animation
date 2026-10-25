import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const mockReports: { message: string; area: string; hasStack: boolean }[] = [];

jest.mock('../sentry', () => ({
  isCrashReportingEnabled: true,
  reportCrash: (error: Error, context: { area: string; componentStack: string }) => {
    mockReports.push({
      message: error.message,
      area: context.area,
      hasStack: context.componentStack.length > 0,
    });
  },
}));

import ErrorBoundary from '../ErrorBoundary';

/** Throws on the first render and behaves on the next, the way a screen that
 * crashed on bad state does once it has been rebuilt. */
function Flaky({ throwNow }: { throwNow: () => boolean }) {
  if (throwNow()) throw new Error('screen blew up');
  return null;
}

function Fallback({ onRetry }: { onRetry: () => void }) {
  return <>{React.createElement('fallback', { onRetry })}</>;
}

function render(ui: React.ReactElement) {
  let tree: TestRenderer.ReactTestRenderer | null = null;
  act(() => {
    tree = TestRenderer.create(ui);
  });
  return tree!;
}

beforeEach(() => {
  mockReports.length = 0;
  // React logs caught errors; the test is about the recovery, not the noise.
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('shows the fallback instead of letting the error through', () => {
    const tree = render(
      <ErrorBoundary area="test" fallback={(_e, retry) => <Fallback onRetry={retry} />}>
        <Flaky throwNow={() => true} />
      </ErrorBoundary>
    );
    expect(tree.root.findAllByType('fallback' as never)).toHaveLength(1);
  });

  it('hands the fallback the error it caught', () => {
    const caught: Error[] = [];
    render(
      <ErrorBoundary
        area="test"
        fallback={(error, retry) => {
          caught.push(error);
          return <Fallback onRetry={retry} />;
        }}
      >
        <Flaky throwNow={() => true} />
      </ErrorBoundary>
    );
    expect(caught[0]?.message).toBe('screen blew up');
  });

  it('reports the crash with the area and the component stack', () => {
    render(
      <ErrorBoundary area="screens" fallback={(_e, retry) => <Fallback onRetry={retry} />}>
        <Flaky throwNow={() => true} />
      </ErrorBoundary>
    );
    expect(mockReports).toHaveLength(1);
    expect(mockReports[0]).toMatchObject({ message: 'screen blew up', area: 'screens', hasStack: true });
  });

  it('rebuilds the children when retried, so a recoverable screen comes back', () => {
    let fail = true;
    const tree = render(
      <ErrorBoundary area="test" fallback={(_e, retry) => <Fallback onRetry={retry} />}>
        <Flaky throwNow={() => fail} />
      </ErrorBoundary>
    );
    expect(tree.root.findAllByType('fallback' as never)).toHaveLength(1);

    fail = false;
    act(() => {
      tree.root.findByType('fallback' as never).props.onRetry();
    });
    expect(tree.root.findAllByType('fallback' as never)).toHaveLength(0);
  });

  it('shows the fallback again if the retry hits the same crash', () => {
    const tree = render(
      <ErrorBoundary area="test" fallback={(_e, retry) => <Fallback onRetry={retry} />}>
        <Flaky throwNow={() => true} />
      </ErrorBoundary>
    );
    act(() => {
      tree.root.findByType('fallback' as never).props.onRetry();
    });
    expect(tree.root.findAllByType('fallback' as never)).toHaveLength(1);
    expect(mockReports).toHaveLength(2);
  });

  it('stays out of the way when nothing throws', () => {
    const tree = render(
      <ErrorBoundary area="test" fallback={(_e, retry) => <Fallback onRetry={retry} />}>
        <Flaky throwNow={() => false} />
      </ErrorBoundary>
    );
    expect(tree.root.findAllByType('fallback' as never)).toHaveLength(0);
    expect(mockReports).toHaveLength(0);
  });
});
