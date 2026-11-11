import type { ReactNode } from "react";
import type { ModuleOutline } from "../../lib/course.ts";
import { QUIZ_SIZE, needed } from "../../lib/quiz.ts";
import { moduleDone, quizPassed, type Outline } from "../../lib/rewards.ts";
import { useStoreState } from "../../lib/use-store.ts";
import {
  BadgesPanel,
  ReadinessPanel,
  StatusPanel,
  useStudy,
} from "./StudyPanels.tsx";

interface Props {
  modules: ModuleOutline[];
  /** The hero drawing, rendered at build time by the page (slot "art"). */
  art?: ReactNode;
  /** Each module's icon, rendered at build time by the page: slot "i<module id>", for example "im02". */
  [slot: `i${string}`]: ReactNode;
}

const two = (n: number) => String(n).padStart(2, "0");
/** "m02" -> "02": the number a module goes by on the plates and rails. */
export const moduleNo = (id: string) =>
  id.replace(/\D/g, "").padStart(2, "0") || "00";

/** A numbered section heading, "/02 Modules", with a rule and a count. */
function SectionHead({
  n,
  title,
  count,
  id,
}: {
  n: number;
  title: string;
  count?: string;
  id: string;
}) {
  return (
    <div className="ov-sh">
      <span className="ov-sh-n mono" aria-hidden="true">
        /{two(n)}
      </span>
      <h2 className="ov-sh-t" id={id}>
        {title}
      </h2>
      {count && <span className="ov-sh-c mono">{count}</span>}
    </div>
  );
}

/** One cell per step: done in ink, the next one lit. */
export function StepCells({ done, next }: { done: boolean[]; next: number }) {
  const n = Math.max(done.length, 1);
  const gap = n > 1 ? Math.min(2, 30 / (n - 1)) : 0;
  const w = (100 - gap * (n - 1)) / n;
  return (
    <svg
      className="cells"
      viewBox="0 0 100 10"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {done.map((d, i) => (
        <rect
          key={i}
          className={d ? "cell-done" : i === next ? "cell-next" : "cell"}
          x={(i * (w + gap)).toFixed(2)}
          width={w.toFixed(2)}
          height="10"
        />
      ))}
    </svg>
  );
}

/** The overview: the next step as the hero, the modules, the study status, readiness. */
export default function Overview({ modules, art, ...slots }: Props) {
  const state = useStoreState();
  const isDone = (id: string) => id in state.done;
  const all = modules.flatMap((m) =>
    m.steps.map((s, i) => ({ ...s, module: m, position: i + 1 })),
  );
  const next = all.find((s) => !isDone(s.id));
  const started = all.some((s) => isDone(s.id));
  const stepsDone = all.filter((s) => isDone(s.id)).length;
  const outline: Outline = {
    modules: modules.map((m) => ({ id: m.id, quiz: m.quiz, steps: m.steps })),
  };
  const study = useStudy(state, outline);
  // Every step is complete but a module quiz is not passed yet: that quiz is next.
  const quizNext = !next
    ? modules.find(
        (m) => m.quiz && m.steps.length > 0 && !quizPassed(state, m.id),
      )
    : undefined;
  const coursePct = all.length ? Math.round((stepsDone / all.length) * 100) : 0;
  const icon = (id: string) => slots[`i${id}`];

  if (!modules.length) {
    return (
      <p data-empty>No modules yet. Lessons are added by the content cards.</p>
    );
  }

  return (
    <div className="ov">
      <section className="ov-hero" aria-labelledby="ov-next-title">
        <div className="ov-hero-text" data-next>
          <p className="ov-index mono" aria-hidden="true">
            /01
          </p>
          {next ? (
            <>
              <p className="ov-kicker mono">
                {started ? "Next step" : "Start here"} in {next.module.title}
              </p>
              <h2 className="ov-hero-title" id="ov-next-title">
                {next.title}
              </h2>
              <p className="ov-hero-lead">
                Step {next.position} of {next.module.steps.length} in this
                module, about {next.minutes} minutes. You have finished{" "}
                {stepsDone} of {all.length} steps in the course.
              </p>
              <p className="ov-actions">
                <a
                  className="btn btn-primary ov-go"
                  href={next.href}
                  data-continue
                >
                  {started ? "Continue" : "Start"}
                </a>
                <a className="btn" href={next.module.href}>
                  See the module
                </a>
              </p>
            </>
          ) : quizNext ? (
            <>
              <p className="ov-kicker mono">
                Every step is complete. Next in {quizNext.title}
              </p>
              <h2 className="ov-hero-title" id="ov-next-title">
                The module quiz
              </h2>
              <p className="ov-hero-lead">
                {QUIZ_SIZE} questions on the module. You pass with{" "}
                {needed(QUIZ_SIZE)} right, and then the module counts as done.
              </p>
              <p className="ov-actions">
                <a
                  className="btn btn-primary ov-go"
                  href={quizNext.quizHref}
                  data-continue
                >
                  Take the quiz
                </a>
                <a className="btn" href={quizNext.endHref}>
                  See the module end
                </a>
              </p>
            </>
          ) : (
            <>
              <p className="ov-kicker mono">Course complete</p>
              <h2 className="ov-hero-title" id="ov-next-title">
                Every step is complete
              </h2>
              <p className="ov-hero-lead">
                Well done. Keep the review queue empty and try the mock exams
                below.
              </p>
            </>
          )}
        </div>
        <div className="ov-hero-art">
          {art}
          <p className="ov-readout mono" aria-hidden="true">
            <span>
              {next
                ? `Mod_${moduleNo(next.module.id)} // step ${two(next.position)}`
                : `Mods ${two(modules.length)} // all steps`}
            </span>
            <span>
              Steps {stepsDone} / {all.length}
            </span>
          </p>
          <p className="ov-caption mono" aria-hidden="true">
            <span>//Scn_01</span>
            <span>&gt; Course {coursePct}%</span>
          </p>
        </div>
      </section>

      <section className="ov-sec" aria-labelledby="ov-mods">
        <SectionHead
          n={2}
          title="Modules"
          count={`${two(modules.length)} ${modules.length === 1 ? "module" : "modules"}`}
          id="ov-mods"
        />
        <ul className="ov-mods">
          {modules.map((m, k) => {
            const doneSteps = m.steps.map((s) => isDone(s.id));
            const doneCount = doneSteps.filter(Boolean).length;
            const total = m.steps.length;
            const firstOpen = m.steps.find((s) => !isDone(s.id));
            const complete = moduleDone(state, outline.modules[k]);
            const current = !!next && next.module.id === m.id;
            const status = complete
              ? "Done"
              : current
                ? "Up next"
                : doneCount
                  ? "In progress"
                  : "Not started";
            const minutes = m.steps.reduce((n, s) => n + s.minutes, 0);
            return (
              <li
                key={m.id}
                className="ov-mod"
                data-module={m.id}
                data-state={
                  complete
                    ? "done"
                    : current
                      ? "current"
                      : doneCount
                        ? "started"
                        : "new"
                }
              >
                <div className="ov-mod-card">
                  <div className="ov-mod-art">
                    <span className="ov-mod-no mono" aria-hidden="true">
                      Mod_{moduleNo(m.id)}
                    </span>
                    <span className="ov-mod-state mono">{status}</span>
                    {icon(m.id)}
                  </div>
                  <div className="ov-mod-body">
                    <h3 className="ov-mod-title">
                      <a
                        href={firstOpen ? firstOpen.href : m.endHref}
                        className="ov-mod-link"
                      >
                        {m.title}
                        <svg
                          className="ov-arrow"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                          focusable="false"
                        >
                          <path
                            d="M4 12h15M13 6l6 6-6 6"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          />
                        </svg>
                      </a>
                    </h3>
                    <p className="ov-mod-goal">{m.goal}</p>
                    <StepCells
                      done={doneSteps}
                      next={
                        current
                          ? m.steps.findIndex((s) => s.id === next?.id)
                          : -1
                      }
                    />
                    <p className="ov-mod-meta">
                      <span data-progress>
                        {doneCount} of {total} steps done
                      </span>
                      <span>about {minutes} min</span>
                    </p>
                    {m.quiz && (
                      <p className="ov-mod-quiz mono" data-module-status>
                        {complete
                          ? "Module done"
                          : quizPassed(state, m.id)
                            ? "Quiz passed"
                            : "Quiz not passed yet"}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="ov-sec" aria-labelledby="ov-status">
        <SectionHead n={3} title="Your progress" id="ov-status" />
        <div className="ov-status-grid">
          <StatusPanel
            study={study}
            stepsDone={stepsDone}
            stepsTotal={all.length}
            rowBest={state.rowBest}
          />
          <BadgesPanel study={study} />
        </div>
      </section>

      <section className="ov-sec" aria-labelledby="ov-ready">
        <SectionHead
          n={4}
          title="Exam readiness"
          id="ov-ready"
          count="OTCA, PCA"
        />
        <ReadinessPanel study={study} />
      </section>
    </div>
  );
}
