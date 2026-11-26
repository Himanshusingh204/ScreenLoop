// LiveKitRoomWrapper.jsx — Unified LiveKit room provider for Screenloop
// Manages media connections, hardware acceleration, reconnects and audio lifecycle

import React, { useState } from 'react';
import { LiveKitRoom } from '@livekit/components-react';
import '@livekit/components-styles';

export default function LiveKitRoomWrapper({
  token,
  serverUrl,
  audio = true,
  video = false,
  screen = false,
  onDisconnected,
  onError,
  children,
}) {
  const [connectError, setConnectError] = useState(null);

  if (!token || !serverUrl) {
    return (
      <div className="lk-loading-container" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--text-secondary, #94a3b8)',
        gap: '12px'
      }}>
        <div className="loader" />
        <p>Initializing secure LiveKit media session…</p>
      </div>
    );
  }

  const handleError = (error) => {
    console.error('[LiveKit] Connection error:', error);
    setConnectError(error.message || 'Media connection failed');
    if (onError) onError(error);
  };

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      audio={audio}
      video={video}
      screen={screen}
      onError={handleError}
      onDisconnected={onDisconnected}
      data-lk-theme="default"
      style={{ height: '100%', width: '100%', position: 'relative' }}
    >
      {connectError && (
        <div
          role="alert"
          style={{
            position: 'absolute',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(239, 68, 68, 0.9)',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: '8px',
            zIndex: 9999,
            fontSize: '0.875rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          ⚠️ {connectError}
        </div>
      )}
      {children}
    </LiveKitRoom>
  );
}
