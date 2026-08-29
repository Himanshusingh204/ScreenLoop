// audioBooster.js — Web Audio API gain and compressor chain for movie dialogue enhancement
class AudioBoosterManager {
  constructor() {
    this.audioCtx = null;
    this.sourceNode = null;
    this.gainNode = null;
    this.compressor = null;
    this.videoEl = null;
  }

  init(videoElement) {
    if (!videoElement || this.videoEl === videoElement) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      // Close previous AudioContext if one exists to prevent memory leak
      if (this.audioCtx && this.audioCtx.state !== 'closed') {
        this.audioCtx.close().catch(() => {});
      }

      this.audioCtx = new AudioContext();
      this.videoEl = videoElement;

      this.sourceNode = this.audioCtx.createMediaElementSource(videoElement);
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.value = 1.0;

      // Dynamics compressor to level out dialogue and loud explosions
      this.compressor = this.audioCtx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-24, this.audioCtx.currentTime);
      this.compressor.knee.setValueAtTime(30, this.audioCtx.currentTime);
      this.compressor.ratio.setValueAtTime(12, this.audioCtx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.audioCtx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.audioCtx.currentTime);

      // Connect graph: Source -> Compressor -> Gain -> Destination
      this.sourceNode.connect(this.compressor);
      this.compressor.connect(this.gainNode);
      this.gainNode.connect(this.audioCtx.destination);
    } catch (err) {
      console.warn('[audio-booster] AudioContext init note:', err);
    }
  }

  setGain(multiplier) {
    if (this.gainNode && this.audioCtx) {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      this.gainNode.gain.setValueAtTime(multiplier, this.audioCtx.currentTime);
    }
  }

  resume() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }
}

export const audioBooster = new AudioBoosterManager();
