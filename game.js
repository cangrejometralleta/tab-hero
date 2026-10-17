import { extendSustain, holdState } from "./sustain.js";
import { milestoneText, strikeText } from "./hype.js";
import { lang, setLang, t as tr } from "./i18n.js";
import {
  bandEnergy,
  detectPitch,
  listening,
  NoteTracker,
  PulseTracker,
} from "./audio.js";
const $ = (id) => document.getElementById(id),
  canvas = $("game"),
  ctx = canvas.getContext("2d");
const colors = ["#4ade80", "#ff4d5e", "#ffd23f"],
  keys = {
    KeyA: 0,
    KeyS: 1,
    KeyW: 1,
    KeyD: 2,
    ArrowLeft: 0,
    ArrowUp: 1,
    ArrowDown: 1,
    ArrowRight: 2,
  },
  pads = [...document.querySelectorAll("[data-lane]")];
const pressed = new Map();
let sustaining = null;
const hitWindow = .35, perfectWindow = .18;
let travel = 2.2, level = 0;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
$("effects").checked = !reduced;
// A file plays this late, so each note reaches the line while its sound is heard.
const fileDelay = 2.2;
let width = 500,
  height = 660,
  mode = null,
  stream,
  player,
  audio,
  analyser,
  buffer,
  spectrum,
  notes = [],
  particles = [],
  labels = [],
  score = 0,
  combo = 0,
  total = 0,
  hits = 0,
  lastSpawn = -10,
  lastAnalysis = 0,
  lastDemo = 0,
  previousPitch = null,
  candidate = null,
  stableFrames = 0,
  verdictUntil = 0,
  token = 0,
  strikes = 0,
  bestStrikes = 0;
let startedAt = null, shownClock = "";
const pulse = new PulseTracker(),
  melodyPulse = new PulseTracker(),
  noteTracker = new NoteTracker();
let melodyAnalyser, melodyBuffer;
let demoIndex = 0;
new ResizeObserver(() => {
  const rect = canvas.getBoundingClientRect();
  width = rect.width;
  height = rect.height;
  const dpr = Math.min(devicePixelRatio, 2);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}).observe(canvas);
function announce(text) {
  $("status").textContent = text;
}
function reset() {
  notes = [];
  particles = [];
  labels = [];
  score =
    combo =
    hits =
    total =
    strikes =
    bestStrikes =
      0;
  $("bestStrike").textContent = "0";
  lastSpawn = -10;
  previousPitch = candidate = null;
  stableFrames = 0;
  pulse.reset();
  melodyPulse.reset();
  noteTracker.reset();
  setLevel(0);
  $("score").textContent = "000000";
  $("combo").textContent = "0";
  startedAt = null;
  $("clock").textContent = shownClock = "00:00";
  $("bpm").textContent = "—";
  $("level").style.width = "0%";
}
// The shared tab's video is replayed behind the neck with the same delay as its audio.
const backdrop = $("backdrop"), backdropCtx = backdrop.getContext("2d");
let frames = [], lastCapture = 0;
function clearBackdrop() {
  frames.forEach((f) => f.bitmap.close());
  frames = [];
  $("tabVideo").srcObject = null;
  backdrop.classList.remove("on");
}
async function captureFrame(now) {
  const video = $("tabVideo");
  if (!video.srcObject || video.readyState < 2 || now - lastCapture < 1 / 30) {
    return;
  }
  lastCapture = now;
  try {
    const bitmap = await createImageBitmap(video, {
      resizeWidth: Math.min(640, video.videoWidth || 640),
      resizeQuality: "low",
    });
    if (mode !== "tab") {
      bitmap.close();
      return;
    }
    frames.push({ at: now, bitmap });
  } catch {}
}
function drawBackdrop(now) {
  const due = now - fileDelay -
    (audio?.outputLatency || audio?.baseLatency || 0);
  while (frames.length > 1 && frames[1].at <= due) {
    frames.shift().bitmap.close();
  }
  const frame = frames[0];
  if (!frame || frame.at > due) return;
  backdrop.classList.add("on");
  if (backdrop.width !== canvas.width) {
    backdrop.width = canvas.width;
    backdrop.height = canvas.height;
  }
  const { bitmap } = frame,
    cover = Math.max(
      backdrop.width / bitmap.width,
      backdrop.height / bitmap.height,
    );
  backdropCtx.drawImage(
    bitmap,
    (backdrop.width - bitmap.width * cover) / 2,
    (backdrop.height - bitmap.height * cover) / 2,
    bitmap.width * cover,
    bitmap.height * cover,
  );
}
function release() {
  clearBackdrop();
  pressed.clear();
  sustaining = null;
  pads.forEach((p) => p.classList.remove("active"));
  token++;
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  if (player) {
    player.pause();
    URL.revokeObjectURL(player.src);
    player = null;
  }
  if (audio) {
    audio.close().catch(() => {});
    audio = null;
  }
  analyser = null;
  mode = null;
  $("stop").disabled = true;
  $("demo").disabled = false;
  $("file").disabled = false;
  $("tab").disabled = false;
  $("source").textContent = tr("noSource");
}
function stop(message = tr("stopped")) {
  release();
  notes = [];
  particles = [];
  labels = [];
  $("level").style.width = "0%";
  $("bpm").textContent = "—";
  $("session").textContent = tr("session", { hits, total });
  $("verdict").textContent = tr("sessionOver");
  announce(message);
}
function labelSession() {
  $("session").textContent = mode === "demo"
    ? tr("demoSession")
    : mode === "file"
    ? tr("fileSession")
    : tr("tabSession");
  $("source").textContent = mode === "demo"
    ? tr("demoSource")
    : mode === "file"
    ? "♪ " + player.title
    : tr("tabSource");
  $("difficulty").textContent = level ? tr("level", { n: level }) : "";
}
// Switching language keeps a running session's labels instead of restoring the idle ones.
$("lang").onclick = () => {
  setLang(lang() === "en" ? "es" : "en");
  if (mode) {
    labelSession();
    $("verdict").textContent = "";
  }
};
setLang(lang());
function start(kind) {
  reset();
  mode = kind;
  startedAt = performance.now() / 1000;
  $("stop").disabled = false;
  labelSession();
  $("verdict").textContent = tr("follow");
  verdictUntil = performance.now() / 1000 + 2;
}
$("demo").onclick = () => {
  release();
  start("demo");
  demoIndex = 0;
  lastDemo = performance.now() / 1000;
  announce(tr("demoOn"));
};
$("stop").onclick = () => stop();
$("sensitivity").oninput = () =>
  $("sensValue").textContent = $("sensitivity").value + "%";
document.querySelectorAll("[data-step]").forEach((b) =>
  b.onclick = () => {
    const s = $("sensitivity");
    s.value = Number(s.value) + Number(b.dataset.step);
    s.oninput();
  }
);
function listen(source) {
  analyser = audio.createAnalyser();
  analyser.fftSize = 4096;
  analyser.smoothingTimeConstant = 0;
  spectrum = new Float32Array(analyser.frequencyBinCount);
  buffer = new Float32Array(analyser.fftSize);
  source.connect(analyser);
  // The melody is heard through a high-pass so the bass fundamental cannot claim its pitch.
  const highpass = audio.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = listening.melody[0] + 80;
  highpass.Q.value = .9;
  melodyAnalyser = audio.createAnalyser();
  melodyAnalyser.fftSize = 2048;
  melodyAnalyser.smoothingTimeConstant = 0;
  melodyBuffer = new Float32Array(melodyAnalyser.fftSize);
  source.connect(highpass).connect(melodyAnalyser);
}
// Analysis hears the source now; the speakers hear it fileDelay later, when its notes arrive.
function playDelayed(source) {
  const delay = audio.createDelay(fileDelay + .5);
  delay.delayTime.value = fileDelay;
  listen(source);
  source.connect(delay).connect(audio.destination);
}
const delayed = () => mode === "file" || mode === "tab";
$("file").onclick = () => $("track").click();
// Chrome can share another tab's audio; its own playback is muted so only the delayed copy is heard.
$("tab").onclick = async () => {
  release();
  reset();
  const attempt = token;
  announce(tr("pickTab"));
  try {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error("unsupported");
    }
    // Chrome jumps to the shared tab by default; that hides this one and would end the session.
    const controller = window.CaptureController
      ? new CaptureController()
      : undefined;
    const incoming = await navigator.mediaDevices.getDisplayMedia({
      controller,
      video: true,
      audio: {
        suppressLocalAudioPlayback: true,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
      preferCurrentTab: false,
      selfBrowserSurface: "exclude",
      systemAudio: "include",
    });
    try {
      controller?.setFocusBehavior("no-focus-change");
    } catch {}
    if (attempt !== token) {
      incoming.getTracks().forEach((t) => t.stop());
      return;
    }
    const track = incoming.getAudioTracks()[0];
    if (!track) {
      incoming.getTracks().forEach((t) => t.stop());
      release();
      announce(tr("tabNoAudio"));
      return;
    }
    const [video] = incoming.getVideoTracks();
    if (video) {
      $("tabVideo").srcObject = new MediaStream([video]);
      $("tabVideo").play().catch(() => {});
    }
    stream = incoming;
    audio = new AudioContext();
    await audio.resume();
    if (attempt !== token) return;
    playDelayed(audio.createMediaStreamSource(new MediaStream([track])));
    track.onended = () => {
      if (attempt === token) stop(tr("tabEnd"));
    };
    start("tab");
    announce(tr("tabDelay"));
  } catch (error) {
    if (attempt !== token) return;
    release();
    announce(
      error.name === "NotAllowedError"
        ? tr("tabCancelled")
        : tr("tabUnsupported"),
    );
  }
};
$("track").onchange = async () => {
  const file = $("track").files[0];
  $("track").value = "";
  if (!file) return;
  release();
  reset();
  const attempt = token;
  player = new Audio(URL.createObjectURL(file));
  player.title = file.name.replace(/\.[^.]+$/, "");
  audio = new AudioContext();
  playDelayed(audio.createMediaElementSource(player));
  player.onended = () =>
    setTimeout(() => {
      if (attempt === token) stop(tr("fileEnd"));
    }, fileDelay * 1000 + 500);
  try {
    await audio.resume();
    await player.play();
  } catch {
    if (attempt === token) {
      release();
      announce(tr("fileError"));
    }
    return;
  }
  if (attempt !== token) return;
  start("file");
  announce(tr("fileDelay"));
};
function multiplier() {
  return Math.min(4, 1 + Math.floor(combo / 10));
}
function emitSparks({ x, y, color, count, burst = false }) {
  if (!$("effects").checked) return;
  const power = multiplier();
  for (let i = 0; i < count && particles.length < 700; i++) {
    const life = (burst ? .45 : .25) + Math.random() * .2 + power * .055;
    particles.push({
      x,
      y,
      vx: (Math.random() - .5) * (burst ? 160 + power * 65 : 35 + power * 20),
      vy: -(burst
        ? 70 + Math.random() * (100 + power * 55)
        : 25 + Math.random() * (35 + power * 20)),
      life,
      maxLife: life,
      size: 1 + Math.random() * (1 + power * .45),
      color,
      gravity: burst ? 260 : 50,
    });
  }
}
// `at` is when the note reaches the line; `travel` only sets how long it is visible.
function spawn({ lane, time: t, duration = 0, at = t + travel }) {
  // A lane never stacks two notes: skip one that would overlap a note or tail already there.
  if (
    notes.some((n) =>
      n.lane === lane && Math.abs(n.at - at) < .15 ||
      n.lane === lane && n.duration > 0 && n.at < at &&
        n.at + n.duration > at - .15
    )
  ) return null;
  const note = { lane, at, travel, duration, sparkBudget: 0, holding: false };
  notes.push(note);
  lastSpawn = t;
  return note;
}
// Losing a streak above 10 makes the guitar neck jump.
function jumpNeck() {
  if (combo <= 10 || reduced) return;
  canvas.classList.remove("jump");
  void canvas.offsetWidth;
  canvas.classList.add("jump");
}
// Every 5 strikes in a row raise the level (max 4): faster notes, slightly denser notes.
function setLevel(next) {
  if (next === level) return;
  level = next;
  travel = 2.2 - .15 * level;
  pulse.minGap = .24 - .01 * level;
  melodyPulse.minGap = noteTracker.minGap = .18 - .01 * level;
  $("difficulty").textContent = level ? tr("level", { n: level }) : "";
}
function verdict({ text, time: t, color = "#ecf1ff", hold = .7 }) {
  $("verdict").textContent = text;
  $("verdict").style.color = color;
  verdictUntil = t + hold;
}
function finishNote({ note, time: t, success }) {
  notes.splice(notes.indexOf(note), 1);
  total++;
  if (success) {
    hits++;
    combo++;
    strikes = note.perfect ? strikes + 1 : 0;
    if (strikes > bestStrikes) {
      bestStrikes = strikes;
      $("bestStrike").textContent = bestStrikes;
    }
    score += Math.round(
      ((note.perfect ? 100 : 60) + note.duration * 80) * multiplier() *
        (1 + level * .1),
    );
    setLevel(Math.min(4, Math.floor(strikes / 5)));
    const milestone = milestoneText(combo);
    if (milestone) {
      verdict({ text: milestone, time: t, color: "#ffd078", hold: 1.4 });
    } else {verdict({
        text: note.duration
          ? tr("sustained")
          : note.perfect
          ? strikeText(strikes)
          : tr("good"),
        time: t,
        color: colors[note.lane],
      });}
    emitSparks({
      x: laneX(note.lane, 1),
      y: height - 88,
      color: colors[note.lane],
      count: 20 + multiplier() * 14,
      burst: true,
    });
    if (note.pitch) {
      labels.push({
        text: note.pitch,
        x: laneX(note.lane, 1),
        y: height - 110,
        life: .8,
        maxLife: .8,
        color: colors[note.lane],
      });
    }
  } else {
    jumpNeck();
    combo = strikes = 0;
    setLevel(0);
    verdict({
      text: note.holding ? tr("early") : tr("miss"),
      time: t,
      color: "#96a4bd",
    });
  }
  $("score").textContent = String(score).padStart(6, "0");
  $("combo").textContent = combo;
}
function hit(lane) {
  if (!mode) return;
  const t = performance.now() / 1000,
    note =
      notes.filter((n) =>
        !n.holding && n.lane === lane && Math.abs(n.at - t) <= hitWindow
      ).sort((a, b) => Math.abs(a.at - t) - Math.abs(b.at - t))[0];
  if (!note) {
    jumpNeck();
    combo = strikes = 0;
    setLevel(0);
    $("combo").textContent = "0";
    verdict({ text: tr("offBeat"), time: t });
    return;
  }
  note.perfect = Math.abs(note.at - t) <= perfectWindow;
  if (note.duration > 0) {
    note.holding = true;
    verdict({ text: tr("hold"), time: t, color: colors[lane] });
  } else finishNote({ note: note, time: t, success: true });
}
function lanePressed(lane) {
  return [...pressed.values()].includes(lane);
}
function press(id, lane) {
  if (!mode || pressed.has(id)) return;
  const already = lanePressed(lane);
  pressed.set(id, lane);
  pads[lane].classList.add("active");
  if (!already) hit(lane);
}
function lift(id) {
  const lane = pressed.get(id);
  pressed.delete(id);
  if (lane === undefined || lanePressed(lane)) return;
  pads[lane].classList.remove("active");
  const t = performance.now() / 1000;
  for (const note of [...notes]) {
    if (note.lane === lane && note.holding) {
      finishNote({
        note: note,
        time: t,
        success: holdState(note, t, false) === "complete",
      });
    }
  }
}
window.addEventListener("keydown", (e) => {
  if (
    e.target.matches("input,textarea,select") || e.ctrlKey || e.metaKey ||
    e.altKey
  ) return;
  const lane = keys[e.code];
  if (lane !== undefined && mode) {
    e.preventDefault();
    if (!e.repeat) press(e.code, lane);
  }
});
window.addEventListener("keyup", (e) => {
  if (keys[e.code] !== undefined) {
    if (mode) e.preventDefault();
    lift(e.code);
  }
});
pads.forEach((button, lane) => {
  button.onpointerdown = (e) => {
    e.preventDefault();
    button.setPointerCapture(e.pointerId);
    press("pointer" + e.pointerId, lane);
  };
  button.onpointerup =
    button.onpointercancel =
    button.onlostpointercapture =
      (e) => lift("pointer" + e.pointerId);
});
window.addEventListener("blur", () => {
  for (const id of [...pressed.keys()]) lift(id);
});
// Perspective: time progress q (0 at the horizon, 1 at the line) maps to a depth-scaled size
// and screen position, so notes speed up and grow as they approach, like a real neck.
const depth = 3;
function scaleAt(q) {
  return 1 / (1 + (depth - 1) * (1 - q));
}
function project(q) {
  return (scaleAt(q) - 1 / depth) / (1 - 1 / depth);
}
function laneX(lane, p) {
  return width / 2 + (lane - 1) * width * (.1 + (.86 / 3 - .1) * p);
}
function arrival(t) {
  return t + fileDelay + (audio.outputLatency || audio.baseLatency || 0);
}
function analyze(t) {
  analyser.getFloatTimeDomainData(buffer);
  analyser.getFloatFrequencyData(spectrum);
  const energy = bandEnergy(
    spectrum,
    audio.sampleRate,
    analyser.fftSize,
    listening.low,
    listening.high,
  );
  const sensitivity = Number($("sensitivity").value) / 100;
  const threshold = .014 - sensitivity * .012;
  const bpm = pulse.update(energy, t, threshold);
  $("level").style.width = Math.min(100, energy * 700) + "%";
  $("bpm").textContent = bpm ?? "—";
  $("confidence").textContent = tr("fileSync");
  $("signalText").textContent = energy < threshold
    ? tr("tooQuiet")
    : pulse.onset
    ? tr("attack")
    : tr("listening");
  melodyAnalyser.getFloatTimeDomainData(melodyBuffer);
  const band = ([lo, hi]) =>
    bandEnergy(spectrum, audio.sampleRate, analyser.fftSize, lo, hi);
  melodyPulse.update(band(listening.melody), t, threshold * .5);
  const hz = energy < threshold
    ? null
    : detectPitch(melodyBuffer, audio.sampleRate, {
      minRms: threshold * .3,
      clarity: .45,
      minHz: listening.melody[0] * .9,
    }).hz;
  const made = noteTracker.update(hz, melodyPulse.onset, t);
  const midi = hz ? Math.round(69 + 12 * Math.log2(hz / 440)) : null;
  for (const { lane, midi: pitch } of made) {
    // A fresh attack ends a previous sustain in its lane before the next head arrives.
    for (const previous of notes) {
      if (previous.lane === lane && previous.duration > 0) {
        previous.duration = Math.max(
          0,
          Math.min(previous.duration, t - previous.sourceAt - .2),
        );
      }
    }
    const note = spawn({ lane: lane, time: t, duration: 0, at: arrival(t) });
    if (note) note.sourceAt = t;
    if (note && pitch !== null) {
      note.pitch = tr("noteNames")[((pitch % 12) + 12) % 12];
      note.sourcePitch = pitch;
      sustaining = note;
    }
  }
  if (
    !made.some((n) => n.midi !== null) && sustaining &&
    !extendSustain(sustaining, t, midi)
  ) sustaining = null;
}

// The session clock stops with the session and keeps its last time until the next one starts.
function showClock(seconds) {
  const s = Math.floor(seconds),
    text = (s >= 3600 ? Math.floor(s / 3600) + ":" : "") +
      String(Math.floor(s / 60) % 60).padStart(2, "0") + ":" +
      String(s % 60).padStart(2, "0");
  if (text !== shownClock) $("clock").textContent = shownClock = text;
}
let lastFrame = performance.now() / 1000;
function frame(ms) {
  const t = ms / 1000, dt = Math.min(.05, t - lastFrame);
  lastFrame = t;
  if (mode && startedAt !== null) showClock(t - startedAt);
  if (delayed() && t - lastAnalysis > .025) {
    analyze(t);
    lastAnalysis = t;
  }
  if (mode === "demo" && t - lastDemo >= .5) {
    lastDemo = t;
    const sequence = [0, 1, 2, 1, 0, 2, 0, 1];
    const index = demoIndex++;
    const demoNote = spawn({
      lane: sequence[index % 8],
      time: t,
      duration: index % 8 === 0 ? 1.25 : 0,
    });
    if (demoNote) demoNote.pitch = tr("demoNotes")[(index + 1) % 4];
    $("bpm").textContent = "120";
    $("confidence").textContent = tr("demoPulse");
    $("level").style.width = (35 + demoIndex % 4 * 15) + "%";
  }
  if (mode === "tab") {
    captureFrame(t);
    drawBackdrop(t);
  }
  ctx.clearRect(0, 0, width, height);
  const top = 120, bottom = height - 88;
  for (let lane = 0; lane < colors.length; lane++) {
    ctx.beginPath();
    ctx.moveTo(laneX(lane, 0) - width * .045, top);
    ctx.lineTo(laneX(lane, 1) - width * .135, bottom + 35);
    ctx.lineTo(laneX(lane, 1) + width * .135, bottom + 35);
    ctx.lineTo(laneX(lane, 0) + width * .045, top);
    ctx.closePath();
    ctx.fillStyle = colors[lane] + ["09", "16", "26", "3a"][multiplier() - 1];
    ctx.fill();
    ctx.strokeStyle = colors[lane] + ["30", "58", "88", "c0"][multiplier() - 1];
    ctx.lineWidth = multiplier();
    ctx.stroke();
    ctx.lineWidth = 1;
  }
  for (let i = 0; i < 9; i++) {
    const p = project((i / 9 + (mode ? t * .2 : 0)) % 1);
    ctx.beginPath();
    ctx.moveTo(
      laneX(0, p) - width * (.045 + .09 * p),
      top + (bottom - top) * p,
    );
    ctx.lineTo(
      laneX(2, p) + width * (.045 + .09 * p),
      top + (bottom - top) * p,
    );
    ctx.strokeStyle = "#94b0e014";
    ctx.stroke();
  }
  const margin = (bottom - top) * (1 - project(1 - hitWindow / travel));
  ctx.fillStyle = "#d6e6ff0c";
  ctx.fillRect(
    width * .07,
    bottom - margin,
    width * .86,
    margin + Math.min(margin, 30),
  );
  ctx.fillStyle = "#d6e6ff44";
  ctx.fillRect(width * .07, bottom, width * .86, 2);
  // Far notes first, so the note closest to the line is drawn on top.
  for (const n of [...notes].sort((a, b) => b.at - a.at)) {
    if (n.holding) {
      const state = holdState(n, t, lanePressed(n.lane));
      if (state !== "holding") {
        finishNote({ note: n, time: t, success: state === "complete" });
        continue;
      }
    } else if (t - n.at > hitWindow) {
      finishNote({ note: n, time: t, success: false });
      continue;
    }
    const q = n.holding ? 1 : 1 - (n.at - t) / n.travel;
    if (q < 0) continue;
    const p = project(Math.min(1, q)),
      s = scaleAt(Math.min(1, q)),
      x = laneX(n.lane, p),
      y = top + (bottom - top) * p,
      w = width * .115 * s;
    if (n.duration > 0) {
      const tailP = project(
          Math.max(0, 1 - (n.at + n.duration - t) / n.travel),
        ),
        tailX = laneX(n.lane, tailP),
        tailY = top + (bottom - top) * tailP;
      ctx.save();
      ctx.lineCap = "round";
      ctx.strokeStyle = colors[n.lane] + (n.holding ? "bb" : "66");
      ctx.lineWidth = Math.max(3, w * .3);
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.strokeStyle = colors[n.lane];
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }
    // Notes are round buttons seen from the player's angle: a flattened top over a side wall,
    // all scaled by the same depth factor so they keep their 3D shape while they travel.
    const radius = Math.min(26, width * .053) * s,
      squash = .5,
      wall = radius * .38,
      color = colors[n.lane];
    ctx.shadowColor = color;
    ctx.shadowBlur = $("effects").checked ? (12 + multiplier() * 6) * s : 0;
    ctx.fillStyle = "#0d1424";
    ctx.beginPath();
    ctx.ellipse(x, y + wall, radius, radius * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color + "99";
    ctx.beginPath();
    ctx.ellipse(x, y + wall, radius, radius * squash, 0, 0, Math.PI);
    ctx.lineTo(x - radius, y);
    ctx.ellipse(x, y, radius, radius * squash, 0, Math.PI, 0, true);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    const face = ctx.createRadialGradient(
      x - radius * .35,
      y - radius * squash * .5,
      radius * .05,
      x,
      y,
      radius,
    );
    face.addColorStop(0, "#ffffff");
    face.addColorStop(.3, color);
    face.addColorStop(1, color + "cc");
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffffaa";
    ctx.lineWidth = Math.max(1, 1.5 * s);
    ctx.stroke();
    ctx.fillStyle = "#0d142455";
    ctx.beginPath();
    ctx.ellipse(
      x,
      y + radius * squash * .08,
      radius * .55,
      radius * squash * .55,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.strokeStyle = "#ffffff66";
    ctx.lineWidth = Math.max(1, s);
    ctx.beginPath();
    ctx.ellipse(
      x,
      y,
      radius * .55,
      radius * squash * .55,
      0,
      Math.PI * 1.1,
      Math.PI * 1.9,
    );
    ctx.stroke();
    if ($("effects").checked) {
      n.sparkBudget += dt * [0, 5, 18, 38, 65][multiplier()];
      const count = Math.floor(n.sparkBudget);
      n.sparkBudget -= count;
      emitSparks({
        x: x + (Math.random() - .5) * w,
        y: y - 5,
        color: colors[n.lane],
        count: count,
      });
    }
  }
  $("multiplier").textContent = "×" + multiplier();
  $("pads").dataset.power = multiplier();
  if (!$("effects").checked) particles = [];
  particles = particles.filter((p) => p.life > 0);
  ctx.globalCompositeOperation = "lighter";
  for (const p of particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.gravity * dt;
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalCompositeOperation = "source-over";
  // The hit burst names the pitch that created the note.
  labels = labels.filter((l) => l.life > 0);
  ctx.font = "bold 18px Arial";
  ctx.textAlign = "center";
  for (const l of labels) {
    l.life -= dt;
    l.y -= 40 * dt;
    ctx.globalAlpha = Math.max(0, l.life / l.maxLife);
    ctx.fillStyle = l.color;
    ctx.shadowColor = l.color;
    ctx.shadowBlur = $("effects").checked ? 10 : 0;
    ctx.fillText(l.text, l.x, l.y);
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  if (mode && t > verdictUntil) $("verdict").textContent = "";
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
document.addEventListener("visibilitychange", () => {
  if (document.hidden && mode && mode !== "tab") stop(tr("hidden"));
});
window.addEventListener("pagehide", release);
