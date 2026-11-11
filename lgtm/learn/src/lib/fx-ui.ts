// Small interface effects in the console style (styles in src/styles/motion.css): a crosshair that
// is the pointer, a yellow ping on every click, and mono labels that decode
// from scrambled glyphs. All of them stand still when Effects is off in Settings or the device
// asks for reduced motion. Styles are set through the CSSOM, which the CSP allows.

const GLYPHS = '#/<>_=+*%01[]';

function motionOn(): boolean {
  if (document.documentElement.getAttribute('data-motion') === 'off') return false;
  return !(typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

/** Things the crosshair locks on to. */
const HOT = 'a[href], button:not(:disabled), label, select, summary, [role="tab"], input[type="checkbox"]:not(:disabled), input[type="radio"]:not(:disabled), [data-dialog-close]';
/** Text fields keep the system's text cursor; the crosshair steps aside there. */
const TEXT = 'input:not([type="checkbox"], [type="radio"], [type="button"], [type="submit"], [type="file"], [type="range"]), textarea, [contenteditable="true"]';

/**
 * The crosshair is the pointer on a device with a mouse: the system cursor is hidden while it is on
 * (motion.css, html[data-reticle]). It follows the pointer directly, moves into an open dialog (a
 * dialog sits in the top layer, above anything in the page), locks on over things you can click,
 * tightens while pressed, and shows its coordinates over the console's ash. With Effects off,
 * reduced motion, or while a mock exam runs, the system cursor comes back.
 */
export function wireReticle(): void {
  const r = document.querySelector<HTMLElement>('.reticle');
  const xy = r?.querySelector<HTMLElement>('.reticle-xy');
  if (!r || typeof window.matchMedia !== 'function' || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const root = document.documentElement;
  let x = 0;
  let y = 0;
  let raf = 0;
  const off = () => {
    root.removeAttribute('data-reticle');
    r.removeAttribute('data-on');
  };
  const draw = () => {
    raf = 0;
    r.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse' || !motionOn() || document.querySelector('[data-exam-running]')) {
        off();
        return;
      }
      // Live where the pointer is: inside the open dialog, or in the page.
      const host = document.querySelector('dialog[open]') ?? document.body;
      if (r.parentElement !== host) host.appendChild(r);
      root.setAttribute('data-reticle', '');
      r.setAttribute('data-on', '');
      const target = e.target instanceof Element ? e.target : null;
      r.toggleAttribute('data-text', !!target?.closest(TEXT));
      r.toggleAttribute('data-hot', !!target?.closest(HOT));
      const ash = !target?.closest('.screen, dialog, .topbar, .pagehead');
      r.toggleAttribute('data-ash', ash);
      x = e.clientX;
      y = e.clientY;
      if (ash && xy) xy.textContent = `X_${String(Math.round(e.pageX)).padStart(4, '0')} Y_${String(Math.round(e.pageY)).padStart(4, '0')}`;
      if (!raf) raf = requestAnimationFrame(draw);
    },
    { passive: true },
  );
  window.addEventListener('pointerdown', () => r.setAttribute('data-down', ''), { passive: true });
  window.addEventListener('pointerup', () => r.removeAttribute('data-down'), { passive: true });
  root.addEventListener('pointerleave', () => r.removeAttribute('data-on'));
  window.addEventListener('blur', () => r.removeAttribute('data-on'));
  // When a dialog closes, the crosshair goes back to the page before the dialog leaves the top layer.
  document.addEventListener('close', () => {
    if (r.parentElement !== document.body) document.body.appendChild(r);
  }, true);
}

/** A yellow octagon pings out wherever the learner clicks, outside dialogs. Inside a dialog a fixed
 *  element would be placed against the dialog while it animates and spill over its edges, giving it
 *  scrollbars, so clicks there send no ping. */
export function wirePings(): void {
  window.addEventListener(
    'pointerdown',
    (e) => {
      if (!motionOn() || e.button !== 0) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest('dialog') || document.querySelector('dialog[open]')) return;
      const p = document.createElement('span');
      p.className = 'ping';
      p.setAttribute('aria-hidden', 'true');
      p.style.left = `${e.clientX}px`;
      p.style.top = `${e.clientY}px`;
      document.body.appendChild(p);
      const done = () => p.remove();
      p.addEventListener('animationend', done);
      window.setTimeout(done, 900);
    },
    { passive: true },
  );
}

/** Scrambles a plain-text element and lets its letters settle from left to right. */
function decode(el: HTMLElement, ms = 520): void {
  if (el.hasAttribute('data-decoding') || el.children.length > 0) return;
  const final = el.dataset.decodeText ?? el.textContent ?? '';
  if (!final.trim()) return;
  el.dataset.decodeText = final;
  el.setAttribute('data-decoding', '');
  const t0 = performance.now();
  const frame = (now: number) => {
    const p = Math.min(1, (now - t0) / ms);
    const n = Math.floor(final.length * p);
    let out = final.slice(0, n);
    for (const c of final.slice(n)) out += c === ' ' ? ' ' : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    el.textContent = p < 1 ? out : final;
    if (p < 1) requestAnimationFrame(frame);
    else el.removeAttribute('data-decoding');
  };
  requestAnimationFrame(frame);
}

/** Labels decode when the page loads or when they scroll into view; the top bar's buttons decode on hover.
 *  Only server-rendered labels take part: text inside React islands is React's to change. */
export function wireDecode(): void {
  const usable = (el: HTMLElement) => !el.closest('astro-island') && el.children.length === 0;
  const onLoad = document.querySelectorAll<HTMLElement>('.tag, .crumb > span, .matrix-foot span');
  const onView = document.querySelectorAll<HTMLElement>('.side-box h2 > span, .info-cap > span, .ov-sh-n, .ov-sh-c');
  const hover = document.querySelectorAll<HTMLElement>('.navbtn');
  // Links keep their accessible name while their text is scrambled.
  for (const a of hover) if (usable(a) && !a.hasAttribute('aria-label')) a.setAttribute('aria-label', a.textContent ?? '');
  if (motionOn()) for (const el of onLoad) if (usable(el)) decode(el);
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          io.unobserve(e.target);
          if (motionOn()) decode(e.target as HTMLElement, 420);
        }
      },
      { threshold: 0.6 },
    );
    for (const el of onView) if (usable(el)) io.observe(el);
  }
  for (const a of hover) {
    if (!usable(a)) continue;
    a.addEventListener('pointerenter', () => motionOn() && decode(a, 300));
  }
}
