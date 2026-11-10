import type { ModuleOutline } from '../../lib/course.ts';
import { moduleDone } from '../../lib/rewards.ts';
import { useStoreState } from '../../lib/use-store.ts';

interface Props {
  module: ModuleOutline;
  homeHref: string;
}

/** The end of a module: what was done, and where its quiz starts. */
export default function ModuleEnd({ module, homeHref }: Props) {
  const state = useStoreState();
  const done = module.steps.filter((s) => s.id in state.done);
  const minutes = done.reduce((n, s) => n + s.minutes, 0);
  const open = module.steps.find((s) => !(s.id in state.done));
  const rec = Object.hasOwn(state.quizzes, module.id) ? state.quizzes[module.id] : undefined;
  const running = state.run && state.run.kind === 'module' && state.run.of === module.id && !state.run.done;
  const complete = moduleDone(state, { id: module.id, quiz: module.quiz, steps: module.steps });

  return (
    <>
      <section className="box" data-module-summary>
        <h2>What you did</h2>
        <p className="m-0" data-done-count>
          {done.length} of {module.steps.length} steps complete, about {minutes} minutes of work.
        </p>
        {open && (
          <p className="mb-0">
            Still open: <a href={open.href}>{open.title}</a>
          </p>
        )}
        {complete && (
          <p className="mb-0" data-module-done>
            This module is done.
          </p>
        )}
      </section>
      {module.quiz && (
        <section className="box" data-quiz-entry>
          <h2>Module quiz</h2>
          <p className="mt-0">
            15 questions, pass at 80%. A module counts as done when all its steps are complete and its quiz is passed.
            {rec && rec.tries.length > 0 && ` Best so far: ${rec.best}%${rec.passed ? ', passed' : ''}.`}
          </p>
          <a className={`btn ${rec?.passed ? '' : 'btn-primary'}`} href={module.quizHref} data-quiz-link>
            {running ? 'Continue the quiz' : rec?.passed ? 'Take the quiz again' : 'Take the quiz'}
          </a>
        </section>
      )}
      <p>
        <a className="btn" href={homeHref}>
          Back to the overview
        </a>
      </p>
    </>
  );
}
