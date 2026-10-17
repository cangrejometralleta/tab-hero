// Blade sounds are filtered noise and a few inharmonic partials: quiet, short, and pitched to say how the cut landed.

const silence = 0.001;
const ringPartials = [1, 2.76, 5.4];

// The context is read on every call, because the duel creates it only on the first Fight.
export function createDuelSound(getContext) {
  let noise = null;

  const now = () => getContext().currentTime;

  function tone(time, frequency, toFrequency, length, volume, type = "sine") {
    const context = getContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, time);
    oscillator.frequency.exponentialRampToValueAtTime(
      toFrequency,
      time + length,
    );
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(silence, time + length);
    oscillator.connect(gain).connect(context.destination);
    const startAt = Math.max(time, now());
    oscillator.start(startAt);
    oscillator.stop(startAt + length);
  }

  function createNoise(context) {
    const buffer = context.createBuffer(
      1,
      context.sampleRate,
      context.sampleRate,
    );
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function swish(frequency, toFrequency, length, volume, q = 1.2) {
    const context = getContext();
    noise ??= createNoise(context);
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const at = now();
    source.buffer = noise;
    filter.type = "bandpass";
    filter.Q.value = q;
    filter.frequency.setValueAtTime(frequency, at);
    filter.frequency.exponentialRampToValueAtTime(toFrequency, at + length);
    gain.gain.setValueAtTime(silence, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + length * 0.3);
    gain.gain.exponentialRampToValueAtTime(silence, at + length);
    source.connect(filter).connect(gain).connect(context.destination);
    source.start(at, Math.random() * 0.5);
    source.stop(at + length);
  }

  function ring(base, volume, length = 0.35) {
    ringPartials.forEach((partial, i) => {
      tone(
        now(),
        base * partial,
        base * partial * 0.995,
        length / (i + 1),
        volume / (i + 1),
      );
    });
  }

  // A STRIKE rings brighter as the multiplier climbs; a GOOD is a duller ring.
  const sounds = {
    strike: (multiplier) => {
      swish(1800, 6000, 0.14, 0.14);
      ring(1320 * 2 ** ((multiplier - 1) / 12 * 2), 0.035);
    },
    good: () => {
      swish(1500, 4000, 0.14, 0.1);
      ring(990, 0.02, 0.2);
    },
    miss: () => {
      swish(900, 350, 0.2, 0.08, 0.8);
      tone(now(), 196, 185, 0.18, 0.05, "triangle");
      tone(now(), 208, 196, 0.18, 0.035, "triangle");
    },
    parry: () => {
      swish(2500, 7000, 0.1, 0.1);
      ring(1760, 0.05, 0.5);
      ring(2349, 0.025, 0.4);
    },
    dodge: () => swish(700, 2600, 0.16, 0.07, 2),
    wave: () => {
      swish(300, 1400, 0.3, 0.09, 3);
      tone(now(), 220, 660, 0.25, 0.04);
    },
    hurt: () => {
      swish(600, 200, 0.22, 0.12, 0.7);
      tone(now(), 110, 60, 0.2, 0.18);
    },
  };

  return { tone, sounds };
}
