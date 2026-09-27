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

## Duel

**[⚔ Duel](https://cangrejometralleta.github.io/tab-hero/duel.html)** is a second game on the same keys: two samurai, bout after bout, on a built-in beat or on a shared tab's music. **Stop** ends the session; the header counts your wins and losses, kept in this browser, and the bar below shows the session time.

- `A` / `D` walk freely; `W` jumps a low cut; `S` ducks a high one.
- `SPACE` cuts on the beat. STRIKE: ±90 ms; GOOD: ±180 ms. Off the beat, it misses and breaks the combo.
- Out of reach, an on-beat cut throws a **ki wave**: 40% of the blade's damage, and it keeps the combo without growing it. The rival throws its own when far (high or low, dodged like its cuts); `W` or `S` on the beat deflects it back. Only the blade builds the multiplier, so close in.
- **Trading blows.** The rival never cuts on two beats in a row, so the beat after its cut is yours to answer. After every blade exchange it answers on the beat after next.
- The rival parries too: 20% of your STRIKEs and 35% of your GOOD cuts at ×1, +10% per multiplier step, up to 70%. A parried cut pushes you back; a parried GOOD also breaks the combo.
- The rival reads the bout: ahead on health it presses in for the blade; behind, it backs away and leans on ki.
- A landed blow pushes the one hit back: a STRIKE shoves the rival furthest, a ki wave barely; the rival's cuts push you too.
- **One action per beat.** A cut or a parry spends the beat; a second one on the same beat fails (BEAT SPENT), and a second cut also breaks the combo. Walking with `A` / `D`, jumping and ducking are free.
- Between attacks both samurai dance to the beat: a dip on each beat, a sway from side to side, the blade rocking, and steps while they walk. Attacks, parries and ki keep their own poses.
- Damage shows: as health falls, cuts and tears open on the gi, the hakama frays and the face gets scratched and bruised. Past 40% damage a samurai tires: at rest it pants, slouches, half-closes its eye, lets the blade droop and sweats.
- Blade hits and parries flash the screen, hold the frame for a moment and shake it.
- The rhythm track at the top brings each beat into the hit zone (its frame is the GOOD window, its core the STRIKE window). A pink sword is your beat to cut with `SPACE`; a gold shield on red is the rival's cut. A prompt at its left names what the next beat asks for, and a gold "!" over the rival plus "W / S" over you warn of its cut. Spent beats turn white, and a red cross marks a miss or a hit taken. Every landed beat bursts sparks out of the zone; the multiplier makes the burst bigger, gives the zone a glow in its colour, shows a ×N badge that swells when it climbs, and from ×3 sets embers rising from the zone. `W` or `S` on it parries, high or low; elsewhere they just jump or duck.
- Every STRIKE in a row adds to the combo; each 4 raises the multiplier, up to ×4, on damage and points. From ×2 your samurai glows blue, then gold, then pink. The combo carries across bouts.
- Each multiplier step makes the rival tougher: +10 BPM on the built-in beat (100 up to 130), more cuts, and +4 damage per cut (16 up to 28).
- **⧉ Tab** works as in the rhythm game: the tab is heard 2.2 s late, its pixelated video on the horizon. Each attack in its music becomes a beat on the track, so you cut, parry and dodge on the music itself. **Sensitivity** (80% by default) sets how soft an attack still counts; raise it if few beats appear. With a tab the tempo is the music's; the rival still gets bolder and harder-hitting. If sharing stops, the metronome takes over.
- Each samurai has 250 health, so a bout runs about 30 s. It has no time limit: it ends only when someone falls, with a K.O. flash and a pause while the loser staggers, kneels and falls and the winner raises the blade; if both fall together it counts as neither.

## Limits

Pitch detection uses autocorrelation and works best with one clear voice or instrument (200–1000 Hz for the melody); dense mixes give fewer pitched notes. The bass is removed by a filter, not true instrument separation; drums and other unpitched hits make no notes. The BPM needs at least five regular attacks. The 2.2 s delay is fixed; speaker latency reported by the browser is compensated, Bluetooth delay may not be.

## Files

| File | Holds |
| --- | --- |
| `game.js` | Game loop, input, drawing, tab and file sessions, delayed video |
| `duel.html`, `duel.js` | Samurai duel: endless bouts on a built-in beat or a tab |
| `duel-rules.js` | Duel timing, combo, difficulty and bout rules |
| `audio.js` | Pitch, pulse, bands, note tracking |
| `sustain.js` | Held-note rules |
| `hype.js` | Strike and streak messages |
| `i18n.js` | English and Spanish text |
| `dev.js`, `start.sh` | Live reload server |
