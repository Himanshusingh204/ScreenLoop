// Loader.jsx — Spinner and loading page
import React from 'react';

export function Loader({ size = 'md' }) {
  const scale = size === 'sm' ? 'width:16px;height:16px' : '';
  return <div className="loader" style={scale ? { width: 16, height: 16 } : {}} />;
}

export function LoaderPage({ text = 'Connecting…' }) {
  return (
    <div className="loader-page">
      <div className="loader" style={{ width: 32, height: 32, borderWidth: 3 }} />
      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{text}</span>
    </div>
  );
}
