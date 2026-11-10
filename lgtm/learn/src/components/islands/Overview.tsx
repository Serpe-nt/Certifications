import type { ModuleOutline } from '../../lib/course.ts';
import { moduleDone, quizPassed, type Outline } from '../../lib/rewards.ts';
import { useStoreState } from '../../lib/use-store.ts';
import StudyPanels from './StudyPanels.tsx';

interface Props {
  modules: ModuleOutline[];
}

/** The overview: the next step with one large Continue button, the study panels, then the modules as tiles. */
export default function Overview({ modules }: Props) {
  const state = useStoreState();
  const isDone = (id: string) => id in state.done;
  const all = modules.flatMap((m) => m.steps.map((s) => ({ ...s, module: m })));
  const next = all.find((s) => !isDone(s.id));
  const started = all.some((s) => isDone(s.id));
  const outline: Outline = { modules: modules.map((m) => ({ id: m.id, quiz: m.quiz, steps: m.steps })) };
  // Every step is complete but a module quiz is not passed yet: that quiz is next.
  const quizNext = !next ? modules.find((m) => m.quiz && m.steps.length > 0 && !quizPassed(state, m.id)) : undefined;

  if (!modules.length) {
    return <p data-empty>No modules yet. Lessons are added by the content cards.</p>;
  }

  return (
    <>
      <section className="mb-8 rounded-lg border border-line bg-surface p-6 shadow-card" data-next>
        {next ? (
          <>
            <p className="m-0 text-sm text-ink-3">
              {started ? 'Next step' : 'Start here'} in {next.module.title}
            </p>
            <h2 className="mb-4 mt-1 text-xl">{next.title}</h2>
            <a className="btn btn-primary w-full text-lg" href={next.href} data-continue>
              {started ? 'Continue' : 'Start'}
            </a>
          </>
        ) : quizNext ? (
          <>
            <p className="m-0 text-sm text-ink-3">Every step is complete. Next in {quizNext.title}</p>
            <h2 className="mb-4 mt-1 text-xl">The module quiz</h2>
            <a className="btn btn-primary w-full text-lg" href={quizNext.quizHref} data-continue>
              Take the quiz
            </a>
          </>
        ) : (
          <>
            <h2 className="mt-0 text-xl">Every step is complete</h2>
            <p className="mb-0">Well done. Keep the review queue empty and try the mock exams below.</p>
          </>
        )}
      </section>
      <StudyPanels state={state} outline={outline} />
      <h2 className="text-lg">Modules</h2>
      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
        {modules.map((m, k) => {
          const doneCount = m.steps.filter((s) => isDone(s.id)).length;
          const total = m.steps.length;
          const firstOpen = m.steps.find((s) => !isDone(s.id));
          return (
            <li key={m.id} className="rounded-md border border-line bg-surface p-4" data-module={m.id}>
              <a href={firstOpen ? firstOpen.href : m.endHref} className="font-semibold">
                {m.title}
              </a>
              <p className="my-1 text-sm text-ink-2">{m.goal}</p>
              <p className="m-0 text-sm text-ink-3" data-progress>
                {doneCount} of {total} steps done
              </p>
              {m.quiz && (
                <p className="m-0 text-sm text-ink-3" data-module-status>
                  {moduleDone(state, outline.modules[k]) ? 'Module done' : quizPassed(state, m.id) ? 'Quiz passed' : 'Quiz not passed yet'}
                </p>
              )}
              <progress className="mt-2 w-full" max={Math.max(total, 1)} value={doneCount} aria-label={`${m.title}: ${doneCount} of ${total} steps done`} />
            </li>
          );
        })}
      </ul>
    </>
  );
}
