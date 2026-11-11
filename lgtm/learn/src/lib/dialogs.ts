// Settings and Practice open as dialogs over the page the learner is on (the owner's request at the
// second design stop). The open dialog lives in the address: #settings, #practice or #practice=<step id>,
// so a reload reopens it and Back closes it. Without a dialog on the page, the links go to the full pages.
import { validId } from './state.ts';

const NAMES = ['settings', 'practice'] as const;
type Name = (typeof NAMES)[number];

function parseHash(): { name: Name; step: string } | null {
  const m = /^#(settings|practice)(?:=([a-z0-9-]+))?$/.exec(window.location.hash);
  if (!m) return null;
  return { name: m[1] as Name, step: m[2] && validId(m[2]) ? m[2] : '' };
}

/** The step a Practice dialog was opened for, read by the Practice island. */
export function practiceStepFromHash(): string {
  const h = parseHash();
  return h && h.name === 'practice' ? h.step : '';
}

function dialogFor(name: Name): HTMLDialogElement | null {
  return document.querySelector<HTMLDialogElement>(`dialog[data-dialog-name="${name}"]`);
}

/** Opens or closes the dialogs to match the address. */
function sync(): void {
  const want = parseHash();
  for (const name of NAMES) {
    const d = dialogFor(name);
    if (!d) continue;
    if (want?.name === name && !d.open) d.showModal();
    if (want?.name !== name && d.open) d.close();
  }
}

export function wireDialogs(): void {
  // Delegated, so links inside islands that hydrate later work too.
  document.addEventListener('click', (e) => {
    const a = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[data-dialog]');
    if (!a) return;
    const name = a.dataset.dialog as Name;
    if (!NAMES.includes(name) || !dialogFor(name)) return;
    e.preventDefault();
    const step = a.dataset.practiceStep && validId(a.dataset.practiceStep) ? a.dataset.practiceStep : '';
    const url = new URL(window.location.href);
    url.hash = step ? `${name}=${step}` : name;
    history.pushState({ dialog: true }, '', url);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  for (const name of NAMES) {
    const d = dialogFor(name);
    if (!d) continue;
    d.addEventListener('close', () => {
      if (parseHash()?.name !== name) return;
      // Opened from this page: step back. Opened by a reload with the hash: drop the hash.
      if (history.state?.dialog) history.back();
      else history.replaceState(null, '', window.location.pathname + window.location.search);
    });
    d.addEventListener('click', (e) => {
      if (e.target === d) d.close(); // a click on the backdrop
    });
    d.querySelector('[data-dialog-close]')?.addEventListener('click', () => d.close());
  }
  window.addEventListener('hashchange', sync);
  window.addEventListener('popstate', sync);
  sync();
}
