// Runs on every page: starts the sync, applies the motion setting, fills in lab links, wires copy buttons.
import { fetchBank } from './bank.ts';
import { wireDialogs } from './dialogs.ts';
import { wireDecode, wirePings, wireReticle } from './fx-ui.ts';
import { getStore, type SyncStatus } from './store.ts';
import type { State } from './state.ts';

const STATUS_TEXT: Record<SyncStatus, string> = {
  local: '',
  synced: '',
  pending: 'Saving',
  offline: 'Offline: saved on this device',
  error: 'Not synced',
};

/** The site has one theme; Effects off in Settings calms the page's motion as well as the celebrations. */
function applyMotion(s: State): void {
  if (s.settings.effects === false) document.documentElement.setAttribute('data-motion', 'off');
  else document.documentElement.removeAttribute('data-motion');
}

/** <LabLink> renders an anchor with data-lab; its address comes from the lab domain setting. */
function applyLabLinks(s: State): void {
  for (const a of document.querySelectorAll<HTMLAnchorElement>('a[data-lab]')) {
    const host = a.dataset.lab ?? '';
    const path = a.dataset.path ?? '/';
    a.href = `http://${host}.${s.settings.labDomain}${path}`;
  }
}

function wireCopyButtons(): void {
  document.addEventListener('click', async (e) => {
    const button = (e.target as Element | null)?.closest<HTMLButtonElement>('button[data-copy]');
    if (!button) return;
    const code = button.parentElement?.querySelector('code');
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code.textContent ?? '');
      button.textContent = 'Copied';
    } catch {
      button.textContent = 'Select and copy';
    }
    setTimeout(() => (button.textContent = 'Copy'), 2000);
  });
}

export function boot(): void {
  const store = getStore();
  const statusEl = document.getElementById('sync-status');
  const render = (s: State) => {
    applyMotion(s);
    applyLabLinks(s);
    if (statusEl) statusEl.textContent = STATUS_TEXT[store.status];
  };
  store.subscribe(render);
  render(store.get());
  setInterval(() => statusEl && (statusEl.textContent = STATUS_TEXT[store.status]), 2000);
  wireCopyButtons();
  wireDialogs();
  wireReticle();
  wirePings();
  wireDecode();
  // The course outline lets a celebration see that a module or the course was finished.
  fetchBank().catch(() => undefined);
}
