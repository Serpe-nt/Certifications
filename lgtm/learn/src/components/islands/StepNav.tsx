import { useEffect } from 'react';
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

/**
 * Back, Mark complete and Next at the end of the article. While a lab check is still open, the Learn tab
 * offers "Go to practice" in the middle instead (owner, 2026-11-11); the page's CSS shows one or the other.
 */
export default function StepNav({ stepId, backHref, backLabel, nextHref, nextLabel, needsCheck }: Props) {
  const state = useStoreState();
  const ready = useHydrated();
  const done = stepId in state.done;
  const blocked = needsCheck && !(stepId in state.checks) && !done;

  // A completed step lights its plate in signal yellow (head.css); marking it complete plays the change.
  useEffect(() => {
    document.querySelector('.pagehead .matrix')?.toggleAttribute('data-done', done);
  }, [done]);

  const toggle = () =>
    updateState((s) => {
      if (stepId in s.done) delete s.done[stepId];
      else s.done[stepId] = Date.now();
    });

  return (
    <nav className="stepnav" aria-label="Step" data-blocked={blocked ? '' : undefined}>
      <a className="btn stepnav-back" href={backHref} rel="prev">
        {backLabel}
      </a>
      <div className="stepnav-mid">
        {blocked && (
          <a className="btn btn-primary" href="?tab=practice" data-tab-link="practice" data-go-practice>
            Go to practice
          </a>
        )}
        <button type="button" className={`btn ${done ? '' : 'btn-primary'}`} onClick={toggle} disabled={blocked || !ready} aria-pressed={done} data-mark-complete>
          {done ? 'Completed' : 'Mark complete'}
        </button>
      </div>
      <a className="btn stepnav-next" href={nextHref} rel="next">
        {nextLabel}
      </a>
      {blocked && (
        <p className="stepnav-hint">
          <span data-go-practice>Do the lab on the Practice tab. Mark complete opens once its check passes.</span>
          <span data-practice>Pass the lab check above to mark this step complete.</span>
        </p>
      )}
    </nav>
  );
}
