import React from 'react';

export default function MeetDeviceModal({ devices, selectedCamera, selectedMic, onSelectCamera, onSelectMic, onClose }) {
  return (
    <>
      <div className="meet-drawer-overlay" onClick={onClose} />
      <div className="meet-device-modal">
        <div className="meet-device-modal-header">
          <h2>Settings</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close settings">✕</button>
        </div>
        
        <div className="meet-device-modal-field">
          <label>Camera</label>
          <select
            value={selectedCamera}
            onChange={(e) => onSelectCamera(e.target.value)}
          >
            {devices.cameras.map(d => (
              <option key={d.deviceId} value={d.deviceId}>{d.label || 'Camera'}</option>
            ))}
          </select>
        </div>

        <div className="meet-device-modal-field">
          <label>Microphone</label>
          <select
            value={selectedMic}
            onChange={(e) => onSelectMic(e.target.value)}
          >
            {devices.mics.map(d => (
              <option key={d.deviceId} value={d.deviceId}>{d.label || 'Microphone'}</option>
            ))}
          </select>
        </div>

        <button className="btn btn-secondary btn-md meet-device-modal-close" onClick={onClose}>
          Close
        </button>
      </div>
    </>
  );
}
