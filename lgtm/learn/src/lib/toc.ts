// The contents list in the step's sidebar marks the section being read (aria-current="location").
// The current section is the last heading that has scrolled above 30% of the window's height.
export function wireToc(): void {
  const links = [...document.querySelectorAll<HTMLAnchorElement>('.toc a[href^="#"]')];
  const heads = links.map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))));
  if (links.length === 0 || heads.some((h) => !h)) return;
  let queued = false;
  const update = () => {
    queued = false;
    let current = -1;
    heads.forEach((h, i) => {
      if (h!.getBoundingClientRect().top < window.innerHeight * 0.3) current = i;
    });
    links.forEach((a, i) => {
      if (i === current) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
  };
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  update();
}
