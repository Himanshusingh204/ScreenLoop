// useLiveCaptions.js — opt-in on-device captions for a MediaStream. Nothing is uploaded.
import { useEffect, useRef, useState } from 'react';
import { AudioChunker } from '../ai/audioChunker';
import { isCaptionSupported } from '../ai/support';
import { mergeCaption } from '../ai/mergeCaption';

const RATE = 16000;
const LOAD_TIMEOUT_MS = 120000;
const FLUSH_WAIT_MS = 6000; // on stop, wait this long for the final window's caption
const MAX_LINES = 500;
const MAX_BACKLOG = 2; // drop windows rather than fall behind real time

/** @returns {{status:'idle'|'unsupported'|'loading'|'ready'|'error', progress:number, captions:{text:string,ts:number}[], error:string}} */
export function useLiveCaptions(stream, { enabled = false, translate = false } = {}) {
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [captions, setCaptions] = useState([]);
  const [error, setError] = useState('');
  const translateRef = useRef(translate);
  translateRef.current = translate;

  useEffect(() => {
    if (!enabled) { setStatus('idle'); return undefined; }
    if (!isCaptionSupported()) { setStatus('unsupported'); return undefined; }
    if (!stream || !stream.getAudioTracks().length) { setStatus('idle'); return undefined; }

    setStatus('loading');
    setProgress(0);
    setError('');
    const t0 = Date.now();
    let backlog = 0;
    let ready = false;
    let onReply = null; // resolves a pending final-window flush when the worker answers
    const worker = new Worker(new URL('../ai/captionWorker.js', import.meta.url), { type: 'module' });
    const fail = (msg) => { setError(msg); setStatus('error'); };
    const timer = setTimeout(() => { if (!ready) fail('Caption model took too long to load.'); }, LOAD_TIMEOUT_MS);

    worker.onmessage = ({ data }) => {
      if (data.type === 'progress') setProgress(Math.round(data.progress));
      else if (data.type === 'ready') { ready = true; clearTimeout(timer); setStatus('ready'); window.__captionDevice = data.device; }
      else if (data.type === 'error') {
        if (data.fatal) fail(data.message);
        else backlog = Math.max(0, backlog - 1); // one bad window: skip it, keep captioning
      }
      else { // 'caption' or 'idle': one window finished
        backlog = Math.max(0, backlog - 1);
        if (data.type === 'caption') {
          // windows overlap, so drop the words this caption repeats from the one before
          setCaptions((c) => {
            const text = mergeCaption(c.at(-1)?.text, data.text);
            return text ? [...c, { text, ts: data.ts }].slice(-MAX_LINES) : c;
          });
        }
      }
      if (data.type !== 'progress') onReply?.();
    };
    worker.onerror = (e) => { fail(e.message || 'Caption worker crashed.'); onReply?.(); };
    let backend = null;
    try { backend = localStorage.getItem('sl-asr-backend'); } catch { /* storage blocked: use the default */ }
    worker.postMessage({ type: 'load', backend });

    let ctx; let src; let proc; let mute; let chunker;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC({ sampleRate: RATE });
      src = ctx.createMediaStreamSource(new MediaStream(stream.getAudioTracks()));
      // shortcut: ScriptProcessor is deprecated but works everywhere; move to AudioWorklet if it is removed.
      proc = ctx.createScriptProcessor(4096, 1, 1);
      mute = ctx.createGain();
      mute.gain.value = 0; // processor must reach destination to run, but we never play this copy
      chunker = new AudioChunker({ rate: RATE, windowSec: 5, overlapSec: 0.5 });
      proc.onaudioprocess = (e) => {
        if (!ready) return;
        for (const audio of chunker.push(new Float32Array(e.inputBuffer.getChannelData(0)))) {
          if (backlog >= MAX_BACKLOG) continue;
          backlog += 1;
          worker.postMessage({ type: 'audio', audio, ts: Date.now() - t0, translate: translateRef.current }, [audio.buffer]);
        }
      };
      src.connect(proc);
      proc.connect(mute);
      mute.connect(ctx.destination);
    } catch (e) {
      worker.terminate();
      clearTimeout(timer);
      fail('Captions are not supported for this audio source in your browser.');
      return undefined;
    }

    return () => {
      clearTimeout(timer);
      proc.onaudioprocess = null;
      const tail = chunker.flush(); // the final partial window, copied out before the audio graph goes away
      try { src.disconnect(); proc.disconnect(); mute.disconnect(); ctx.close(); } catch { /* already closed */ }
      // Transcribe the tail, but skip it if the worker is already behind; terminate once answered or after the wait.
      if (tail && ready && backlog < MAX_BACKLOG) {
        worker.postMessage({ type: 'audio', audio: tail, ts: Date.now() - t0, translate: translateRef.current }, [tail.buffer]);
        const reply = new Promise((resolve) => { onReply = resolve; });
        const waited = new Promise((resolve) => { setTimeout(resolve, FLUSH_WAIT_MS); });
        Promise.race([reply, waited]).then(() => worker.terminate());
      } else {
        worker.terminate();
      }
    };
  }, [enabled, stream]);

  return { status, progress, captions, error };
}
