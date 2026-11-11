import { useId, useState, type SubmitEvent } from 'react';
import { grade, MAX_INPUT, type Verdict } from '../../lib/checks.ts';
import type { CheckData } from '../../lib/schema.ts';
import { updateState, useHydrated, useStoreState } from '../../lib/use-store.ts';

interface Props {
  stepId: string;
  check: CheckData;
  settingsHref: string;
}

const MESSAGES: Record<Exclude<Verdict, { ok: true }>['reason'], string> = {
  wrong: 'Not yet. Look again and paste exactly what you found.',
  empty: 'Paste or type your answer first.',
  'not-a-number': 'This check wants a number.',
  'no-seed': 'This check needs your lab seed. Enter it once in the settings.',
};

/** The lab check on a lab or drill step: exact, regex, range, choice or token. */
export default function CheckWidget({ stepId, check, settingsHref }: Props) {
  const state = useStoreState();
  const ready = useHydrated();
  const inputId = useId();
  const [value, setValue] = useState('');
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [busy, setBusy] = useState(false);
  const passed = stepId in state.checks;

  const onSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    try {
      const v = await grade(check, value, { seed: state.settings.labSeed });
      setVerdict(v);
      if (v.ok) updateState((s) => void (s.checks[stepId] ??= Date.now()));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="box box-check" data-block="check" data-check-kind={check.kind}>
      <h2>Lab check</h2>
      <form onSubmit={onSubmit} noValidate>
        {check.kind === 'choice' ? (
          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-2">{check.prompt}</legend>
            {check.options.map((o) => (
              <label key={o} className="mb-1 flex items-center gap-2">
                <input type="radio" name={inputId} value={o} checked={value === o} disabled={!ready} onChange={() => setValue(o)} />
                {o}
              </label>
            ))}
          </fieldset>
        ) : (
          <>
            <label htmlFor={inputId} className="mb-2 block">
              {check.prompt}
            </label>
            <input
              id={inputId}
              className="field"
              value={value}
              maxLength={MAX_INPUT}
              disabled={!ready}
              autoComplete="off"
              spellCheck={false}
              inputMode={check.kind === 'range' || (check.kind === 'token' && check.slot.startsWith('metric-')) ? 'decimal' : 'text'}
              onChange={(e) => setValue(e.target.value)}
            />
          </>
        )}
        <div className="mt-3 flex items-center gap-3">
          <button type="submit" className="btn" disabled={busy || !ready}>
            Check
          </button>
          <span aria-live="polite" data-check-result={verdict ? (verdict.ok ? 'pass' : verdict.reason) : passed ? 'pass' : ''}>
            {verdict?.ok || (!verdict && passed) ? (
              <span className="text-good">Passed.</span>
            ) : verdict ? (
              <span className="text-bad">
                {MESSAGES[verdict.reason]}
                {verdict.reason === 'no-seed' && (
                  <>
                    {' '}
                    <a href={settingsHref} data-dialog="settings">Open the settings</a>
                  </>
                )}
              </span>
            ) : null}
          </span>
        </div>
      </form>
    </section>
  );
}
