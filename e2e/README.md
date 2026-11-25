# Live end-to-end checks

These drive **real Chrome** (via `playwright-core`, using your installed Chrome) against a **real LiveKit server**. Unit tests cannot prove these.

## Run
```bash
docker compose up -d livekit                      # LiveKit on :7880 (key devkey / secret)
cd server && PORT=4000 NODE_ENV=development LIVEKIT_URL=ws://127.0.0.1:7880 MAX_IP_CONNECTIONS=200 SPAM_MAX_EVENTS=1000 node src/index.js &
cd client && VITE_SERVER_URL=http://localhost:4000 VITE_MEET_SFU=true npx vite --port 5173 &
cd e2e && npm i
node meet.js                 # Meet on the SFU: 3 tabs, tiles decode, LiveKit sees 3 participants
docker stop <livekit>; FALLBACK=1 node meet.js   # SFU down: mesh fallback still gives 3 tiles each
node watch.js                # watch-room E2EE, host-only publish, kick+rotation, late joiner
```
Also works through the 3-node stack: `docker compose -f deploy/docker-compose.scale.yml up --build -d` (LB on :4000, LiveKit on :7880), then `node watch.js`.

## Caption benchmark
`bench.js` plays a synthetic-speech clip as the host's shared audio and reads the viewer's captions. Clips are generated locally with Windows TTS from the `ref*.txt` passages (WAVs are git-ignored):
```powershell
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.SelectVoice("Microsoft David Desktop")   # also: Zira, Hazel
$s.SetOutputToWaveFile("bench.wav"); $s.Speak((Get-Content ref.txt -Raw)); $s.Dispose()
```
```bash
node bench.js                                   # default backend
CLIP=clip2 REF=ref2.txt node bench.js           # other clip / reference text
BACKEND=wasm node bench.js                      # force the CPU path (no WebGPU)
NOISE=1 node bench.js                           # mix white noise into the audio
```
Warm the Vite dev server first (open the app once): a cold start re-optimizes dependencies and force-reloads the page mid-run.
