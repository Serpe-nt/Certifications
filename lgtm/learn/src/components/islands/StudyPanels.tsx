import { useEffect, useState } from 'react';
import { useBank } from '../../lib/bank.ts';
import { DOMAINS, EXAMS, type Cert } from '../../lib/exams.ts';
import { href } from '../../lib/links.ts';
import { READY_MIN, dueIds, localDay, readiness, readinessItems, type Band, type ExamReadiness, type ReadinessItem } from '../../lib/quiz.ts';
import { ROW_BADGES, badges, levelOf, xpTotal, type Badge, type Level, type Outline } from '../../lib/rewards.ts';
import type { State } from '../../lib/state.ts';
import { Blueprint, CellBar, Gauge, Radar, VerdictMark } from './ReadinessCharts.tsx';

const BAND_TEXT: Record<Band, string> = { ready: 'Ready', close: 'Close', 'not-yet': 'Not yet', unmeasured: `Needs ${READY_MIN} answers` };
const pct = (x: number) => `${Math.round(x * 100)}%`;
const CERTS: Cert[] = ['otca', 'pca'];

export interface Study {
  /** False until the question bank has loaded. */
  loaded: boolean;
  due: number;
  xp: number;
  lv: Level;
  all: Badge[];
  earned: Badge[];
  /** The first badge not earned yet, in the order badges are usually earned. */
  nextBadge: Badge | undefined;
  exams: ExamReadiness[];
}

/** Everything the overview's study panels show, derived from the state (never stored). */
export function useStudy(state: State, outline: Outline): Study {
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
  const all = badges(state, outline);
  const items: ReadinessItem[] = bank
    ? [
        ...readinessItems(bank.questions, state.qs, state.srs, today),
        ...bank.cards.map((c) => {
          const a = Object.hasOwn(state.answers, c.id) ? state.answers[c.id] : undefined;
          return { cert: c.cert, domain: c.domain, met: !!a, lastRight: !!a?.right, due: false };
        }),
      ]
    : [];
  return {
    loaded: !!bank,
    due,
    xp,
    lv: levelOf(xp),
    all,
    earned: all.filter((b) => b.earned),
    nextBadge: all.find((b) => !b.earned),
    exams: bank ? CERTS.map((cert) => readiness(cert, items)) : [],
  };
}

/** A bar from 0 to 1, drawn with SVG attributes (no inline styles: the CSP forbids them). */
export function Meter({ value, hot = false }: { value: number; hot?: boolean }) {
  const w = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)) * 100;
  return (
    <svg className={`meter${hot ? ' meter-hot' : ''}`} viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <rect className="meter-track" width="100" height="10" />
      <rect className="meter-fill" width={w.toFixed(2)} height="10" />
    </svg>
  );
}

/** System status: level, XP, course progress, readiness and the best run, then the review strip. */
export function StatusPanel({ study, stepsDone, stepsTotal, rowBest }: { study: Study; stepsDone: number; stepsTotal: number; rowBest: number }) {
  const { lv, xp, due, exams } = study;
  const span = Math.max(1, lv.to - lv.from);
  const rowGoal = ROW_BADGES.find((n) => n > rowBest) ?? ROW_BADGES[ROW_BADGES.length - 1];
  const rows: { key: string; label: string; value: string; note: string; meter: number; hot?: boolean }[] = [
    { key: 'level', label: `Level ${lv.level}`, value: `${xp} XP`, note: `${lv.to - xp} XP to level ${lv.level + 1}`, meter: (xp - lv.from) / span, hot: true },
    { key: 'course', label: 'Course', value: `${stepsDone}/${stepsTotal}`, note: 'steps complete', meter: stepsTotal ? stepsDone / stepsTotal : 0 },
    ...CERTS.map((cert) => {
      const r = exams.find((e) => e.cert === cert);
      const v = r?.overall ?? null;
      return {
        key: cert,
        label: `${cert.toUpperCase()} ready`,
        value: v === null ? '--' : pct(v),
        note: !r ? 'loading' : v === null ? 'not measured yet' : BAND_TEXT[r.band].toLowerCase(),
        meter: v ?? 0,
      };
    }),
    { key: 'row', label: 'Best streak', value: `${rowBest}`, note: `right in a row, next badge at ${rowGoal}`, meter: rowBest / rowGoal },
  ];
  return (
    <section className="ov-status" data-level={lv.level} aria-labelledby="ov-status-title">
      <h3 id="ov-status-title" className="ov-status-head mono">
        <span>System status</span>
        <span>Lv {String(lv.level).padStart(2, '0')}</span>
      </h3>
      <dl className="ov-stats">
        {rows.map((r) => (
          <div key={r.key} className="ov-stat" data-stat={r.key}>
            <dt className="mono">{r.label}</dt>
            <dd className="ov-stat-value">{r.value}</dd>
            <dd className="ov-stat-note">{r.note}</dd>
            <dd className="ov-stat-bar">
              <Meter value={r.meter} hot={r.hot} />
            </dd>
          </div>
        ))}
      </dl>
      <div className={`ov-strip${due ? ' ov-strip-due' : ''}`} data-practice-panel>
        <p className="m-0" data-due>
          {due ? `${due} ${due === 1 ? 'question is' : 'questions are'} due for review.` : 'Nothing is due for review today.'} <a href={href.practice}>Review and weak spots</a>
        </p>
      </div>
    </section>
  );
}

/** The badges already earned, and the one to earn next with what earns it. */
export function BadgesPanel({ study }: { study: Study }) {
  const { all, earned, nextBadge } = study;
  return (
    <section className="ov-badges" aria-labelledby="ov-badges-title">
      <h3 id="ov-badges-title" className="ov-status-head mono">
        <span>Badges</span>
        <span data-badge-count>
          {earned.length} of {all.length}
        </span>
      </h3>
      {earned.length > 0 ? (
        <ul className="ov-badge-list" data-badges>
          {earned.map((b) => (
            <li key={b.id} className="ov-badge" data-badge={b.id} data-earned="true">
              <span className="ov-badge-mark" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" />
                </svg>
              </span>
              <span>
                <strong className="ov-badge-title">{b.title}</strong>
                <span className="ov-badge-how">{b.how}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ov-badge-none">No badges yet.</p>
      )}
      {nextBadge ? (
        <div className="ov-badge-next" data-badge={nextBadge.id} data-earned="false" data-next-badge>
          <p className="mono ov-badge-next-label">Next badge</p>
          <p className="ov-badge-next-title">{nextBadge.title}</p>
          <p className="ov-badge-next-how">{nextBadge.how}</p>
        </div>
      ) : (
        <p className="ov-badge-none" data-next-badge>
          Every badge is earned.
        </p>
      )}
    </section>
  );
}

/** Readiness per exam and per domain, and the way into the mock exams. */
export function ReadinessPanel({ study }: { study: Study }) {
  return (
    <section className="ov-ready" data-readiness>
      <p className="ov-prose">
        Of the questions you have met in each domain, this is the share you got right the last time. A domain needs {READY_MIN} questions met before it gets a verdict: ready
        from 80%, close from 70%.
      </p>
      {!study.loaded ? (
        <p className="ov-prose">Loading.</p>
      ) : (
        <div className="ov-ready-grid">
          {study.exams.map((r) => (
            <div key={r.cert} data-readiness-exam={r.cert} className="ov-exam" data-band={r.band}>
              <div className="ov-scope">
                <h3 className="ov-exam-head">
                  <span className="ov-exam-code">{r.cert.toUpperCase()}</span>
                  <span className="ov-exam-name">{EXAMS[r.cert].name}</span>
                  <span className="ov-exam-value">{r.overall === null ? '--' : pct(r.overall)}</span>
                  <span className="ov-exam-band mono">{r.overall === null ? 'Not measured yet' : BAND_TEXT[r.band]}</span>
                </h3>
                <div className="ov-scope-charts">
                  <figure className="ov-chart">
                    <Gauge value={r.overall} />
                    <figcaption className="mono">Overall, weighted like the exam</figcaption>
                  </figure>
                  <figure className="ov-chart">
                    <Radar domains={r.domains} />
                    <figcaption className="mono">
                      <span className="ov-key ov-key-acc" aria-hidden="true"></span>Right <span className="ov-key ov-key-reach" aria-hidden="true"></span>Met, of {READY_MIN}
                    </figcaption>
                  </figure>
                </div>
                <div className="ov-blueprint">
                  <p className="mono">Exam weight per domain</p>
                  <Blueprint weights={EXAMS[r.cert].weights} />
                  <p className="sr-only">
                    {Object.entries(EXAMS[r.cert].weights)
                      .map(([d, w]) => `${d} ${w}%`)
                      .join(', ')}
                  </p>
                </div>
              </div>
              <table className="ov-table">
                <thead>
                  <tr>
                    <th scope="col">Domain</th>
                    <th scope="col">Seen</th>
                    <th scope="col">Correct</th>
                    <th scope="col">Due</th>
                    <th scope="col">Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {r.domains.map((d) => (
                    <tr key={d.domain} data-domain={d.domain} data-band={d.band}>
                      <th scope="row">
                        <span className="ov-dom-id">{d.domain}</span> {DOMAINS[d.domain]?.name}
                      </th>
                      <td data-label="Seen" data-seen>
                        {d.met} of {d.total}
                        <CellBar value={d.met / READY_MIN} />
                      </td>
                      <td data-label="Correct" data-correct>
                        {d.met ? pct(d.acc) : '-'}
                        <CellBar value={d.met ? d.acc : 0} marks />
                      </td>
                      <td data-label="Due" data-due>
                        {d.due}
                      </td>
                      <td data-label="Verdict" className="ov-verdict">
                        <VerdictMark band={d.band} />
                        {BAND_TEXT[d.band]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <a className="btn ov-exam-link" href={href.exam(r.cert)}>
                {r.cert.toUpperCase()} mock exam
              </a>
            </div>
          ))}
        </div>
      )}
      <p className="ov-mock-note" data-mock-links>
        Each mock exam has 60 questions and 90 minutes, split by the exam's domains. You pass at 75%.
      </p>
    </section>
  );
}
