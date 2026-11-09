// Celebrations: the ladder of effects for finishing something (src/lib/rewards.ts decides the
// rung), and the small sound after each quiz answer.
//
// Switches (Settings): canvas effects need "effects" on and no prefers-reduced-motion; sounds
// need "sound" on. The banner carries information (what was finished), so it always shows;
// under reduced motion it appears without moving (global.css). The mock exam screen never
// calls any of this while it runs.
//
// What the last call did is written to <html data-fx-last="..."> and <html data-fx-answer="...">,
// which is how the browser tests see that a switch silenced what it should.
import type { Rung } from './rewards.ts';
import type { Settings } from './state.ts';

const TEXT: Record<Rung, string> = {
  step: 'Step complete',
  check: 'Lab check passed',
  quiz: 'Quiz passed',
  module: 'Module done',
  mock: 'Mock exam passed',
  all: 'Everything is done',
};

/** Per rung: particles, how long the effect and the banner last (ms), and the notes played. */
const SIZE: Record<Rung, { parts: number; ms: number; notes: number[] }> = {
  step: { parts: 40, ms: 1600, notes: [660] },
  check: { parts: 70, ms: 2000, notes: [660, 880] },
  quiz: { parts: 130, ms: 2600, notes: [523, 659, 784] },
  module: { parts: 220, ms: 3400, notes: [523, 659, 784, 1047] },
  mock: { parts: 340, ms: 4600, notes: [392, 523, 659, 784, 1047, 1319] },
  all: { parts: 500, ms: 6500, notes: [392, 523, 659, 784, 1047, 784, 1047, 1319, 1568] },
};

const MAX_PARTS = 600;

export function reducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Whether canvas effects and sounds may run under the current settings. */
export function switches(settings: Pick<Settings, 'effects' | 'sound'>): { visual: boolean; sound: boolean } {
  return { visual: settings.effects && !reducedMotion(), sound: settings.sound };
}

// ---------- sound ----------

let audio: AudioContext | null = null;
let out: AudioNode | null = null;

function context(): { ctx: AudioContext; dest: AudioNode } | null {
  try {
    if (!audio) {
      audio = new AudioContext();
      // A limiter in front of the speakers: the top rungs stack many notes.
      const limiter = audio.createDynamicsCompressor();
      limiter.connect(audio.destination);
      out = limiter;
    }
    if (audio.state === 'suspended') void audio.resume();
    return { ctx: audio, dest: out! };
  } catch {
    return null;
  }
}

function tone(freq: number, startIn: number, length: number, type: OscillatorType = 'triangle', volume = 0.18): void {
  const a = context();
  if (!a) return;
  const t = a.ctx.currentTime + startIn;
  const osc = a.ctx.createOscillator();
  const gain = a.ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
  osc.connect(gain).connect(a.dest);
  osc.start(t);
  osc.stop(t + length + 0.05);
}

// ---------- pictures ----------

interface Part {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  spin: number;
  angle: number;
}

function palette(): string[] {
  const css = getComputedStyle(document.documentElement);
  const colors = ['--lg-accent', '--lg-good', '--lg-warn', '--lg-bad'].map((v) => css.getPropertyValue(v).trim()).filter(Boolean);
  return colors.length ? colors : ['currentColor'];
}

let canvasTimer: number | undefined;

function burst(parts: number, ms: number): void {
  document.querySelector('canvas[data-fx-canvas]')?.remove();
  window.clearTimeout(canvasTimer);
  const canvas = document.createElement('canvas');
  canvas.className = 'fx-canvas';
  canvas.dataset.fxCanvas = '';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const g = canvas.getContext('2d');
  if (!g) return;
  const colors = palette();
  const n = Math.min(parts, MAX_PARTS);
  const list: Part[] = Array.from({ length: n }, (_, i) => {
    // Bursts from the bottom corners and the middle; bigger rungs fill more of the screen.
    const from = i % 3;
    const x = from === 0 ? 0 : from === 1 ? canvas.width : canvas.width / 2;
    const dir = from === 0 ? 1 : from === 1 ? -1 : Math.random() * 2 - 1;
    return {
      x,
      y: canvas.height,
      vx: dir * (2 + Math.random() * 7),
      vy: -(8 + Math.random() * 12),
      size: 4 + Math.random() * 6,
      color: colors[i % colors.length],
      spin: Math.random() * 0.3 - 0.15,
      angle: Math.random() * Math.PI,
    };
  });
  const start = performance.now();
  const frame = (now: number) => {
    if (!canvas.isConnected) return;
    const t = now - start;
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.globalAlpha = Math.max(0, 1 - t / ms);
    for (const p of list) {
      p.vy += 0.35;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.angle += p.spin;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.angle);
      g.fillStyle = p.color;
      g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      g.restore();
    }
    if (t < ms) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
  canvasTimer = window.setTimeout(() => canvas.remove(), ms + 500);
}

let bannerTimer: number | undefined;

function banner(rung: Rung, text: string, ms: number): void {
  document.querySelector('[data-celebration]')?.remove();
  window.clearTimeout(bannerTimer);
  const el = document.createElement('div');
  el.className = `fx-banner fx-banner-${rung}`;
  el.setAttribute('role', 'status');
  el.dataset.celebration = rung;
  el.textContent = text;
  document.body.appendChild(el);
  bannerTimer = window.setTimeout(() => el.remove(), Math.max(ms, 2500));
}

// ---------- the ladder ----------

/** Celebrates one rung of the ladder. The banner always shows; effects and sound follow the switches. */
export function celebrate(rung: Rung, settings: Pick<Settings, 'effects' | 'sound'>, text = TEXT[rung]): void {
  const { visual, sound } = switches(settings);
  const size = SIZE[rung];
  document.documentElement.dataset.fxLast = `${rung} effects=${visual ? 'on' : 'off'} sound=${sound ? 'on' : 'off'}`;
  banner(rung, text, size.ms);
  if (visual) burst(size.parts, size.ms);
  if (sound) size.notes.forEach((f, i) => tone(f, i * 0.11, i === size.notes.length - 1 ? 0.6 : 0.25));
}

/** A short information line, such as a new level. Shown without effects. */
export function notice(text: string): void {
  const el = document.createElement('div');
  el.className = 'fx-notice';
  el.setAttribute('role', 'status');
  el.dataset.fxNotice = '';
  el.textContent = text;
  document.body.appendChild(el);
  window.setTimeout(() => el.remove(), 3000);
}

/**
 * The sound after a quiz or practice answer (never in a mock exam): a rising pair whose pitch
 * climbs with the run of right answers, or a low tone for a miss.
 */
export function answerFx(right: boolean, row: number, settings: Pick<Settings, 'effects' | 'sound'>): void {
  const { sound } = switches(settings);
  document.documentElement.dataset.fxAnswer = `${right ? 'right' : 'wrong'} sound=${sound ? 'on' : 'off'}`;
  if (!sound) return;
  if (right) {
    const step = Math.min(row, 12);
    tone(523 * 2 ** (step / 12), 0, 0.12);
    tone(784 * 2 ** (step / 12), 0.09, 0.2);
  } else {
    tone(196, 0, 0.3, 'sine', 0.2);
  }
}
