import { useEffect, useId, useState, type ChangeEvent } from 'react';
import { parseSettings, parseState, type Settings as SettingsShape } from '../../lib/state.ts';
import { getStore } from '../../lib/store.ts';
import { toast } from '../../lib/toast.ts';
import { updateState, useHydrated, useStoreState } from '../../lib/use-store.ts';

const MAX_IMPORT = 1024 * 1024;

/** Lab domain, lab seed, effects and sound; export and import of progress. */
export default function Settings() {
  const state = useStoreState();
  // Controls stay disabled until hydrated, so a click or keystroke before then is not lost.
  const ready = useHydrated();
  const ids = { domain: useId(), seed: useId(), file: useId() };
  const [domain, setDomain] = useState(state.settings.labDomain);
  const [seed, setSeed] = useState(state.settings.labSeed);
  const [message, setMessageText] = useState('');
  // Each message shows as a notification at the right-hand side (owner, 2026-11-11: the line at the
  // bottom was "almost not noticeable"); the line itself stays, hidden, for the browser tests.
  const setMessage = (text: string, kind: 'ok' | 'error' = 'ok') => {
    setMessageText(text);
    toast({ kind, title: text });
  };

  // Follow changes that arrive from another tab or device.
  useEffect(() => setDomain(state.settings.labDomain), [state.settings.labDomain]);
  useEffect(() => setSeed(state.settings.labSeed), [state.settings.labSeed]);

  const set = (patch: Partial<SettingsShape>) => updateState((s) => void (s.settings = parseSettings({ ...s.settings, ...patch })));
  const toggle = (patch: Partial<SettingsShape>, text: string) => {
    set(patch);
    setMessage(text);
  };

  const saveDomain = () => {
    const next = parseSettings({ ...state.settings, labDomain: domain });
    if (next.labDomain !== domain.trim().toLowerCase().replace(/\.$/, '')) {
      setMessage('That is not a valid domain name. The old one is kept.', 'error');
      setDomain(state.settings.labDomain);
      return;
    }
    set({ labDomain: next.labDomain });
    setMessage('Lab domain saved.');
  };

  const saveSeed = () => {
    const v = seed.trim().toLowerCase();
    if (v && !/^[0-9a-f]{16}$/.test(v)) {
      setMessage('The lab seed is 16 characters, 0 to 9 and a to f. The lab prints it at the end of its install.', 'error');
      return;
    }
    set({ labSeed: v });
    setMessage(v ? 'Lab seed saved.' : 'Lab seed removed.');
  };

  const exportProgress = () => {
    const blob = new Blob([JSON.stringify(getStore().get(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lgtm-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importProgress = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_IMPORT) {
      setMessage('That file is too large to be a progress file.', 'error');
      return;
    }
    let raw: unknown;
    try {
      raw = JSON.parse(await file.text());
    } catch {
      setMessage('That file is not a progress file (it is not JSON).', 'error');
      return;
    }
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      setMessage('That file is not a progress file.', 'error');
      return;
    }
    const parsed = parseState(raw);
    getStore().replace(parsed);
    setMessage(`Progress imported: ${Object.keys(parsed.done).length} completed steps.`);
  };

  return (
    <div data-settings>
      <section className="box">
        <h2>Lab</h2>
        <label htmlFor={ids.domain} className="block">
          Lab domain
        </label>
        <p className="mt-0 text-sm text-ink-3">The lab's addresses live under this name, for example grafana.lab.k8s.local.</p>
        <div className="flex gap-2">
          <input id={ids.domain} disabled={!ready} className="field" value={domain} onChange={(e) => setDomain(e.target.value)} autoComplete="off" spellCheck={false} />
          <button type="button" className="btn" onClick={saveDomain} disabled={!ready} data-save-domain>
            Save
          </button>
        </div>
        <label htmlFor={ids.seed} className="mt-4 block">
          Lab seed
        </label>
        <p className="mt-0 text-sm text-ink-3">16 characters, printed at the end of the lab install. Token checks need it.</p>
        <div className="flex gap-2">
          <input id={ids.seed} disabled={!ready} className="field font-mono" value={seed} onChange={(e) => setSeed(e.target.value)} autoComplete="off" spellCheck={false} maxLength={64} />
          <button type="button" className="btn" onClick={saveSeed} disabled={!ready} data-save-seed>
            Save
          </button>
        </div>
      </section>

      <section className="box">
        <h2>Look and feel</h2>
        {/* The site has one theme since the design card (DZ); the theme field stays in the state, unused. */}
        <label className="toggle-row">
          <input type="checkbox" className="toggle" checked={state.settings.effects} disabled={!ready} onChange={(e) => toggle({ effects: e.target.checked }, e.target.checked ? 'Effects and motion on.' : 'Effects and motion off.')} />
          Effects and motion
        </label>
        <p className="mt-0 text-sm text-ink-3">Celebrations when you finish something, and the moving parts of the page. Reduced motion on the device always calms them.</p>
        <label className="toggle-row mt-1">
          <input type="checkbox" className="toggle" checked={state.settings.sound} disabled={!ready} onChange={(e) => toggle({ sound: e.target.checked }, e.target.checked ? 'Sound on.' : 'Sound off.')} />
          Sound
        </label>
      </section>

      <section className="box">
        <h2>Your progress</h2>
        <p className="mt-0 text-sm text-ink-3">Progress is saved on this device and on the server, so other devices see it too. A file is a copy you keep yourself.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn" onClick={exportProgress} disabled={!ready} data-export>
            Export to a file
          </button>
          <label htmlFor={ids.file} className="btn">
            Import from a file
          </label>
          <input id={ids.file} type="file" disabled={!ready} accept="application/json,.json" className="sr-only" onChange={importProgress} data-import />
        </div>
        <p className="mb-0 text-sm text-ink-3">Importing replaces the progress on every device with the file's copy.</p>
      </section>
      <p className="sr-only" data-settings-message>
        {message}
      </p>
    </div>
  );
}
