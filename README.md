# Tab Hero

*[Leer en español](README.es.md)*

A rhythm game for the music already playing in your browser. Share a tab (YouTube, Spotify Web…) and its music falls down three frets as notes, in sync with what you hear and see.

Browser JavaScript, Canvas 2D and Web Audio. No external dependencies. The game is in English, with Spanish one click away (top right).

**[Play it online](https://cangrejometralleta.github.io/tab-hero/)** — Chrome or Edge to share a tab.

## Run it

```sh
./start.sh        # live reload, opens the browser
npm run dev       # same server, without opening the browser
npm start         # plain static server (Python)
npm test          # unit tests
```

The game is served at http://localhost:5173 (`PORT` changes it). Live reload needs Node 20.11 or newer.

## Play a tab

1. Open the music in another tab of Chrome or Edge and start it.
2. In Tab Hero, press **⧉ Tab**, pick that tab as a **Chrome tab** (not a window or the screen) and turn on **Share tab audio**.
3. Stay on Tab Hero. The shared tab goes quiet; its music plays here 2.2 s later, with its video behind the neck on the same delay.

Firefox and Safari cannot share tab audio. Stopping the share, or pressing **Stop**, ends the session.

**Plan B: a file.** If tab sharing is not available, press **♪ File** and load an mp3, wav or ogg. It plays the same way: analyzed now, heard 2.2 s later. The session ends with the track.

**Demo** shows the game at 120 BPM without any audio.

## Base concepts

**Hear first, play later.** A note needs time to fall, so it can never land when its sound first plays. Tab Hero listens to the music 2.2 s ahead of you and delays what you hear (and see) by the same amount. Every note reaches the line exactly as its sound plays.

**Sound becomes notes.** Every attack (a hit, a pluck, a syllable) and every pitch change makes a note. Only the melody plays; the bass is filtered out.

**Three frets.** Notes fall into three frets: `A (W/S) D` or `← (↑/↓) →`, or tap the circles. The melody, heard through a high-pass above 220 Hz, walks the frets: a step down moves one fret left, a step up one fret right, a leap of a fourth or more moves two, and a repeated note stays put.

**The line is the moment.** Press as the note's button meets the fret circle. STRIKE is within ±180 ms, GOOD within ±350 ms. A note with a tail (a held pitch, up to 1.5 s) must be held until the end; you may let go up to 200 ms early.

**Streaks and difficulty.**
- Every hit grows the streak; 10, 20 and 30 raise the multiplier to ×2, ×3 and ×4. The frets glow brighter and notes shed more sparks with each step.
- Consecutive STRIKEs climb a ladder of messages (DOUBLE STRIKE … GOD MODE). The streak celebrates 10, 25, 50, 100 and every multiple of 100.
- Every 5 STRIKEs in a row raise the level (up to 4): notes fall faster and may come slightly closer together; each level adds 10% to the score. A GOOD, a miss or an off-beat press resets the level. The hit window never shrinks.
- Missing with a streak above 10 makes the guitar neck jump (not with reduced motion).

**Feedback.** A hit names its pitch in the spark (C, D♯…). The panel shows the BPM, your best STRIKE chain and the input level. Sensitivity sets the input threshold (slider or − / +).

**Privacy.** Audio and video are analyzed on your device. Nothing is recorded or sent.

## Limits

Pitch detection uses autocorrelation and works best with one clear voice or instrument (200–1000 Hz for the melody); dense mixes give fewer pitched notes. The bass is removed by a filter, not true instrument separation; drums and other unpitched hits make no notes. The BPM needs at least five regular attacks. The 2.2 s delay is fixed; speaker latency reported by the browser is compensated, Bluetooth delay may not be.

## Files

| File | Holds |
| --- | --- |
| `game.js` | Game loop, input, drawing, tab and file sessions, delayed video |
| `audio.js` | Pitch, pulse, bands, note tracking |
| `sustain.js` | Held-note rules |
| `hype.js` | Strike and streak messages |
| `i18n.js` | English and Spanish text |
| `dev.js`, `start.sh` | Live reload server |
