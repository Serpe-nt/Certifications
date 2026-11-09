import { useState } from 'react';
import { byId, stepsTeaching, type Bank } from '../../lib/bank.ts';
import { answerFx } from '../../lib/fx.ts';
import { href } from '../../lib/links.ts';
import { isRight, needed, passes, runResult } from '../../lib/quiz.ts';
import { answerRun, dropRun, finishRun, nextOpen } from '../../lib/runs.ts';
import type { QuizRun } from '../../lib/state.ts';
import { getStore } from '../../lib/store.ts';
import { updateState, useHydrated } from '../../lib/use-store.ts';
import QuestionView, { shownOrder, togglePick } from './QuestionView.tsx';

interface Props {
  run: QuizRun;
  bank: Bank;
  /** Shown above the question, e.g. "Sample module: quiz". */
  title: string;
  /** Called by "Retake" on a module quiz's results. */
  onRetake?: () => void;
}

const KIND_TEXT = { module: 'Module quiz', review: 'Review', step: 'Step practice', weak: 'Weak-spot practice' } as const;

/**
 * Plays a quiz or practice run kept in the state: one question at a time, Previous and Next,
 * a square per question, Check, then every option explained. Answers save at once, so a reload
 * or another device continues the same run.
 */
export default function QuizPlayer({ run, bank, title, onRetake }: Props) {
  const ready = useHydrated();
  const by = byId(bank);
  // Picks not yet checked, per question, in memory only.
  const [picks, setPicks] = useState<Map<string, number[]>>(new Map());
  const qs = run.ids.map((id) => by.get(id));
  const known = qs.filter((q) => !!q).length;

  if (!known) {
    return (
      <section className="box" data-run-gone>
        <p className="mt-0">The questions of this round are no longer in the course.</p>
        <button type="button" className="btn" onClick={() => updateState(dropRun)} disabled={!ready}>
          Close it
        </button>
      </section>
    );
  }

  if (run.done) return <Results run={run} bank={bank} title={title} onRetake={onRetake} />;

  const i = Math.min(run.i, run.ids.length - 1);
  const id = run.ids[i];
  const q = qs[i];
  const answer = Object.hasOwn(run.ans, id) ? run.ans[id] : undefined;
  const picked = answer ? answer.a : (picks.get(id) ?? []);
  const two = (q?.a.length ?? 1) > 1;
  const canCheck = !!q && !answer && picked.length === (q?.a.length ?? 1);
  const answered = Object.keys(run.ans).length;
  const next = nextOpen(run, i);
  const answerRight = !!answer && !!q && isRight(q, answer.a);

  const go = (to: number) => {
    updateState((s) => {
      if (s.run && s.run.t0 === run.t0) s.run.i = Math.max(0, Math.min(to, s.run.ids.length - 1));
    });
  };

  const check = () => {
    if (!q || !canCheck) return;
    let result: { right: boolean } | null = null;
    updateState((s) => {
      if (s.run && s.run.t0 === run.t0) result = answerRun(s, q, picked, Date.now());
    });
    const r = result as { right: boolean } | null;
    if (r) {
      const s = getStore().get();
      answerFx(r.right, s.run?.row ?? 0, s.settings);
    }
  };

  const finish = () => updateState((s) => s.run && s.run.t0 === run.t0 && finishRun(s, by, Date.now()));

  return (
    <section data-quiz-run={run.kind} data-run-t0={run.t0}>
      <p className="m-0 text-sm text-ink-3">
        {KIND_TEXT[run.kind]}: {title}. Question {i + 1} of {run.ids.length}, {answered} answered.
      </p>
      <div className="my-3 flex flex-wrap gap-1" role="group" aria-label="Questions">
        {run.ids.map((qid, k) => {
          const a = Object.hasOwn(run.ans, qid) ? run.ans[qid] : undefined;
          const qq = qs[k];
          const tone = !a || !qq ? 'open' : isRight(qq, a.a) ? 'right' : 'wrong';
          return (
            <button
              key={qid}
              type="button"
              className="q-square"
              data-tone={tone}
              aria-current={k === i ? 'true' : undefined}
              aria-label={`Question ${k + 1}: ${tone === 'open' ? 'not answered' : tone}`}
              onClick={() => go(k)}
              disabled={!ready}
            >
              {k + 1}
            </button>
          );
        })}
      </div>
      <article className="rounded-lg border border-line bg-surface p-6 shadow-card">
        {q ? (
          <QuestionView
            q={q}
            order={shownOrder(run.ord[i], q.n)}
            picked={picked}
            onPick={(k) => setPicks((m) => new Map(m).set(id, togglePick(picked, k, two)))}
            disabled={!ready || !!answer}
            feedback={!!answer}
            name={`${run.t0}-${id}`}
          />
        ) : (
          <p className="m-0">This question is no longer in the course. Skip it.</p>
        )}
        <p className="mb-0 text-sm" aria-live="polite" data-verdict={answer ? (answerRight ? 'right' : 'wrong') : ''}>
          {answer ? (answerRight ? 'Right.' : 'Not quite: every option is explained above.') : ''}
          {answer && run.row >= 3 ? ` ${run.row} right in a row.` : ''}
          {answer && run.row > run.best0 && run.row >= 3 && run.row === run.rowMax ? ' New record.' : ''}
        </p>
      </article>
      <nav className="mt-4 flex flex-wrap items-center justify-between gap-3" aria-label="Quiz">
        <button type="button" className="btn" onClick={() => go(i - 1)} disabled={!ready || i === 0}>
          Previous
        </button>
        {!answer ? (
          <button type="button" className="btn btn-primary" onClick={check} disabled={!ready || !canCheck} data-check-answer>
            Check
          </button>
        ) : next === -1 ? (
          <button type="button" className="btn btn-primary" onClick={finish} disabled={!ready} data-see-results>
            See results
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => go(next)} disabled={!ready} data-next-open>
            Next question
          </button>
        )}
        <button type="button" className="btn" onClick={() => go(i + 1)} disabled={!ready || i >= run.ids.length - 1}>
          Next
        </button>
      </nav>
    </section>
  );
}

function Results({ run, bank, title, onRetake }: Props) {
  const ready = useHydrated();
  const by = byId(bank);
  const qs = run.ids.map((id) => by.get(id)).filter((q) => !!q);
  const r = runResult(qs, (id) => (Object.hasOwn(run.ans, id) ? run.ans[id].a : undefined));
  const module = run.kind === 'module';
  const pass = passes(r.score, r.n);
  const moduleId = module ? run.of : '';
  return (
    <section className="rounded-lg border border-line bg-surface p-6 shadow-card" data-results={module ? (pass ? 'pass' : 'fail') : 'done'}>
      <h2 className="mt-0">
        {title}: {r.score} of {r.n} right ({r.pct}%)
      </h2>
      {module && (
        <p data-results-verdict>
          {pass ? 'Passed.' : `Not passed yet: ${needed(r.n)} of ${r.n} are needed. Missed questions come back for review tomorrow.`}
        </p>
      )}
      {run.rowMax >= 3 && <p className="text-sm text-ink-3">Longest run of right answers: {run.rowMax}.</p>}
      {r.missedTags.length > 0 && (
        <div data-missed>
          <h3 className="text-base">Go back to</h3>
          <ul>
            {r.missedTags.map((tag) => {
              const steps = stepsTeaching(bank, tag, moduleId).slice(0, 2);
              return (
                <li key={tag} data-missed-tag={tag}>
                  {steps.length ? (
                    steps.map((s, k) => (
                      <span key={s.id}>
                        {k > 0 && ', '}
                        <a href={href.step(s.id)}>{s.title}</a>
                      </span>
                    ))
                  ) : (
                    <span>{tag}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        {module && onRetake && (
          <button type="button" className="btn" onClick={onRetake} disabled={!ready} data-retake>
            Retake the quiz
          </button>
        )}
        <button type="button" className="btn btn-primary" onClick={() => updateState(dropRun)} disabled={!ready} data-close-run>
          Close
        </button>
      </div>
    </section>
  );
}
