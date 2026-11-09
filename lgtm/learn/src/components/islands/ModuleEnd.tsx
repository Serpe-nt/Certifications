import type { ModuleOutline } from '../../lib/course.ts';
import { useStoreState } from '../../lib/use-store.ts';

interface Props {
  module: ModuleOutline;
  homeHref: string;
}

/** The end of a module: what was done, and where the quiz will start (card S2). */
export default function ModuleEnd({ module, homeHref }: Props) {
  const state = useStoreState();
  const done = module.steps.filter((s) => s.id in state.done);
  const minutes = done.reduce((n, s) => n + s.minutes, 0);
  const open = module.steps.find((s) => !(s.id in state.done));

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
      </section>
      {module.quiz && (
        <section className="box" data-quiz-entry>
          <h2>Module quiz</h2>
          <p className="m-0">The quiz for this module arrives with a later update. A module counts as done when all its steps are complete and its quiz is passed.</p>
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
