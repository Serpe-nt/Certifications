import { useEffect, useRef, useState } from 'react';
import { byId, stepsTeaching, type Bank } from '../../lib/bank.ts';
import { answerFx } from '../../lib/fx.ts';
import { href } from '../../lib/links.ts';
import { QUIZ_PASS, isRight, needed, passes, runResult } from '../../lib/quiz.ts';
import { answerRun, dropRun, finishRun, nextOpen } from '../../lib/runs.ts';
import type { QuizRun } from '../../lib/state.ts';
import { getStore } from '../../lib/store.ts';
import { updateState, useHydrated } from '../../lib/use-store.ts';
import QuestionView, { Mark, shownOrder, togglePick } from './QuestionView.tsx';

interface Props {
  run: QuizRun;
  bank: Bank;
  /** Shown above the question, e.g. "Sample module: quiz". */
  title: string;
  /** Called by "Retake" on a module quiz's results. */
  onRetake?: () => void;
}

const KIND_TEXT = { module: 'Module quiz', review: 'Review', step: 'Step practice', weak: 'Weak-spot practice' } as const;

const two = (n: number) => String(n).padStart(2, '0');

/** A bar from 0 to 100%, drawn in SVG so no inline style is needed; `mark` draws the pass mark. */
export function ScoreBar({ pct, mark, label }: { pct: number; mark?: number; label?: string }) {
  const w = Math.max(0, Math.min(100, pct));
  return (
    <svg className="qz-bar" viewBox="0 0 100 12" preserveAspectRatio="none" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <rect className="qz-bar-track" x="0" y="0" width="100" height="12" />
      <rect className="qz-bar-fill" x="0" y="0" width={w} height="12" />
      {mark !== undefined && <rect className="qz-bar-mark" x={Math.min(99, mark * 100)} y="-2" width="1" height="16" />}
    </svg>
  );
}

/** True when motion is off: the device asks for less, or Effects is off in Settings. */
const calm = () =>
  typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'off';

/** A figure that ticks up from zero to `to` once, like a counter on a readout; shown at once when motion is off. */
export function Count({ to, pad = 0, ms = 900 }: { to: number; pad?: number; ms?: number }) {
  const [n, setN] = useState(() => (calm() ? to : 0));
  useEffect(() => {
    if (calm()) {
      setN(to);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      setN(Math.round(to * (1 - (1 - k) ** 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return <>{String(n).padStart(pad, '0')}</>;
}

/** Five chevrons pointing forward, at the end of a question box's rail (sticker.css). */
export function Chevrons() {
  return (
    <svg className="sticker-chevrons" viewBox="0 0 100 18" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((k) => (
        <polygon key={k} points={`${k * 20},0 ${k * 20 + 8},0 ${k * 20 + 17},9 ${k * 20 + 8},18 ${k * 20},18 ${k * 20 + 9},9`} />
      ))}
    </svg>
  );
}

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
      <section className="qz-notice" data-run-gone>
        <p>The questions of this round are no longer in the course.</p>
        <button type="button" className="btn" onClick={() => updateState(dropRun)} disabled={!ready}>
          Close it
        </button>
      </section>
    );
  }

  // Moving to another question puts the keyboard on its card, not back at the top of the page.
  // (Hooks sit above the early return for the results.)
  const firstCard = useRef(true);
  useEffect(() => {
    if (firstCard.current) {
      firstCard.current = false;
      return;
    }
    document.querySelector<HTMLElement>('.qz-card')?.focus({ preventScroll: true });
  }, [run.i]);

  if (run.done) return <Results run={run} bank={bank} title={title} onRetake={onRetake} />;

  const i = Math.min(run.i, run.ids.length - 1);
  const id = run.ids[i];
  const q = qs[i];
  const answer = Object.hasOwn(run.ans, id) ? run.ans[id] : undefined;
  const picked = answer ? answer.a : (picks.get(id) ?? []);
  const twoPicks = (q?.a.length ?? 1) > 1;
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
      // The explanations make the card taller: keep the row with Next in view, and put the keyboard on
      // Next (or See results), since Submit has turned into the stamp.
      requestAnimationFrame(() => {
        document.querySelector('.qz-foot3')?.scrollIntoView({ block: 'nearest' });
        document.querySelector<HTMLButtonElement>('[data-next-open], [data-see-results]')?.focus({ preventScroll: true });
      });
    }
  };

  const finish = () => updateState((s) => s.run && s.run.t0 === run.t0 && finishRun(s, by, Date.now()));

  return (
    <section className="qz" data-quiz-run={run.kind} data-run-t0={run.t0}>
      <div className="qz-strip">
        <p className="qz-status mono" key={i}>
          <span className="qz-strip-kind">{KIND_TEXT[run.kind]}:</span> {title}. Question {i + 1} of {run.ids.length}, {answered} answered.
        </p>
      </div>
      <article className="qz-card" key={id} tabIndex={-1} aria-label={`Question ${i + 1} of ${run.ids.length}`}>
        <header className="qz-qhead sticker-head">
          <p className="qz-qnum" aria-hidden="true">
            <span className="qz-qnum-n">{two(i + 1)}</span>
            <span className="qz-qnum-of mono">of {two(run.ids.length)}</span>
          </p>
          <span className="sticker-rail" aria-hidden="true">
            <Chevrons />
          </span>
        </header>
        <div className="qz-cardbody">
        {q ? (
          <QuestionView
            q={q}
            order={shownOrder(run.ord[i], q.n)}
            picked={picked}
            onPick={(k) => setPicks((m) => new Map(m).set(id, togglePick(picked, k, twoPicks)))}
            disabled={!ready || !!answer}
            feedback={!!answer}
            name={`${run.t0}-${id}`}
          />
        ) : (
          <p className="qz-missing">This question is no longer in the course. Skip it.</p>
        )}
        <div className="qz-foot qz-foot3">
          <button type="button" className="qz-stepbtn mono" onClick={() => go(i - 1)} disabled={!ready || i === 0}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M10 3 5 8l5 5" />
            </svg>
            Previous
          </button>
          <div className="qz-mid">
            <p className="qz-verdict mono" aria-live="polite" data-verdict={answer ? (answerRight ? 'right' : 'wrong') : ''}>
              {answer && (
                <>
                  <Mark right={answerRight} />
                  {answerRight ? 'Correct' : 'Wrong'}
                  {run.row >= 3 && <span className="qz-verdict-row">{run.row} in a row{run.row > run.best0 && run.row === run.rowMax ? ', a new record' : ''}</span>}
                </>
              )}
            </p>
            {!answer && (
              <button type="button" className="btn btn-primary" onClick={check} disabled={!ready || !canCheck} data-check-answer>
                Submit
                <span className="qz-charge" aria-hidden="true" />
              </button>
            )}
          </div>
          {/* One Next: before Submit it steps to the next question; after, it goes to the next open
              question, and once every question is answered it becomes See results. */}
          {answer && next === -1 ? (
            <button type="button" className="btn btn-primary qz-next" onClick={finish} disabled={!ready} data-see-results>
              See results
            </button>
          ) : answer ? (
            <button type="button" className="qz-stepbtn qz-stepbtn-go mono" onClick={() => go(next)} disabled={!ready} data-next-open>
              Next
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="m6 3 5 5-5 5" />
              </svg>
            </button>
          ) : (
            <button type="button" className="qz-stepbtn mono" onClick={() => go(i + 1)} disabled={!ready || i >= run.ids.length - 1}>
              Next
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="m6 3 5 5-5 5" />
              </svg>
            </button>
          )}
        </div>
        </div>
      </article>
      <div className="qz-map" role="group" aria-label="Questions" data-n={run.ids.length}>
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
  const retake = module && onRetake;
  return (
    <section className="qz-results" data-results={module ? (pass ? 'pass' : 'fail') : 'done'}>
      <div className="qz-board" data-pass={module ? String(pass) : undefined}>
        <div className="qz-board-score" aria-hidden="true">
          <span className="qz-board-label mono">Score</span>
          <span className="qz-board-big">
            <Count to={r.pct} />%
          </span>
          <span className="qz-board-label mono">
            <Count to={r.score} /> / {r.n} right
          </span>
        </div>
        <div className="qz-board-main">
          <h2 className="qz-board-title">
            {title}: {r.score} of {r.n} right ({r.pct}%)
          </h2>
          {module && (
            <p className="qz-stamp mono" data-pass={String(pass)} aria-hidden="true">
              <Mark right={pass} />
              {pass ? 'Passed' : 'Not passed yet'}
            </p>
          )}
          <ScoreBar pct={r.pct} mark={module ? QUIZ_PASS : undefined} />
          {module && <p className="qz-board-scale mono" aria-hidden="true">Pass mark {Math.round(QUIZ_PASS * 100)}%</p>}
          {module && (
            <p className="qz-board-text" data-results-verdict>
              {pass ? 'Passed.' : `Not passed yet: ${needed(r.n)} of ${r.n} are needed. Missed questions come back for review tomorrow.`}
            </p>
          )}
          {run.rowMax >= 3 && <p className="qz-board-note">Longest run of right answers: {run.rowMax}.</p>}
          <div className="qz-board-actions">
            {retake && (
              <button type="button" className={pass ? 'btn' : 'btn btn-primary'} onClick={onRetake} disabled={!ready} data-retake>
                Retake the quiz
              </button>
            )}
            <button type="button" className={retake && !pass ? 'btn' : 'btn btn-primary'} onClick={() => updateState(dropRun)} disabled={!ready} data-close-run>
              Close
            </button>
          </div>
        </div>
      </div>
      {r.missedTags.length > 0 && (
        <div className="qz-missed" data-missed>
          <h3 className="qz-label mono">Go back to</h3>
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
    </section>
  );
}
