import { useEffect, useState } from 'react';
import { findStep, stepsTeaching, useBank } from '../../lib/bank.ts';
import { href } from '../../lib/links.ts';
import { REVIEW_SIZE, STEP_PRACTICE, WEAK_SIZE, drawByTags, dueIds, localDay, pickReview, pickStep, pickWeak, weakTags } from '../../lib/quiz.ts';
import { startRun } from '../../lib/runs.ts';
import { validId } from '../../lib/state.ts';
import { practiceStepFromHash } from '../../lib/dialogs.ts';
import { updateState, useHydrated, useStoreState } from '../../lib/use-store.ts';
import QuizPlayer, { Count, ScoreBar } from './QuizPlayer.tsx';
import RunBusy, { runHref } from './RunBusy.tsx';

const TITLES = { review: 'Questions due for review', step: 'Three questions on a step', weak: 'Your weak spots' } as const;

/** Review queue, step practice (?step=<id>) and weak-spot practice. */
export default function Practice() {
  const state = useStoreState();
  const ready = useHydrated();
  const { bank, failed } = useBank();
  const [stepId, setStepId] = useState('');
  // Today follows the clock, so a review that comes due at midnight shows without a reload.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    // The step comes from ?step= on the practice page, or from #practice=<step> in the dialog.
    const fromUrl = () => {
      const p = new URLSearchParams(window.location.search).get('step') || practiceStepFromHash();
      setStepId(validId(p) ? p : '');
    };
    fromUrl();
    window.addEventListener('hashchange', fromUrl);
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      window.clearInterval(t);
      window.removeEventListener('hashchange', fromUrl);
    };
  }, []);

  if (failed) return <p data-bank-failed>The questions could not be loaded. Check the connection and reload the page.</p>;
  if (!bank) return <p className="qz-loading mono">Loading the questions.</p>;

  const run = state.run;
  if (run && run.kind !== 'module') {
    const step = run.kind === 'step' ? findStep(bank, run.of) : undefined;
    return <QuizPlayer run={run} bank={bank} title={step ? step.title : TITLES[run.kind]} />;
  }

  const today = localDay(now);
  const due = dueIds(state.srs, today);
  const known = new Set(bank.questions.map((q) => q.id));
  const dueKnown = due.filter((id) => known.has(id));
  const later = Object.entries(state.srs)
    .filter(([id, e]) => e.due > today && known.has(id))
    .map(([, e]) => e.due)
    .sort()[0];
  const step = stepId ? findStep(bank, stepId) : undefined;
  const stepQs = step ? pickStep(step.tags, bank.questions, state.qs) : [];
  const weak = weakTags(bank.questions.filter((q) => !q.pool.startsWith('mock-')), state.qs).filter((t) => t.acc < 1).slice(0, 5);

  const begin = (kind: 'review' | 'step' | 'weak', of: string, pick: (s: typeof state) => ReturnType<typeof pickReview>) =>
    updateState((s) => startRun(s, kind, of, pick(s), Date.now()));

  return (
    <div className="pr" data-practice>
      {run && !run.done && run.kind === 'module' && <RunBusy run={run} />}
      {step && (
        <section className="pr-bay pr-bay-step" data-step-practice={step.id}>
          <p className="pr-kicker mono">Step practice</p>
          <h2 className="pr-title">Practice: {step.title}</h2>
          {stepQs.length ? (
            <>
              <p className="pr-text">
                {Math.min(stepQs.length, STEP_PRACTICE)} questions on what this step teaches. They count like any other answer: history, review and weak spots.
              </p>
              <p className="pr-actions">
                <button type="button" className="btn btn-primary" disabled={!ready} onClick={() => begin('step', step.id, (s) => pickStep(step.tags, bank.questions, s.qs))} data-start-step>
                  Start
                </button>
                <a className="qz-link mono" href={href.step(step.id)}>
                  Back to the step
                </a>
              </p>
            </>
          ) : (
            <p className="pr-text">No questions on this step's topics yet.</p>
          )}
        </section>
      )}
      <div className="pr-grid">
        <section className="pr-bay" data-review>
          <p className="pr-kicker mono">Spaced review</p>
          <h2 className="pr-title">Review</h2>
          <p className="pr-count" aria-hidden="true">
            <span className="pr-count-n">
              <Count to={dueKnown.length} pad={2} ms={600} />
            </span>
            <span className="mono">due today</span>
          </p>
          {dueKnown.length ? (
            <>
              <p className="pr-text" data-due-count>
                {dueKnown.length} {dueKnown.length === 1 ? 'question is' : 'questions are'} due. A round takes up to {REVIEW_SIZE}.
              </p>
              <p className="pr-actions">
                <button type="button" className="btn btn-primary" disabled={!ready} onClick={() => begin('review', '', (s) => pickReview(bank.questions, s.srs, localDay(Date.now())))} data-start-review>
                  Start the review
                </button>
              </p>
            </>
          ) : (
            <p className="pr-text" data-due-count="0">
              Nothing is due today.{later ? ` The next question comes due on ${later}.` : ''} Missed questions come back after 1, 2 and 4 days.
            </p>
          )}
        </section>
        <section className="pr-bay" data-weak>
          <p className="pr-kicker mono">By topic</p>
          <h2 className="pr-title">Weak spots</h2>
          {weak.length ? (
            <>
              <ul className="pr-weak">
                {weak.map((t) => {
                  const s = stepsTeaching(bank, t.tag)[0];
                  const pct = t.seen ? Math.round((t.right / t.seen) * 100) : 0;
                  return (
                    <li key={t.tag} className="pr-weak-row" data-weak-tag={t.tag}>
                      <span className="pr-weak-name">
                        {s ? <a href={href.step(s.id)}>{s.title}</a> : t.tag}: {t.right} of {t.seen} right.
                      </span>
                      <ScoreBar pct={pct} />
                      <button
                        type="button"
                        className="qz-stepbtn mono"
                        disabled={!ready}
                        onClick={() => begin('weak', '', (st) => drawByTags(bank.questions.filter((q) => !q.pool.startsWith('mock-')), [t.tag], STEP_PRACTICE, st.qs))}
                      >
                        Practice this
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="pr-actions">
                <button type="button" className="btn btn-primary" disabled={!ready} onClick={() => begin('weak', '', (s) => pickWeak(bank.questions, s.qs))} data-start-weak>
                  Practice {WEAK_SIZE} from your weak spots
                </button>
              </p>
            </>
          ) : (
            <p className="pr-text">No weak spots yet: a topic needs a few answers first.</p>
          )}
        </section>
      </div>
      {run && run.kind === 'module' && run.done > 0 && (
        <p className="qz-notice">
          <span className="qz-notice-label mono">Results</span>
          <a href={runHref(run)}>Your module quiz results are waiting.</a>
        </p>
      )}
    </div>
  );
}
