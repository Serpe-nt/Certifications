// Small interface effects in the console style (styles in src/styles/motion.css): a crosshair that
// follows the pointer over the console, a yellow ping on every click, and mono labels that decode
// from scrambled glyphs. All of them stand still when Effects is off in Settings or the device
// asks for reduced motion. Styles are set through the CSSOM, which the CSP allows.

const GLYPHS = '#/<>_=+*%01[]';

function motionOn(): boolean {
  if (document.documentElement.getAttribute('data-motion') === 'off') return false;
  return !(typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

/** The crosshair: shown over the console's ash, hidden over the screen, dialogs and controls. */
export function wireReticle(): void {
  const r = document.querySelector<HTMLElement>('.reticle');
  const xy = r?.querySelector<HTMLElement>('.reticle-xy');
  if (!r || typeof window.matchMedia !== 'function' || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  let x = 0;
  let y = 0;
  let tx = 0;
  let ty = 0;
  let raf = 0;
  const step = () => {
    x += (tx - x) * 0.35;
    y += (ty - y) * 0.35;
    r.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(step) : 0;
  };
  window.addEventListener(
    'pointermove',
    (e) => {
      if (!motionOn()) {
        r.removeAttribute('data-on');
        return;
      }
      const target = e.target instanceof Element ? e.target : null;
      const busy = !!target?.closest('.screen, dialog, a, button, input, label, select, textarea, .topbar');
      r.toggleAttribute('data-on', !busy);
      tx = e.clientX;
      ty = e.clientY;
      if (xy) xy.textContent = `X_${String(Math.round(e.pageX)).padStart(4, '0')} Y_${String(Math.round(e.pageY)).padStart(4, '0')}`;
      if (!raf) raf = requestAnimationFrame(step);
    },
    { passive: true },
  );
  document.documentElement.addEventListener('pointerleave', () => r.removeAttribute('data-on'));
}

/** A yellow octagon pings out wherever the learner clicks (inside an open dialog too). */
export function wirePings(): void {
  window.addEventListener(
    'pointerdown',
    (e) => {
      if (!motionOn() || e.button !== 0) return;
      const target = e.target instanceof Element ? e.target : null;
      const host = target?.closest('dialog[open]') ?? document.body;
      const p = document.createElement('span');
      p.className = 'ping';
      p.setAttribute('aria-hidden', 'true');
      p.style.left = `${e.clientX}px`;
      p.style.top = `${e.clientY}px`;
      host.appendChild(p);
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
