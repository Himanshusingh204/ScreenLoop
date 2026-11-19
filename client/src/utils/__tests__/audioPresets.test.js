import { describe, it, expect } from 'vitest';
import { CINEMA_AUDIO_PRESET, VOICE_AUDIO_PRESET } from '../audioPresets';

describe('Audio Constraints Presets', () => {
  it('CINEMA_AUDIO_PRESET should disable voice filtering and enable stereo', () => {
    expect(CINEMA_AUDIO_PRESET.echoCancellation).toBe(false);
    expect(CINEMA_AUDIO_PRESET.noiseSuppression).toBe(false);
    expect(CINEMA_AUDIO_PRESET.autoGainControl).toBe(false);
    expect(CINEMA_AUDIO_PRESET.channelCount).toBe(2);
    expect(CINEMA_AUDIO_PRESET.sampleRate).toBe(48000);
  });

  it('VOICE_AUDIO_PRESET should enable echo cancellation and noise suppression', () => {
    expect(VOICE_AUDIO_PRESET.echoCancellation).toBe(true);
    expect(VOICE_AUDIO_PRESET.noiseSuppression).toBe(true);
    expect(VOICE_AUDIO_PRESET.autoGainControl).toBe(true);
  });
});
