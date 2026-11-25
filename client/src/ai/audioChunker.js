// audioChunker.js — slices a continuous 16 kHz mono stream into fixed windows for the ASR worker.
export class AudioChunker {
  constructor({ rate = 16000, windowSec = 5, overlapSec = 0 } = {}) {
    if (overlapSec >= windowSec) throw new Error('overlapSec must be smaller than windowSec');
    this.win = Math.round(rate * windowSec);
    this.keep = Math.round(rate * overlapSec);
    this.buf = new Float32Array(0);
  }

  get pending() {
    return this.buf.length;
  }

  /** @param {Float32Array} samples @returns {Float32Array[]} zero or more full windows */
  push(samples) {
    const next = new Float32Array(this.buf.length + samples.length);
    next.set(this.buf);
    next.set(samples, this.buf.length);
    this.buf = next;
    const out = [];
    while (this.buf.length >= this.win) {
      out.push(this.buf.slice(0, this.win));
      this.buf = this.buf.slice(this.win - this.keep);
    }
    return out;
  }
}
