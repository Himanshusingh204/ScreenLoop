// captionWorker.js — runs Whisper entirely in the browser (WebGPU, falling back to WASM).
// Audio never leaves the device: the main thread posts PCM in, this worker posts text out.
import { pipeline } from '@huggingface/transformers';
import { cleanCaption } from './support';

let asr = null;

self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'load') {
      asr = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
        device: self.navigator?.gpu ? 'webgpu' : 'wasm',
        progress_callback: (p) => self.postMessage({ type: 'progress', progress: p.progress ?? 0 }),
      });
      self.postMessage({ type: 'ready' });
    } else if (data.type === 'audio' && asr) {
      // language omitted = auto-detect; task 'translate' makes Whisper output English
      const out = await asr(data.audio, { task: data.translate ? 'translate' : 'transcribe' });
      const text = cleanCaption(out?.text);
      if (text) self.postMessage({ type: 'caption', text, ts: data.ts });
      else self.postMessage({ type: 'idle', ts: data.ts });
    }
  } catch (err) {
    self.postMessage({ type: 'error', message: String(err?.message || err) });
  }
};
