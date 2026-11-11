import { href } from '../../lib/links.ts';
import type { QuizRun } from '../../lib/state.ts';

/** Where an unfinished run continues: the module quiz page or the practice page. */
export function runHref(run: QuizRun): string {
  return run.kind === 'module' ? href.quiz(run.of) : href.practice;
}

const NAME = { module: 'module quiz', review: 'review round', step: 'step practice', weak: 'weak-spot practice' } as const;

/** Says that another round is unfinished: starting a new one here drops it. */
export default function RunBusy({ run }: { run: QuizRun }) {
  const answered = Object.keys(run.ans).length;
  return (
    <p className="qz-notice" data-run-busy={run.kind}>
      <span className="qz-notice-label mono">Unfinished</span>
      <span>
        You have an unfinished {NAME[run.kind]} ({answered} of {run.ids.length} answered). <a href={runHref(run)}>Continue it</a>, or start here: that drops it.
      </span>
    </p>
  );
}
