// Small interface effects in the console style (styles in src/styles/motion.css): a yellow ping on
// every click, and mono labels that decode from scrambled glyphs. (The crosshair cursor was removed
// at the owner's request on 2026-11-16; the system cursor is used everywhere.) All of them stand still when Effects is off in Settings or the device
// asks for reduced motion. Styles are set through the CSSOM, which the CSP allows.

const GLYPHS = '#/<>_=+*%01[]';

function motionOn(): boolean {
  if (document.documentElement.getAttribute('data-motion') === 'off') return false;
  return !(typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
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
  // Timed from the animation frames alone, so a frozen or faked clock cannot keep it scrambling.
  let t0 = -1;
  const frame = (now: number) => {
    if (t0 < 0) t0 = now;
    const p = Math.max(0, Math.min(1, (now - t0) / ms));
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
  // Mono labels only: the display face's glyphs differ in width, so a decoding tag would jitter.
  const onLoad = document.querySelectorAll<HTMLElement>('.crumb > span, .matrix-foot span');
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
