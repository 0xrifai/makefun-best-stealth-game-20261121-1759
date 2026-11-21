// Audio: every sound in Shadowline is synthesized with the WebAudio API.
// No audio files are loaded. Footsteps are panned by direction and quieter
// with distance, so you can hear where a guard is before you see one.

let ctx = null;
let master = null;
let drone = null;
let muted = false;

function ensureContext() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.9;
  master.connect(ctx.destination);
  return ctx;
}

// A short filtered-noise thud, used for footsteps. pan: -1 left .. 1 right.
function thud(pan, volume, lowpassHz, decaySeconds) {
  if (!ensureContext()) return;
  const t = ctx.currentTime;
  const dur = 0.09;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpassHz;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + decaySeconds);
  const panner = ctx.createStereoPanner();
  panner.pan.value = Math.max(-1, Math.min(1, pan));
  src.connect(filter);
  filter.connect(gain);
  gain.connect(panner);
  panner.connect(master);
  src.start(t);
  src.stop(t + dur);
}

function tone(freq, startAt, duration, type, volume, slideTo) {
  if (!ensureContext()) return;
  const t = ctx.currentTime + startAt;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

export const audio = {
  unlock() {
    ensureContext();
    this.startDrone();
  },
  toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.9;
    return muted;
  },
  isMuted() {
    return muted;
  },
  // A low room tone that starts once the player begins a run.
  startDrone() {
    if (!ensureContext() || drone) return;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 52;
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 6;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    const gain = ctx.createGain();
    gain.gain.value = 0.018;
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    lfo.start();
    drone = { osc, lfo };
  },
  // A guard's step: heavy, panned by where the guard is relative to the player.
  guardStep(dx, dy) {
    const dist = Math.hypot(dx, dy);
    const volume = Math.max(0, 0.5 * (1 - dist / 520));
    if (volume < 0.02) return;
    thud(dx / 440, volume, 320, 0.11);
  },
  // The player's own step: soft, centred, slightly higher.
  playerStep(sneaking) {
    thud(0, sneaking ? 0.05 : 0.11, 500, 0.08);
  },
  // A pebble tossed across the floor.
  pebble() {
    tone(1400, 0, 0.06, 'triangle', 0.12, 900);
    tone(900, 0.09, 0.05, 'triangle', 0.08, 600);
  },
  // A chip collected.
  pickup() {
    tone(660, 0, 0.09, 'sine', 0.16);
    tone(990, 0.08, 0.14, 'sine', 0.16);
  },
  // The short sting when a guard goes fully alert.
  alertSting() {
    tone(220, 0, 0.16, 'sawtooth', 0.14, 330);
    tone(330, 0.1, 0.22, 'sawtooth', 0.12, 440);
  },
  // Caught: a low descending buzz.
  caught() {
    tone(180, 0, 0.5, 'sawtooth', 0.16, 70);
    tone(90, 0.05, 0.55, 'square', 0.08, 55);
  },
  // Level clear: a small rising chime.
  winChime() {
    tone(523, 0, 0.16, 'sine', 0.15);
    tone(659, 0.12, 0.16, 'sine', 0.15);
    tone(784, 0.24, 0.3, 'sine', 0.16);
  },
  // A soft blip for menu / level-start clicks.
  blip() {
    tone(520, 0, 0.07, 'sine', 0.1);
  },
};
