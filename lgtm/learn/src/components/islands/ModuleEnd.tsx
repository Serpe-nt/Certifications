import type { ReactNode } from 'react';
import type { ModuleOutline } from '../../lib/course.ts';
import { QUIZ_PASS, QUIZ_SIZE } from '../../lib/quiz.ts';
import { moduleDone } from '../../lib/rewards.ts';
import { useStoreState } from '../../lib/use-store.ts';
import { StepCells, moduleNo } from './Overview.tsx';

interface Props {
  module: ModuleOutline;
  homeHref: string;
  /** The module after this one, or null for the last module. */
  next: { id: string; title: string; goal: string; href: string } | null;
  /** This module's icon and the next module's, rendered at build time by the page. */
  icon?: ReactNode;
  nextIcon?: ReactNode;
}

/** The end of a module: what was done, where its quiz starts, and the next module. */
export default function ModuleEnd({ module, homeHref, next, icon, nextIcon }: Props) {
  const state = useStoreState();
  const doneSteps = module.steps.map((s) => s.id in state.done);
  const done = module.steps.filter((s) => s.id in state.done);
  const minutes = done.reduce((n, s) => n + s.minutes, 0);
  const open = module.steps.find((s) => !(s.id in state.done));
  const rec = Object.hasOwn(state.quizzes, module.id) ? state.quizzes[module.id] : undefined;
  const running = state.run && state.run.kind === 'module' && state.run.of === module.id && !state.run.done;
  const complete = moduleDone(state, { id: module.id, quiz: module.quiz, steps: module.steps });
  const total = module.steps.length;

  return (
    <div className="me">
      <div className="me-grid">
        <section className="me-result" data-module-summary aria-labelledby="me-result-title">
          <div className="me-result-head">
            {icon}
            <div>
              <h2 className="me-label mono" id="me-result-title">
                What you did
              </h2>
              <p className="me-big" aria-hidden="true">
                {done.length}
                <span>/{total}</span>
              </p>
            </div>
          </div>
          <StepCells done={doneSteps} next={open ? module.steps.indexOf(open) : -1} />
          <p className="me-text" data-done-count>
            {done.length} of {total} steps complete, about {minutes} minutes of work.
          </p>
          {open && (
            <p className="me-text">
              Still open: <a href={open.href}>{open.title}</a>
            </p>
          )}
          {complete && (
            <p className="me-done mono" data-module-done>
              This module is done.
            </p>
          )}
        </section>

        {module.quiz && (
          <section className="me-quiz" data-quiz-entry aria-labelledby="me-quiz-title">
            <h2 className="me-label mono" id="me-quiz-title">
              Module quiz
            </h2>
            <p className="me-big" aria-hidden="true">
              {rec && rec.tries.length > 0 ? `${rec.best}%` : '--'}
            </p>
            <p className="me-text">
              {QUIZ_SIZE} questions, pass at {Math.round(QUIZ_PASS * 100)}%. A module counts as done when all its steps are complete and its quiz is passed.
              {rec && rec.tries.length > 0 && ` Best so far: ${rec.best}%${rec.passed ? ', passed' : ''}.`}
            </p>
            <a className={`btn ${rec?.passed ? '' : 'btn-primary'} me-go`} href={module.quizHref} data-quiz-link>
              {running ? 'Continue the quiz' : rec?.passed ? 'Take the quiz again' : 'Take the quiz'}
            </a>
          </section>
        )}
      </div>

      {next ? (
        <section className="me-next" aria-labelledby="me-next-title">
          <div className="me-next-art">{nextIcon}</div>
          <div className="me-next-body">
            <h2 className="me-label mono" id="me-next-title">
              Next module: Mod_{moduleNo(next.id)}
            </h2>
            <p className="me-next-title">
              <a href={next.href}>{next.title}</a>
            </p>
            <p className="me-text">{next.goal}</p>
          </div>
          <span className="me-next-go" aria-hidden="true">
            <svg viewBox="0 0 54 24" focusable="false">
              <g fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M2 4l8 8-8 8" />
                <path d="M20 4l8 8-8 8" />
                <path d="M38 4l8 8-8 8" />
              </g>
            </svg>
          </span>
        </section>
      ) : (
        <p className="me-text me-last">This is the last module. The mock exams are on the overview.</p>
      )}

      <p className="me-actions">
        <a className="btn" href={homeHref}>
          Back to the overview
        </a>
      </p>
    </div>
  );
}
