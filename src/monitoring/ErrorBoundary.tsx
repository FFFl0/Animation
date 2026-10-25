import { Component, ErrorInfo, ReactNode } from 'react';
import { reportCrash } from './sentry';

type Props = {
  children: ReactNode;
  /**
   * What to show instead of the children. Given the error and a way back, so
   * one boundary can be used with a plain fallback where no providers are
   * available and a themed one where they are.
   */
  fallback: (error: Error, retry: () => void) => ReactNode;
  /** Names this boundary in the crash report, so "which half broke" is
   * answered without reading the stack. */
  area: string;
};

type State = { error: Error | null };

/**
 * Stops one broken screen from taking the whole app with it.
 *
 * React has no recovery of its own: an error thrown while rendering — or
 * inside an effect, which is where both of this app's shipped crashes came
 * from — unmounts the entire tree, and on a release build that reads as the
 * app vanishing. A boundary turns that into a screen the player can act on.
 *
 * Retrying works because React has already unmounted everything below this
 * point. Rendering the children again builds them fresh, so whatever state
 * led to the crash is gone and the app comes back on its first screen. The
 * providers sit above this, so the player is still signed in.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // The component stack says which screen died, which the JS stack often
    // does not once the code has been minified.
    reportCrash(error, { area: this.props.area, componentStack: info.componentStack ?? '' });
  }

  retry = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (error) return this.props.fallback(error, this.retry);
    return this.props.children;
  }
}
