import type { ModuleOutline } from '../../lib/course.ts';
import { useStoreState } from '../../lib/use-store.ts';

interface Props {
  modules: ModuleOutline[];
}

/** The overview: the next step with one large Continue button, then the modules as tiles. */
export default function Overview({ modules }: Props) {
  const state = useStoreState();
  const isDone = (id: string) => id in state.done;
  const all = modules.flatMap((m) => m.steps.map((s) => ({ ...s, module: m })));
  const next = all.find((s) => !isDone(s.id));
  const started = all.some((s) => isDone(s.id));

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
        ) : (
          <>
            <h2 className="mt-0 text-xl">Every step is complete</h2>
            <p className="mb-0">Well done. The review and the mock exams arrive with a later update.</p>
          </>
        )}
      </section>
      <h2 className="text-lg">Modules</h2>
      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
        {modules.map((m) => {
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
              <progress className="mt-2 w-full" max={Math.max(total, 1)} value={doneCount} aria-label={`${m.title}: ${doneCount} of ${total} steps done`} />
            </li>
          );
        })}
      </ul>
    </>
  );
}
