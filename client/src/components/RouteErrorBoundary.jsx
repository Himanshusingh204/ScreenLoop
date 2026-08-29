import React from 'react';
import { Link } from 'react-router-dom';

export class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[RouteErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: 'var(--space-6)',
          textAlign: 'center',
          color: 'var(--text-primary)',
        }}>
          <h2 style={{ marginBottom: 'var(--space-3)' }}>Something went wrong</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', maxWidth: 400 }}>
            This page encountered an error. You can try refreshing or go back to the home page.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Link to="/" className="btn btn-primary btn-sm">Go Home</Link>
            <button onClick={() => window.location.reload()} className="btn btn-secondary btn-sm">
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
