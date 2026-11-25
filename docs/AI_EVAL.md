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
Setup: `e2e/bench.js`, headless Chrome on a Windows laptop. The host shares a Windows-TTS clip through the real LiveKit SFU with media E2EE on; a viewer turns on CC, so the model hears the *decrypted SFU stream*. Model `Xenova/whisper-tiny`. Digits are normalized to words before scoring (the model writes "20", the reference says "twenty").

| Clip | Voice | Backend | Noise | Ref words | WER | Model ready | First caption |
|---|---|---|---|---|---|---|---|
| 1 (rocket) | default | WebGPU | none | 59 | 1.7 % | 19.2 s | 6.8 s |
| 2 (bridge) | David | WebGPU | none | 49 | 26.5 % | 17.1 s | 7.0 s |
| 3 (soup) | Hazel | **WASM only** | none | 53 | 26.4 % | 8.1 s | 7.3 s |
| 3 (soup) | Hazel | WebGPU | white noise | 53 | 13.2 % | 17.6 s | 6.7 s |
| **Pooled** | | | | **214** | **16.4 %** | | |

Cadence: one caption per 5 s window in every run (median gap 4.6–5.5 s), so real time was kept up on both backends. "Model ready" is cold-cache download plus init; the WASM path was ready sooner here because it skips WebGPU shader compilation.

**What the errors actually are.** Not noise: the noisy run scored better than a clean one. They are (1) words lost at the hard 5 s window boundaries (no overlap), (2) the trailing partial window never being transcribed (clip 2 loses its last sentence), and (3) tiny-model slips ("Eat a little olive oil", "into soup"). Fixes in order of value: transcribe the final partial window on stop, add 0.5 s overlap with text de-duplication, try `whisper-base`.

Earlier single-clip figure of 5.1 % (un-normalized, clip 1 only) was an optimistic best case; use the pooled number.

Still missing for a defensible claim: real human speech (accents, overlapping speakers, music), a phone, Firefox/Safari. TTS is cleaner than real speech, so treat 16.4 % as a floor for real content, not a typical value.

## Known limits
- `whisper-tiny` is the smallest model: expect weak accuracy on music, overlapping speech and accents. `whisper-base` is the upgrade path.
- Windows are 5 s with no overlap, so a word spanning a boundary can be split or lost, and the final partial window is never transcribed.
- Translation is to English only (Whisper's built-in translate task).
- Every viewer who enables CC transcribes locally, so it costs each of them CPU/GPU and a one-time model download.
