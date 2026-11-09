import { useEffect, useState } from 'react';
import { findStep, stepsTeaching, useBank } from '../../lib/bank.ts';
import { href } from '../../lib/links.ts';
import { REVIEW_SIZE, STEP_PRACTICE, WEAK_SIZE, drawByTags, dueIds, localDay, pickReview, pickStep, pickWeak, weakTags } from '../../lib/quiz.ts';
import { startRun } from '../../lib/runs.ts';
import { validId } from '../../lib/state.ts';
import { updateState, useHydrated, useStoreState } from '../../lib/use-store.ts';
import QuizPlayer from './QuizPlayer.tsx';
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
    const p = new URLSearchParams(window.location.search).get('step') ?? '';
    if (validId(p)) setStepId(p);
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  if (failed) return <p data-bank-failed>The questions could not be loaded. Check the connection and reload the page.</p>;
  if (!bank) return <p className="text-ink-3">Loading the questions.</p>;

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
    <div data-practice>
      {run && !run.done && run.kind === 'module' && <RunBusy run={run} />}
      {step && (
        <section className="box" data-step-practice={step.id}>
          <h2>Practice: {step.title}</h2>
          {stepQs.length ? (
            <>
              <p>
                {Math.min(stepQs.length, STEP_PRACTICE)} questions on what this step teaches. They count like any other answer: history, review and weak spots.
              </p>
              <button type="button" className="btn btn-primary" disabled={!ready} onClick={() => begin('step', step.id, (s) => pickStep(step.tags, bank.questions, s.qs))} data-start-step>
                Start
              </button>{' '}
              <a href={href.step(step.id)}>Back to the step</a>
            </>
          ) : (
            <p className="mb-0">No questions on this step's topics yet.</p>
          )}
        </section>
      )}
      <section className="box" data-review>
        <h2>Review</h2>
        {dueKnown.length ? (
          <>
            <p data-due-count>
              {dueKnown.length} {dueKnown.length === 1 ? 'question is' : 'questions are'} due. A round takes up to {REVIEW_SIZE}.
            </p>
            <button type="button" className="btn btn-primary" disabled={!ready} onClick={() => begin('review', '', (s) => pickReview(bank.questions, s.srs, localDay(Date.now())))} data-start-review>
              Start the review
            </button>
          </>
        ) : (
          <p className="mb-0" data-due-count="0">
            Nothing is due today.{later ? ` The next question comes due on ${later}.` : ''} Missed questions come back after 1, 2 and 4 days.
          </p>
        )}
      </section>
      <section className="box" data-weak>
        <h2>Weak spots</h2>
        {weak.length ? (
          <>
            <ul>
              {weak.map((t) => {
                const s = stepsTeaching(bank, t.tag)[0];
                return (
                  <li key={t.tag} data-weak-tag={t.tag}>
                    {s ? <a href={href.step(s.id)}>{s.title}</a> : t.tag}: {t.right} of {t.seen} right.{' '}
                    <button
                      type="button"
                      className="btn"
                      disabled={!ready}
                      onClick={() => begin('weak', '', (st) => drawByTags(bank.questions.filter((q) => !q.pool.startsWith('mock-')), [t.tag], STEP_PRACTICE, st.qs))}
                    >
                      Practice this
                    </button>
                  </li>
                );
              })}
            </ul>
            <button type="button" className="btn btn-primary" disabled={!ready} onClick={() => begin('weak', '', (s) => pickWeak(bank.questions, s.qs))} data-start-weak>
              Practice {WEAK_SIZE} from your weak spots
            </button>
          </>
        ) : (
          <p className="mb-0">No weak spots yet: a topic needs a few answers first.</p>
        )}
      </section>
      {run && run.kind === 'module' && run.done > 0 && (
        <p>
          <a href={runHref(run)}>Your module quiz results are waiting.</a>
        </p>
      )}
    </div>
  );
}
