# On-device captions: evaluation

**Status: NOT YET MEASURED.** The feature builds and its pure logic is unit-tested (`client/src/ai/__tests__`), but it has not been run in a real browser against audio. Do not quote accuracy or latency until the table below is filled in.

## What is verified
- Chunker, recap builder, support check and caption cleaning: 11 unit tests.
- Production build succeeds; the 27 MB ONNX wasm is excluded from the PWA precache and loads only when CC is turned on.

## Protocol
1. Pick 20 public-domain clips (LibriVox, 30 s each, mixed accents; add 5 with background music).
2. Play each clip as a shared stream in a watch room and record the caption text with CC on. Also run the 5 noisy clips with Translate on.
3. Word error rate = (substitutions + deletions + insertions) / reference words, using `jiwer` against the clip transcript.
4. Latency = time from a window's last sample to its caption appearing (log `performance.now()` around the worker call).
5. Run on 3 device classes: discrete-GPU desktop (WebGPU), integrated-GPU laptop, mid-range phone (WASM).

## Results (fill in)
| Device | Backend | Clips | WER (clean) | WER (music) | p50 latency | p95 latency | Notes |
|---|---|---|---|---|---|---|---|
| | WebGPU | | | | | | |
| | WASM | | | | | | |

## Known limits
- `whisper-tiny` is the smallest model: expect weak accuracy on music, overlapping speech and accents. `whisper-base` is the upgrade path.
- Windows are 5 s with no overlap, so a word spanning a boundary can be split.
- Translation is to English only (Whisper's built-in translate task).
- Every viewer who enables CC transcribes locally, so it costs each of them CPU/GPU and a one-time model download.
