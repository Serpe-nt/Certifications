// Notifications at the right-hand side of the window (styles in src/styles/toast.css): saved
// settings, errors, finished steps and modules, new levels and badges. The owner asked for "a pop
// message at the right hand side of the screen" for these (2026-11-11). Each one slides in, shows a
// countdown bar, and leaves on its own; hovering it holds the countdown, and its X dismisses it.
// While a dialog is open the stack lives inside it, because a dialog sits above everything else.
// Text is set with textContent only: nothing from the state reaches the page as HTML.

export type ToastKind = 'ok' | 'error' | 'info' | 'done' | 'level' | 'badge';

export interface ToastOptions {
  kind?: ToastKind;
  /** The short line in capitals above the title. */
  kicker?: string;
  title: string;
  text?: string;
  /** How long it stays, in ms. */
  ms?: number;
  /** A celebration rung: written to the title's data-celebration (the browser tests read it). */
  celebration?: string;
  /** A large figure beside the title, such as a level number. */
  figure?: string;
}

const KICKER: Record<ToastKind, string> = {
  ok: 'Saved',
  error: 'Not saved',
  info: 'Note',
  done: 'Complete',
  level: 'Level up',
  badge: 'Badge earned',
};

const ICON: Record<ToastKind, string> = {
  ok: 'M4 12.5 9.5 18 20 6.5',
  error: 'M6 6l12 12M18 6 6 18',
  info: 'M12 7v.5M12 11v7',
  done: 'M5 21V4h11l-2 4 2 4H5',
  level: 'M5 15l7-7 7 7M5 21l7-7 7 7',
  badge: 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.3 6L12 16.4 6.6 19.4l1.3-6L3.4 9.3l6-.7z',
};

const MAX = 4;

function motionOn(): boolean {
  if (document.documentElement.getAttribute('data-motion') === 'off') return false;
  return !(typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

/** The stack, in the open dialog when there is one, else in the page. */
function stack(): HTMLElement {
  let el = document.querySelector<HTMLElement>('.toasts');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toasts';
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', 'Notifications');
    // When a dialog closes, the stack goes back to the page with it.
    document.addEventListener(
      'close',
      () => {
        const s = document.querySelector<HTMLElement>('.toasts');
        if (s && s.parentElement !== document.body) document.body.appendChild(s);
      },
      true,
    );
  }
  const host = document.querySelector('dialog[open]') ?? document.body;
  if (el.parentElement !== host) host.appendChild(el);
  return el;
}

function svg(d: string, cls: string): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(ns, 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('class', cls);
  const p = document.createElementNS(ns, 'path');
  p.setAttribute('d', d);
  s.appendChild(p);
  return s;
}

function leave(el: HTMLElement): void {
  if (el.hasAttribute('data-leaving')) return;
  el.setAttribute('data-leaving', '');
  if (!motionOn()) {
    el.remove();
    return;
  }
  el.addEventListener('animationend', () => el.remove(), { once: true });
  window.setTimeout(() => el.remove(), 600);
}

/** Shows a notification and returns its element. */
export function toast(o: ToastOptions): HTMLElement {
  const kind = o.kind ?? 'info';
  const ms = o.ms ?? (kind === 'error' ? 7000 : kind === 'ok' || kind === 'info' ? 3800 : 6000);
  const box = stack();
  for (const old of box.querySelectorAll<HTMLElement>('.toast:not([data-leaving])')) {
    if (old.dataset.toast === kind && old.querySelector('.toast-title')?.textContent === o.title) old.remove();
  }

  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.dataset.toast = kind;
  el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  el.style.setProperty('--toast-ms', `${ms}ms`);

  el.appendChild(svg(ICON[kind], 'toast-icon'));
  const body = document.createElement('div');
  body.className = 'toast-body';
  const kicker = document.createElement('p');
  kicker.className = 'toast-kicker mono';
  kicker.textContent = o.kicker ?? KICKER[kind];
  const title = document.createElement('p');
  title.className = 'toast-title';
  title.textContent = o.title;
  if (o.celebration) title.dataset.celebration = o.celebration;
  body.append(kicker, title);
  if (o.text) {
    const text = document.createElement('p');
    text.className = 'toast-text';
    text.textContent = o.text;
    body.appendChild(text);
  }
  el.appendChild(body);
  if (o.figure) {
    const fig = document.createElement('span');
    fig.className = 'toast-figure';
    fig.setAttribute('aria-hidden', 'true');
    fig.textContent = o.figure;
    el.appendChild(fig);
  }
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'toast-close';
  close.setAttribute('aria-label', 'Dismiss');
  close.appendChild(svg('M5 5l14 14M19 5 5 19', 'toast-x'));
  close.addEventListener('click', () => leave(el));
  el.appendChild(close);
  const timer = document.createElement('span');
  timer.className = 'toast-timer';
  timer.setAttribute('aria-hidden', 'true');
  el.appendChild(timer);

  box.appendChild(el);
  // At most MAX on screen: the oldest leave. Toasts already leaving do not count.
  const live = [...box.children].filter((c) => !c.hasAttribute('data-leaving')) as HTMLElement[];
  for (let k = 0; k < live.length - MAX; k++) leave(live[k]);

  // The countdown is the timer bar's animation, so hovering (which pauses it) holds the toast.
  // Without motion the bar does not run; a plain timeout ends it.
  if (motionOn()) {
    timer.addEventListener('animationend', () => leave(el), { once: true });
  } else {
    // Without motion: a timeout, held while the pointer is on the toast.
    let left = ms;
    let since = Date.now();
    let t = window.setTimeout(() => leave(el), left);
    el.addEventListener('pointerenter', () => {
      window.clearTimeout(t);
      left -= Date.now() - since;
    });
    el.addEventListener('pointerleave', () => {
      since = Date.now();
      t = window.setTimeout(() => leave(el), Math.max(800, left));
    });
  }
  return el;
}
