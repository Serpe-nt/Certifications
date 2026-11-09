import { updateState, useHydrated, useStoreState } from '../../lib/use-store.ts';

interface Props {
  stepId: string;
  backHref: string;
  backLabel: string;
  nextHref: string;
  nextLabel: string;
  /** Lab and drill steps: Mark complete waits until the check has passed. */
  needsCheck: boolean;
}

/** Back, Mark complete and Next under the step card. */
export default function StepNav({ stepId, backHref, backLabel, nextHref, nextLabel, needsCheck }: Props) {
  const state = useStoreState();
  const ready = useHydrated();
  const done = stepId in state.done;
  const blocked = needsCheck && !(stepId in state.checks) && !done;

  const toggle = () =>
    updateState((s) => {
      if (stepId in s.done) delete s.done[stepId];
      else s.done[stepId] = Date.now();
    });

  return (
    <nav className="mt-6 flex flex-wrap items-center justify-between gap-3" aria-label="Step">
      <a className="btn" href={backHref} rel="prev">
        {backLabel}
      </a>
      <button type="button" className={`btn ${done ? '' : 'btn-primary'}`} onClick={toggle} disabled={blocked || !ready} aria-pressed={done} data-mark-complete>
        {done ? 'Completed' : 'Mark complete'}
      </button>
      <a className="btn" href={nextHref} rel="next">
        {nextLabel}
      </a>
      {blocked && <p className="m-0 w-full text-sm text-ink-3">Pass the lab check above to mark this step complete.</p>}
    </nav>
  );
}
