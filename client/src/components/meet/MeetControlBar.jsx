import React, { useState } from 'react';
import {
  Microphone, MicrophoneSlash, VideoCamera, MonitorPlay, Phone,
  Smiley, Users, ChatTeardropText, Info, Hand, GearSix, ShareNetwork, Check
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
  onToggleSettings,
  onLeave,
  meetId,
  chatCount,
  participantCount,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="meet-controlbar">
      <div className="meet-controlbar-left">
        <span style={{ fontWeight: 600 }}>Meet</span>
        <span style={{ opacity: 0.6 }}>•</span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleCopyLink}
          title="Copy meeting link to invite others"
          aria-label="Copy meeting link"
        >
          {copied ? <Check size={16} color="var(--success, #22c55e)" /> : <ShareNetwork size={16} />}
          <span>{copied ? 'Copied!' : 'Invite'}</span>
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={onToggleInfo}
          aria-label="Meeting info"
          title="Meeting Info"
        >
          <Info size={16} />
        </button>
      </div>

      <div className="meet-controlbar-center">
        {/* Mic Toggle */}
        <button
          className={`meet-ctrl-btn ${!micOn ? 'muted' : ''}`}
          onClick={onToggleMic}
          aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
          title={micOn ? 'Mute Mic' : 'Unmute Mic'}
        >
          {micOn ? <Microphone size={22} /> : <MicrophoneSlash size={22} />}
        </button>

        {/* Camera Toggle */}
        <button
          className={`meet-ctrl-btn ${!cameraOn ? 'muted' : ''}`}
          onClick={onToggleCamera}
          aria-label={cameraOn ? 'Turn off camera' : 'Turn on camera'}
          title={cameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
        >
          <VideoCamera size={22} weight={cameraOn ? 'regular' : 'fill'} />
        </button>

        {/* Screen share */}
        <button
          className="meet-ctrl-btn"
          onClick={onShareScreen}
          aria-label="Share screen"
          title="Share Screen"
        >
          <MonitorPlay size={22} />
        </button>

        {/* Reactions */}
        <button
          className="meet-ctrl-btn"
          onClick={onToggleReactions}
          aria-label="Reactions"
          title="Reactions"
        >
          <Smiley size={22} />
        </button>

        {/* Raise hand */}
        <button
          className={`meet-ctrl-btn ${handRaised ? 'active' : ''}`}
          onClick={onToggleHand}
          aria-label={handRaised ? 'Lower hand' : 'Raise hand'}
          title={handRaised ? 'Lower Hand' : 'Raise Hand'}
        >
          <Hand size={22} />
        </button>

        {/* Settings */}
        <button
          className="meet-ctrl-btn"
          onClick={onToggleSettings}
          aria-label="Audio and Video Settings"
          title="Settings"
        >
          <GearSix size={22} />
        </button>

        {/* End call */}
        <button
          className="meet-ctrl-btn end-call"
          onClick={onLeave}
          aria-label="Leave meeting"
          title="Leave Meeting"
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
          title="Chat"
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
          title="Participants"
          style={{ position: 'relative' }}
        >
          <Users size={22} />
          {participantCount > 1 && <span className="badge">{participantCount}</span>}
        </button>
      </div>
    </div>
  );
}
