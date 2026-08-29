// LogoBrand.jsx — SVG icon + "Screenloop" text. Replaces 4.2 MB Logo.png with ~1 KB inline SVG.
import React from 'react';

export default function LogoBrand({ size = 38, className = '', style = {} }) {
  return (
    <span className={`logo-brand ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, ...style }}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width={size} height={size} aria-hidden="true">
        <defs>
          <linearGradient id="lb-accent" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c5cfc" />
            <stop offset="100%" stopColor="#ff4d85" />
          </linearGradient>
        </defs>
        <rect width="512" height="512" rx="110" fill="#0f0f13" />
        <rect x="96" y="126" width="320" height="220" rx="24" fill="none" stroke="#fff" strokeOpacity="0.9" strokeWidth="20" />
        <path d="M216 346h80M256 346v60M196 406h120" stroke="#fff" strokeOpacity="0.9" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M166 236c0-50 70-50 90 0s90 50 90 0-70-50-90 0-90 50-90 0z" fill="none" stroke="url(#lb-accent)" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" />
        <polygon points="246,222 274,236 246,250" fill="#fff" />
      </svg>
      <span style={{ fontSize: size * 0.42, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
        Screenloop
      </span>
    </span>
  );
}
