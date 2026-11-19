import React from 'react';
import {
  Microphone, MicrophoneSlash, MonitorPlay, Phone,
  Smiley, Users, ChatTeardropText, Info, Hand,
} from '../icons';

export default function MeetControlBar({
  micOn,
  cameraOn,
  handRaised,
  onToggleMic,
  onToggleCamera,
  onToggleHand,
  onShareScreen,
  onToggleReactions,
  onToggleChat,
  onTogglePeople,
  onToggleInfo,
  onLeave,
  meetId,
  chatCount,
  participantCount,
}) {
  return (
    <div className="meet-controlbar">
      <div className="meet-controlbar-left">
        <span style={{ fontWeight: 600 }}>Meet</span>
        <span style={{ opacity: 0.6 }}>•</span>
        <button className="btn btn-ghost btn-sm" onClick={onToggleInfo} aria-label="Meeting info">
          <Info size={16} /> Info
        </button>
      </div>

      <div className="meet-controlbar-center">
        {/* Mic */}
        <button
          className={`meet-ctrl-btn ${!micOn ? 'muted' : ''}`}
          onClick={onToggleMic}
          aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
        >
          {micOn ? <Microphone size={22} /> : <MicrophoneSlash size={22} />}
        </button>

        {/* Camera toggle (visual-only for now) */}
        <button
          className={`meet-ctrl-btn ${!cameraOn ? 'muted' : ''}`}
          onClick={onToggleCamera}
          aria-label={cameraOn ? 'Turn off camera' : 'Turn on camera'}
        >
          <span role="img" aria-label="camera">{cameraOn ? '📷' : '📷❌'}</span>
        </button>

        {/* Screen share */}
        <button
          className="meet-ctrl-btn"
          onClick={onShareScreen}
          aria-label="Share screen"
        >
          <MonitorPlay size={22} />
        </button>

        {/* Reactions */}
        <button
          className="meet-ctrl-btn"
          onClick={onToggleReactions}
          aria-label="Reactions"
        >
          <Smiley size={22} />
        </button>

        {/* Raise hand */}
        <button
          className={`meet-ctrl-btn ${handRaised ? 'active' : ''}`}
          onClick={onToggleHand}
          aria-label={handRaised ? 'Lower hand' : 'Raise hand'}
        >
          <Hand size={22} />
        </button>

        {/* End call */}
        <button
          className="meet-ctrl-btn end-call"
          onClick={onLeave}
          aria-label="Leave meeting"
        >
          <Phone size={22} style={{ transform: 'rotate(135deg)' }} />
        </button>
      </div>

      <div className="meet-controlbar-right">
        {/* Chat */}
        <button
          className="meet-ctrl-btn"
          onClick={onToggleChat}
          aria-label="Chat"
          style={{ position: 'relative' }}
        >
          <ChatTeardropText size={22} />
          {chatCount > 0 && <span className="badge">{chatCount > 99 ? '99+' : chatCount}</span>}
        </button>

        {/* People */}
        <button
          className="meet-ctrl-btn"
          onClick={onTogglePeople}
          aria-label="People"
          style={{ position: 'relative' }}
        >
          <Users size={22} />
          {participantCount > 1 && <span className="badge">{participantCount}</span>}
        </button>
      </div>
    </div>
  );
}
