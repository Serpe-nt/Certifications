import { useEffect, useState } from 'react';
import { useBank } from '../../lib/bank.ts';
import { DOMAINS, EXAMS, type Cert } from '../../lib/exams.ts';
import { href } from '../../lib/links.ts';
import { READY_MIN, dueIds, localDay, readiness, readinessItems, type Band, type ReadinessItem } from '../../lib/quiz.ts';
import { badges, levelOf, xpTotal, type Outline } from '../../lib/rewards.ts';
import type { State } from '../../lib/state.ts';

const BAND_TEXT: Record<Band, string> = { ready: 'Ready', close: 'Close', 'not-yet': 'Not yet', unmeasured: `Needs ${READY_MIN} answers` };
const pct = (x: number) => `${Math.round(x * 100)}%`;

/** The overview's study panels: review, level and badges, readiness per exam, mock exams. */
export default function StudyPanels({ state, outline }: { state: State; outline: Outline }) {
  const { bank } = useBank();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  const today = localDay(now);
  const known = bank ? new Set(bank.questions.map((q) => q.id)) : null;
  const due = dueIds(state.srs, today).filter((id) => !known || known.has(id)).length;
  const xp = xpTotal(state, outline);
  const lv = levelOf(xp);
  const all = badges(state, outline);
  const earned = all.filter((b) => b.earned);

  const items: ReadinessItem[] = bank
    ? [
        ...readinessItems(bank.questions, state.qs, state.srs, today),
        ...bank.cards.map((c) => {
          const a = Object.hasOwn(state.answers, c.id) ? state.answers[c.id] : undefined;
          return { cert: c.cert, domain: c.domain, met: !!a, lastRight: !!a?.right, due: false };
        }),
      ]
    : [];

  return (
    <>
      <section className="box" data-practice-panel>
        <h2>Practice</h2>
        <p className="m-0" data-due>
          {due ? `${due} ${due === 1 ? 'question is' : 'questions are'} due for review.` : 'Nothing is due for review today.'} <a href={href.practice}>Review and weak spots</a>
        </p>
      </section>
      <section className="box" data-level={lv.level}>
        <h2>
          Level {lv.level}, {xp} XP
        </h2>
        <progress className="w-full" max={lv.to - lv.from} value={xp - lv.from} aria-label={`${xp - lv.from} of ${lv.to - lv.from} XP to level ${lv.level + 1}`} />
        <p className="mt-1 text-sm text-ink-3">{lv.to - xp} XP to the next level.</p>
        <h3 className="mb-1 text-base">
          Badges: {earned.length} of {all.length}
        </h3>
        <ul className="m-0 grid list-none gap-1 p-0 text-sm sm:grid-cols-2" data-badges>
          {all.map((b) => (
            <li key={b.id} data-badge={b.id} data-earned={String(b.earned)} className={b.earned ? '' : 'text-ink-3'}>
              {b.earned ? 'Earned: ' : 'Not yet: '}
              <strong>{b.title}</strong>. {b.how}
            </li>
          ))}
        </ul>
      </section>
      <section className="box" data-readiness>
        <h2>Exam readiness</h2>
        <p className="mt-0 text-sm text-ink-3">
          Of the questions you have met in each domain, the share you got right the last time. A domain needs {READY_MIN} questions met before it gets a verdict: ready from
          80%, close from 70%.
        </p>
        {!bank ? (
          <p className="m-0 text-ink-3">Loading.</p>
        ) : (
          (['otca', 'pca'] as Cert[]).map((cert) => {
            const r = readiness(cert, items);
            return (
              <div key={cert} data-readiness-exam={cert} className="mb-4">
                <h3 className="mb-1 text-base">
                  {EXAMS[cert].name}: {r.overall === null ? 'not measured yet' : `${pct(r.overall)}, ${BAND_TEXT[r.band].toLowerCase()}`}
                </h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left">Domain</th>
                      <th className="text-right">Seen</th>
                      <th className="text-right">Correct</th>
                      <th className="text-right">Due</th>
                      <th className="text-right">Verdict</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.domains.map((d) => (
                      <tr key={d.domain} data-domain={d.domain} data-band={d.band}>
                        <td>
                          {d.domain} {DOMAINS[d.domain]?.name}
                        </td>
                        <td className="text-right" data-seen>
                          {d.met} of {d.total}
                        </td>
                        <td className="text-right" data-correct>
                          {d.met ? pct(d.acc) : '-'}
                        </td>
                        <td className="text-right" data-due>
                          {d.due}
                        </td>
                        <td className="text-right">{BAND_TEXT[d.band]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })
        )}
        <p className="mb-0" data-mock-links>
          Mock exams: <a href={href.exam('otca')}>OTCA</a>, <a href={href.exam('pca')}>PCA</a>
        </p>
      </section>
    </>
  );
}
