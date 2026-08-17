// ErrorBoundary.jsx — Catches unhandled React errors and shows a recovery UI
import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-page">
          <div className="error-boundary-card">
            <div className="error-boundary-icon">💥</div>
            <h1 className="error-boundary-title">Something went wrong</h1>
            <p className="error-boundary-message">
              An unexpected error occurred. Your session may have been affected.
            </p>
            <details className="error-boundary-details">
              <summary>Error details</summary>
              <pre>{this.state.error?.message}</pre>
            </details>
            <div className="error-boundary-actions">
              <button className="btn btn-primary btn-sm" onClick={this.handleReload}>
                Reload Page
              </button>
              <button className="btn btn-ghost btn-sm" onClick={this.handleGoHome}>
                Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
