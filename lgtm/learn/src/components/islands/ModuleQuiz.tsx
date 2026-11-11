import { useBank } from '../../lib/bank.ts';
import { href } from '../../lib/links.ts';
import { QUIZ_PASS, QUIZ_SIZE, needed, pickModuleQuiz } from '../../lib/quiz.ts';
import { startRun } from '../../lib/runs.ts';
import { updateState, useHydrated, useStoreState } from '../../lib/use-store.ts';
import { Mark } from './QuestionView.tsx';
import QuizPlayer from './QuizPlayer.tsx';
import RunBusy from './RunBusy.tsx';

interface Props {
  moduleId: string;
  title: string;
}

/** The module quiz: 15 questions from the module's pool, pass at 80%. */
export default function ModuleQuiz({ moduleId, title }: Props) {
  const state = useStoreState();
  const ready = useHydrated();
  const { bank, failed } = useBank();

  if (failed) return <p data-bank-failed>The questions could not be loaded. Check the connection and reload the page.</p>;
  if (!bank) return <p className="qz-loading mono">Loading the questions.</p>;

  const run = state.run;
  const start = () => updateState((s) => startRun(s, 'module', moduleId, pickModuleQuiz(bank.questions, moduleId, s.qs), Date.now()));
  if (run && run.kind === 'module' && run.of === moduleId) return <QuizPlayer run={run} bank={bank} title={title} onRetake={start} />;

  const pool = bank.questions.filter((q) => q.pool === moduleId).length;
  const size = Math.min(pool, QUIZ_SIZE);
  const mod = bank.modules.find((m) => m.id === moduleId);
  const open = mod ? mod.steps.filter((s) => !Object.hasOwn(state.done, s.id)) : [];
  const rec = Object.hasOwn(state.quizzes, moduleId) ? state.quizzes[moduleId] : undefined;

  return (
    <section className="qz-intro" data-quiz-intro={moduleId}>
      {pool === 0 ? (
        <p className="qz-intro-text">This module has no quiz questions yet.</p>
      ) : (
        <>
          <dl className="qz-facts">
            <div>
              <dt className="mono">Questions</dt>
              <dd>{size}</dd>
            </div>
            <div>
              <dt className="mono">To pass</dt>
              <dd>
                {needed(size)}
                <span className="qz-facts-unit mono">{Math.round(QUIZ_PASS * 100)}%</span>
              </dd>
            </div>
            <div>
              <dt className="mono">Best so far</dt>
              <dd>
                {rec && rec.tries.length > 0 ? (
                  `${rec.best}%`
                ) : (
                  <>
                    <span aria-hidden="true">--</span>
                    <span className="sr-only">None yet</span>
                  </>
                )}
              </dd>
            </div>
          </dl>
          <p className="qz-intro-text">
            {size} questions from this module, drawn new each time. Pass with {needed(size)} right ({Math.round(QUIZ_PASS * 100)}%). Every option is explained after you
            answer; missed questions come back for review after 1, 2 and 4 days.
          </p>
          {rec && rec.tries.length > 0 && (
            <p className="qz-stamp mono" data-pass={String(rec.passed > 0)} data-quiz-record>
              <Mark right={rec.passed > 0} />
              Best so far: {rec.best}%. {rec.passed ? 'Passed.' : 'Not passed yet.'}
            </p>
          )}
          {open.length > 0 && (
            <p className="qz-intro-note" data-open-steps>
              {open.length} {open.length === 1 ? 'step is' : 'steps are'} still open. The module counts as done when every step is complete and the quiz is passed.
            </p>
          )}
          {run && !run.done && <RunBusy run={run} />}
          <p className="qz-intro-actions">
            <button type="button" className="btn btn-primary" onClick={start} disabled={!ready} data-start-quiz>
              {rec?.passed ? 'Take the quiz again' : 'Start the quiz'}
            </button>
            <a className="qz-link mono" href={href.end(moduleId)}>
              Back to the end of the module
            </a>
          </p>
        </>
      )}
      {pool === 0 && (
        <p className="qz-intro-actions">
          <a className="qz-link mono" href={href.end(moduleId)}>
            Back to the end of the module
          </a>
        </p>
      )}
    </section>
  );
}
