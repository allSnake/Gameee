// Winzige WebAudio-Effekte, ohne Dateien. Der Kontext startet erst nach der ersten Interaktion.
let ctx = null;
let muted = false;

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur = 0.12, type = 'sine', vol = 0.08, delay = 0, slideTo = null) {
  if (muted) return;
  const a = ac();
  if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  place:   () => tone(300, 0.07, 'square', 0.04),
  remove:  () => tone(180, 0.1, 'sawtooth', 0.04, 0, 90),
  deliver: (progress = 0) => tone(520 + progress * 500, 0.15, 'triangle', 0.09),
  partDone: () => { tone(660, 0.12, 'triangle', 0.09); tone(880, 0.18, 'triangle', 0.09, 0.1); },
  finish:  () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.1, i * 0.12)),
  squeak:  () => { tone(900, 0.12, 'square', 0.05, 0, 1500); tone(1300, 0.1, 'square', 0.05, 0.14, 800); },
  setMuted: (v) => { muted = v; },
  isMuted: () => muted,
};
