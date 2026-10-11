let _ctx: AudioContext | null = null;
let _muted = false;

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    _ctx ??= new AudioContext();
    if (_ctx.state === 'suspended') void _ctx.resume();
    return _ctx;
  } catch {
    return null;
  }
}

interface Note {
  freq: number;
  t: number;
  dur: number;
  gain?: number;
  type?: OscillatorType;
}

function play(notes: Note[]): void {
  if (_muted) return;
  const ctx = ac();
  if (!ctx) return;
  const now = ctx.currentTime;
  for (const { freq, t, dur, gain = 0.2, type = 'sine' } of notes) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now + t);
    g.gain.setValueAtTime(0, now + t);
    g.gain.linearRampToValueAtTime(gain, now + t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, now + t + dur);
    osc.start(now + t);
    osc.stop(now + t + dur + 0.02);
  }
}

export const sounds = {
  move: () => play([
    { freq: 480, t: 0, dur: 0.08 },
  ]),

  capture: () => play([
    { freq: 240, t: 0,    dur: 0.12, gain: 0.28, type: 'sawtooth' },
    { freq: 160, t: 0.06, dur: 0.15, gain: 0.18, type: 'sawtooth' },
  ]),

  castle: () => play([
    { freq: 440, t: 0,    dur: 0.07 },
    { freq: 560, t: 0.09, dur: 0.08 },
  ]),

  check: () => play([
    { freq: 660, t: 0,    dur: 0.10, gain: 0.28 },
    { freq: 880, t: 0.13, dur: 0.12, gain: 0.22 },
  ]),

  promotion: () => play(
    [440, 550, 660, 880].map((freq, i) => ({ freq, t: i * 0.09, dur: 0.13 }))
  ),

  gameOver: () => play(
    [660, 550, 440, 330].map((freq, i) => ({ freq, t: i * 0.16, dur: 0.22, gain: 0.22 }))
  ),

  draw: () => play([
    { freq: 440, t: 0,    dur: 0.15 },
    { freq: 330, t: 0.18, dur: 0.15 },
  ]),

  setMuted: (v: boolean) => { _muted = v; },
  isMuted: () => _muted,
};
