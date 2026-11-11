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
  'not-a-number': 'This check wants a number, for example 42 or 0.25.',
  'no-seed': 'This check needs your lab seed. Enter it once in the settings.',
};

/** A wrong answer, said as precisely as the check allows without giving the answer away. */
function wrongMessage(check: CheckData, input: string): string {
  const got = input.trim();
  switch (check.kind) {
    case 'exact':
      return 'That does not match. Copy the value exactly as the lab shows it; case and spaces around it do not matter.';
    case 'regex':
      return 'That does not have the expected form. Paste the whole value and nothing around it.';
    case 'range':
      return 'That number is outside the range this check accepts. Read the value again in the lab.';
    case 'choice':
      return 'Not that one. Look at the lab again and pick another.';
    case 'token':
      if (check.slot.startsWith('metric-')) return 'That is not the number your lab reports. Read it again from the panel.';
      return got.length === 8
        ? 'That is not your token. Check that the lab seed in the settings is the one your lab uses.'
        : `A token is 8 characters long; you pasted ${got.length}.`;
  }
}

/** The lab check on a lab or drill step: exact, regex, range, choice or token. */
export default function CheckWidget({ stepId, check, settingsHref }: Props) {
  const state = useStoreState();
  const ready = useHydrated();
  const inputId = useId();
  const [value, setValue] = useState('');
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(''); // the answer the verdict is about
  const passed = stepId in state.checks;
  const failed = !!verdict && !verdict.ok;
  const resultId = `${inputId}-result`;

  const onSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    try {
      const v = await grade(check, value, { seed: state.settings.labSeed });
      setVerdict(v);
      setChecked(value);
      if (v.ok) updateState((s) => void (s.checks[stepId] ??= Date.now()));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="labcheck" data-block="check" data-check-kind={check.kind} data-state={passed || verdict?.ok ? 'pass' : failed ? 'fail' : ''}>
      <h2 className="part-label mono">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M4 12l5 5L20 6" />
        </svg>
        Lab check
      </h2>
      <form onSubmit={onSubmit} noValidate>
        {check.kind === 'choice' ? (
          <fieldset className="labcheck-options" aria-invalid={failed || undefined} aria-describedby={resultId}>
            <legend className="labcheck-prompt">{check.prompt}</legend>
            {check.options.map((o) => (
              <label key={o} className="labcheck-option">
                <input type="radio" name={inputId} value={o} checked={value === o} disabled={!ready} onChange={() => setValue(o)} />
                {o}
              </label>
            ))}
          </fieldset>
        ) : (
          <>
            <label htmlFor={inputId} className="labcheck-prompt">
              {check.prompt}
            </label>
            <input
              id={inputId}
              className="field"
              aria-invalid={failed || undefined}
              aria-describedby={resultId}
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
        <div className="labcheck-row">
          <button type="submit" className="btn btn-primary" disabled={busy || !ready}>
            Check
          </button>
          <span id={resultId} className="labcheck-result" aria-live="polite" data-check-result={verdict ? (verdict.ok ? 'pass' : verdict.reason) : passed ? 'pass' : ''}>
            {verdict?.ok || (!verdict && passed) ? (
              <span className="text-good">Passed. Mark complete is open below.</span>
            ) : verdict ? (
              <span className="text-bad">
                {verdict.reason === 'wrong' ? wrongMessage(check, checked) : MESSAGES[verdict.reason]}
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
