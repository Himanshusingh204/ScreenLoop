# On-device captions: evaluation

**Status: first real-browser measurement taken (n = 1 clean synthetic clip). Not enough to claim general accuracy.**

## What is verified
- Chunker, recap builder, support check and caption cleaning: 11 unit tests.
- Production build succeeds; the 27 MB ONNX wasm is excluded from the PWA precache and loads only when CC is turned on.

## Protocol
1. Pick 20 public-domain clips (LibriVox, 30 s each, mixed accents; add 5 with background music).
2. Play each clip as a shared stream in a watch room and record the caption text with CC on. Also run the 5 noisy clips with Translate on.
3. Word error rate = (substitutions + deletions + insertions) / reference words, using `jiwer` against the clip transcript.
4. Latency = time from a window's last sample to its caption appearing (log `performance.now()` around the worker call).
5. Run on 3 device classes: discrete-GPU desktop (WebGPU), integrated-GPU laptop, mid-range phone (WASM).

## Results
Run: `e2e/bench.js`, headless Chrome on a Windows laptop, host shares a 59-word Windows-TTS clip through the real LiveKit SFU with media E2EE on; a viewer turns on CC, so the model hears the *decrypted SFU stream*. Model `Xenova/whisper-tiny`.

| Metric | Result |
|---|---|
| Time from clicking CC to ready (model download + init, cold cache) | 19.2 s |
| First caption after audio starts | 6.8 s (5 s window + ~1.8 s inference/queue) |
| Steady cadence | one caption per window, median gap 4.9 s (real time kept up) |
| WER | **5.1 %** (3 errors / 59 words: "meanwhile" split in two, a window-boundary split "St." + "space travel") |
| Backend | `navigator.gpu` present; the worker prefers WebGPU |

Still missing for a defensible claim: 20+ real-speech clips (accents, music), the WASM-only path, a phone, and Firefox. TTS speech is cleaner than real speech, so 5.1 % is an optimistic floor.

## Known limits
- `whisper-tiny` is the smallest model: expect weak accuracy on music, overlapping speech and accents. `whisper-base` is the upgrade path.
- Windows are 5 s with no overlap, so a word spanning a boundary can be split.
- Translation is to English only (Whisper's built-in translate task).
- Every viewer who enables CC transcribes locally, so it costs each of them CPU/GPU and a one-time model download.
