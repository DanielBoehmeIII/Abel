import React from 'react';
import { trackEvent } from '../../lib/analytics';
import './SystemOverlays.css';

interface State {
  error?: Error;
}

export default class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    trackEvent('react_error_boundary', {
      message: error.message,
      componentStack: info.componentStack,
    });
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="system-fatal">
        <div className="system-fatal-panel">
          <p className="system-kicker">ABEL RUNTIME</p>
          <h1>Something broke in the interface.</h1>
          <p>Reload Abel. If it happens again, export your data from Settings after reload and include the error below in feedback.</p>
          <pre>{this.state.error.message}</pre>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      </div>
    );
  }
}
