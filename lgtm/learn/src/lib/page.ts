// Runs on every page: starts the sync, applies the theme, fills in lab links, wires copy buttons.
import { getStore, type SyncStatus } from './store.ts';
import type { State } from './state.ts';

const STATUS_TEXT: Record<SyncStatus, string> = {
  local: '',
  synced: '',
  pending: 'Saving',
  offline: 'Offline: saved on this device',
  error: 'Not synced',
};

function applyTheme(s: State): void {
  const t = s.settings.theme;
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  else document.documentElement.removeAttribute('data-theme');
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
    applyTheme(s);
    applyLabLinks(s);
    if (statusEl) statusEl.textContent = STATUS_TEXT[store.status];
  };
  store.subscribe(render);
  render(store.get());
  setInterval(() => statusEl && (statusEl.textContent = STATUS_TEXT[store.status]), 2000);
  wireCopyButtons();
}
