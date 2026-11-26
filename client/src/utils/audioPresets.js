// audioPresets.js — Cinema-quality audio constraints for watch party & movies
// Disables voice-chat filters (noise gate, echo cancelling) to preserve
// full dynamic range, surround sound, and uncompressed film scores.

export const CINEMA_AUDIO_PRESET = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
  channelCount: 2,
  sampleRate: 48000,
  sampleSize: 16,
};

export const VOICE_AUDIO_PRESET = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
  sampleRate: 48000,
};
