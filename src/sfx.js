// All sound is synthesised. Levels are deliberately low; a compressor catches anything that is not.
let ctx, master, lowpass, dry, wet;
const N = {};

function noiseBuf(sec, kind = 'white') {
  const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === 'brown') (last = (last + 0.02 * w) / 1.02), (d[i] = last * 3.5);
    else d[i] = w;
  }
  return b;
}
function out(node, dryGain = 1, wetGain = 0.5) {
  const a = ctx.createGain(), b = ctx.createGain();
  a.gain.value = dryGain;
  b.gain.value = wetGain;
  node.connect(a).connect(dry);
  node.connect(b).connect(wet);
}
function loop(buf, type, freq, q, gain, wetGain = 0.3) {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = buf;
  s.loop = true;
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  g.gain.value = gain;
  s.connect(f).connect(g);
  out(g, 1, wetGain);
  s.start();
  return { g, f };
}
function env(g, t0, a, peak, d) {
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
}
function burst(buf, type, freq, q, peak, a, d, wetGain = 0.5, rate = 1) {
  if (!ctx) return;
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = buf;
  s.playbackRate.value = rate;
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  env(g, ctx.currentTime, a, peak, d);
  s.connect(f).connect(g);
  out(g, 1, wetGain);
  s.start();
  s.stop(ctx.currentTime + a + d + 0.1);
}
function tone(type, f0, f1, peak, a, d, wetGain = 0.6, when = 0) {
  if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + when;
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + a + d);
  env(g, t, a, peak, d);
  o.connect(g);
  out(g, 1, wetGain);
  o.start(t);
  o.stop(t + a + d + 0.1);
}

// a jingle from somewhere else in the building, slightly too slow
const TUNE = [0, 4, 7, 12, 7, 4, 9, 7, 5, 9, 12, 9, 7, 4, 2, -1, 0, 4, 7, 4, 5, 2, 0, -1];
let tuneI = 0, tuneT = 0;
function scheduleTune() {
  if (!ctx) return;
  while (tuneT < ctx.currentTime + 0.6) {
    const n = TUNE[tuneI++ % TUNE.length];
    if (n >= 0) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = 392 * 2 ** (n / 12);
      o.detune.value = Math.sin(tuneT * 0.7) * 22;
      env(g, tuneT, 0.02, 0.5, 0.9);
      o.connect(g).connect(N.music);
      o.start(tuneT);
      o.stop(tuneT + 1.1);
    }
    tuneT += 0.46;
  }
}

export const sfx = {
  start() {
    if (ctx) return ctx.resume();
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.0001;
    master.gain.exponentialRampToValueAtTime(0.42, ctx.currentTime + 2.5);
    lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 18000;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 6;
    master.connect(lowpass).connect(comp).connect(ctx.destination);
    dry = ctx.createGain();
    dry.connect(master);
    // a very large tiled room
    const conv = ctx.createConvolver(), len = ctx.sampleRate * 3.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6 * (i < 600 ? i / 600 : 1);
    }
    conv.buffer = ir;
    wet = ctx.createGain();
    wet.gain.value = 0.55;
    wet.connect(conv).connect(master);

    N.white = noiseBuf(2);
    N.brown = noiseBuf(5, 'brown');
    N.hvac = loop(N.brown, 'lowpass', 160, 0.5, 0.5, 0.1);
    N.lap = loop(N.white, 'bandpass', 1100, 0.7, 0.012, 0.6);
    N.machine = loop(N.brown, 'lowpass', 90, 1.2, 0.0, 0.2);
    N.wash = loop(N.white, 'bandpass', 420, 0.5, 0.0, 0.5);
    N.under = loop(N.brown, 'lowpass', 300, 1, 0.0, 0);
    N.gurgle = loop(N.brown, 'bandpass', 240, 6, 0.0, 0.3);
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 0.23;
    lg.gain.value = 0.008;
    lfo.connect(lg).connect(N.lap.g.gain);
    lfo.start();
    const gl = ctx.createOscillator(), gg = ctx.createGain();
    gl.frequency.value = 3.1;
    gg.gain.value = 120;
    gl.connect(gg).connect(N.gurgle.f.frequency);
    gl.start();
    // jingle: reverb only, heavily filtered, as if through several walls
    N.music = ctx.createGain();
    N.music.gain.value = 0.05;
    const mf = ctx.createBiquadFilter();
    mf.type = 'lowpass';
    mf.frequency.value = 900;
    N.music.connect(mf).connect(wet);
    tuneT = ctx.currentTime + 1;
    setInterval(scheduleTune, 250);
    // drips
    const drip = () => {
      tone('sine', 1500 + Math.random() * 900, 700, 0.02, 0.004, 0.09, 1.2);
      setTimeout(drip, 2500 + Math.random() * 9000);
    };
    setTimeout(drip, 4000);
  },
  pause(on) {
    if (ctx) on ? ctx.suspend() : ctx.resume();
  },
  set(name, v, sec = 1) {
    if (!ctx || !N[name]) return;
    const g = N[name].g ? N[name].g.gain : N[name].gain;
    g.setTargetAtTime(v, ctx.currentTime, sec / 3);
  },
  under(on) {
    if (!ctx) return;
    lowpass.frequency.setTargetAtTime(on ? 420 : 18000, ctx.currentTime, 0.04);
    this.set('under', on ? 0.5 : 0, 0.2);
  },
  step(wetFloor, hard) {
    if (wetFloor) burst(N.white, 'bandpass', 900 + Math.random() * 500, 0.8, hard ? 0.09 : 0.045, 0.01, 0.2, 0.5);
    else burst(N.white, 'bandpass', 520 + Math.random() * 260, 1.4, hard ? 0.09 : 0.04, 0.005, 0.09, 0.9, 0.8 + Math.random() * 0.3);
  },
  splash(v = 1) {
    burst(N.white, 'bandpass', 700, 0.5, 0.14 * v, 0.02, 0.6, 0.7);
    burst(N.brown, 'lowpass', 300, 0.7, 0.3 * v, 0.01, 0.35, 0.3);
  },
  gasp() {
    burst(N.white, 'bandpass', 1900, 1.2, 0.035, 0.12, 0.35, 0.3);
  },
  thud() {
    tone('sine', 85, 38, 0.5, 0.01, 0.5, 0.2);
    burst(N.brown, 'lowpass', 140, 1, 0.5, 0.01, 0.4, 0.2);
  },
  knock() {
    tone('sine', 150, 90, 0.2, 0.004, 0.12, 0.25);
  },
  clunk() {
    burst(N.white, 'bandpass', 260, 2, 0.4, 0.002, 0.12, 1.4);
    tone('square', 70, 50, 0.1, 0.003, 0.25, 1.2);
  },
  clang() {
    for (const f of [311, 467, 739, 1108]) tone('sine', f * (1 + Math.random() * 0.01), f * 0.985, 0.05, 0.003, 2.2, 1.6);
    burst(N.white, 'bandpass', 2400, 3, 0.1, 0.002, 0.2, 1.5);
  },
  horn() {
    if (!ctx) return;
    for (const [f, d] of [[233, 0], [277, 0.02]]) {
      const o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain(), t = ctx.currentTime + d;
      o.type = 'sawtooth';
      o.frequency.value = f;
      fl.type = 'lowpass';
      fl.frequency.value = 700;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.09, t + 0.15);
      g.gain.setValueAtTime(0.09, t + 2.2);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.9);
      o.connect(fl).connect(g);
      out(g, 0.5, 1.4);
      o.start(t);
      o.stop(t + 3);
    }
  },
  chime() {
    [659, 523, 587, 392].forEach((f, i) => tone('sine', f, f, 0.06, 0.01, 0.9, 1.4, i * 0.42));
  },
  hiss(sec = 1.2, level = 0.07) {
    burst(N.white, 'highpass', 1800, 0.5, level, 0.02, sec, 0.9);
  },
  flash() {
    burst(N.white, 'highpass', 3000, 0.5, 0.12, 0.001, 0.08, 0.3);
    tone('sine', 2400, 5200, 0.012, 0.3, 1.8, 0.2);
  },
  // the one loud moment; still capped well below the compressor ceiling
  sting() {
    for (const f of [58, 61.5, 87, 92]) tone('sawtooth', f, f * 0.92, 0.16, 0.03, 2.6, 0.5);
    burst(N.white, 'bandpass', 2600, 1.5, 0.2, 0.01, 0.5, 0.8);
    burst(N.brown, 'lowpass', 200, 0.7, 0.9, 0.02, 1.4, 0.3);
  },
  // what it sounds like when it has you: short, and still under the ceiling
  shriek() {
    tone('sawtooth', 860, 280, 0.13, 0.004, 0.55, 0.6);
    tone('square', 1290, 400, 0.05, 0.004, 0.5, 0.6);
    burst(N.white, 'bandpass', 3200, 2, 0.24, 0.004, 0.45, 0.6);
    burst(N.brown, 'lowpass', 160, 0.7, 0.8, 0.005, 0.9, 0.2);
  },
  // a cheap plastic whistle: a pea rattling in it, not loud
  whistle() {
    if (!ctx) return;
    const o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain(), t = ctx.currentTime;
    o.type = 'sine';
    o.frequency.value = 2650;
    lfo.frequency.value = 38;
    lg.gain.value = 140;
    lfo.connect(lg).connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.03);
    g.gain.setValueAtTime(0.05, t + 0.55);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
    o.connect(g);
    out(g, 1, 1.2);
    o.start(t);
    lfo.start(t);
    o.stop(t + 0.8);
    lfo.stop(t + 0.8);
  },
  heartbeat() {
    tone('sine', 62, 40, 0.3, 0.01, 0.14, 0);
    tone('sine', 55, 36, 0.2, 0.01, 0.16, 0, 0.22);
  },
  // voices and laughter with a sheet of glass in the way: vowel-ish bursts, nothing above 700 Hz
  laughter() {
    if (!ctx) return;
    let t = 0;
    for (let ph = 0; ph < 3; ph++) {
      const base = 300 + Math.random() * 260, n = 4 + ((Math.random() * 4) | 0);
      for (let i = 0; i < n; i++) {
        const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(), t0 = ctx.currentTime + t;
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(base * (1.25 - i * 0.05), t0);
        o.frequency.exponentialRampToValueAtTime(base * (0.95 - i * 0.04), t0 + 0.13);
        f.type = 'bandpass';
        f.frequency.value = 560;
        f.Q.value = 1.6;
        env(g, t0, 0.02, 0.05, 0.12);
        o.connect(f).connect(g);
        out(g, 0.5, 0.9);
        o.start(t0);
        o.stop(t0 + 0.3);
        t += 0.17 + Math.random() * 0.03;
      }
      t += 0.5 + Math.random() * 0.8;
    }
  },
  // a public-address voice with the words worn off: pitch and vowels move like speech, nothing can be made out
  garble(sec = 4, level = 0.05) {
    if (!ctx) return;
    const t0 = ctx.currentTime + 0.05;
    const o = ctx.createOscillator(), f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(), g = ctx.createGain(), band = ctx.createBiquadFilter();
    o.type = 'sawtooth';
    f1.type = f2.type = 'bandpass';
    f1.Q.value = 5;
    f2.Q.value = 7;
    band.type = 'bandpass';
    band.frequency.value = 1300;
    band.Q.value = 0.6;
    g.gain.setValueAtTime(0.0001, t0);
    let t = t0;
    while (t < t0 + sec) {
      const d = 0.11 + Math.random() * 0.16, pause = Math.random() < 0.16 ? 0.22 + Math.random() * 0.25 : 0.02;
      o.frequency.setValueAtTime(205 + Math.random() * 60, t);
      o.frequency.linearRampToValueAtTime(190 + Math.random() * 50, t + d);
      f1.frequency.setValueAtTime(320 + Math.random() * 520, t);
      f2.frequency.setValueAtTime(950 + Math.random() * 1300, t);
      g.gain.linearRampToValueAtTime(level, t + 0.03);
      g.gain.setValueAtTime(level, t + d - 0.03);
      g.gain.linearRampToValueAtTime(0.0001, t + d);
      t += d + pause;
    }
    const mix = ctx.createGain();
    o.connect(f1).connect(mix);
    o.connect(f2).connect(mix);
    mix.connect(g).connect(band);
    out(band, 0.25, 1.6);
    o.start(t0);
    o.stop(t + 0.1);
  },
  tick() {
    tone('sine', 1200, 900, 0.025, 0.002, 0.05, 0.2);
  },
  hush() {},
};
