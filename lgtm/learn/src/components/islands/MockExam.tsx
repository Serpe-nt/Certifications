import { useEffect, useRef, useState } from 'react';
import { bankNow, byId, useBank, type Bank } from '../../lib/bank.ts';
import { DOMAINS, EXAMS, type Cert } from '../../lib/exams.ts';
import { href } from '../../lib/links.ts';
import { mockSplit, needed, passes, pickMock } from '../../lib/quiz.ts';
import { dropExam, markExam, startExam, submitExam } from '../../lib/runs.ts';
import type { ExamRun, MockRecord } from '../../lib/state.ts';
import { getStore } from '../../lib/store.ts';
import { updateState, useHydrated, useStoreState } from '../../lib/use-store.ts';
import QuestionView, { Mark, shownOrder, togglePick } from './QuestionView.tsx';
import { Count, ScoreBar } from './QuizPlayer.tsx';

/** After a gap longer than this the page was frozen or asleep: ask for news before the clock acts. */
const GAP_MS = 15_000;

const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
};

/**
 * A mock exam: 60 questions drawn by the official domain counts, 90 minutes, pass at 75%.
 * While it runs the screen stays quiet: no effects, no sounds, no explanations. Every pick and
 * flag saves at once, so a reload or another device continues the same exam.
 *
 * The clock never acts on a copy that may be behind: it waits for the first sync, skips while a
 * pull is on its way, asks for news after the page was frozen, and pulls once more before it
 * submits a run whose time is up, so a run submitted on another device is not submitted twice.
 */
export default function MockExam({ cert }: { cert: Cert }) {
  const state = useStoreState();
  const ready = useHydrated();
  const { bank, failed } = useBank();
  const [now, setNow] = useState(() => Date.now());
  const finishing = useRef(false);
  const lastTick = useRef(Date.now());

  useEffect(() => {
    const store = getStore();
    const tick = async () => {
      const n = Date.now();
      const gap = n - lastTick.current > GAP_MS;
      lastTick.current = n;
      setNow(n);
      const e = store.get().exam;
      if (gap) {
        void store.pull();
        return;
      }
      if (!e || e.done || n < e.end || finishing.current) return;
      if (!store.firstSyncDone || store.isPulling()) return;
      const b = bankNow();
      if (!b) return;
      finishing.current = true;
      try {
        await store.pull();
        const cur = store.get().exam;
        if (cur && cur.t0 === e.t0 && !cur.done && Date.now() >= cur.end) updateState((s) => submitExam(s, byId(b), Date.now(), true));
      } finally {
        finishing.current = false;
      }
    };
    const t = window.setInterval(() => void tick(), 1000);
    return () => window.clearInterval(t);
  }, []);

  if (failed) return <p data-bank-failed>The questions could not be loaded. Check the connection and reload the page.</p>;
  if (!bank) return <p className="qz-loading mono">Loading the questions.</p>;

  const exam = state.exam;
  if (exam && exam.cert === cert && exam.done) return <ExamResults exam={exam} bank={bank} record={state.mocks.find((m) => m.cert === cert && m.t0 === exam.t0)} />;
  if (exam && exam.cert === cert) return <ExamScreen exam={exam} bank={bank} now={now} ready={ready} />;
  return <ExamIntro cert={cert} bank={bank} other={exam} mocks={state.mocks.filter((m) => m.cert === cert)} ready={ready} />;
}

function ExamIntro({ cert, bank, other, mocks, ready }: { cert: Cert; bank: Bank; other: ExamRun | null; mocks: MockRecord[]; ready: boolean }) {
  const exam = EXAMS[cert];
  const split = mockSplit(cert);
  const pool = bank.questions.filter((q) => q.cert === cert && (q.pool === `mock-${cert}` || !q.pool.startsWith('mock-')));
  const total = Object.entries(split).reduce((n, [d, c]) => n + Math.min(c, pool.filter((q) => q.domain === d).length), 0);
  const busy = other && !other.done && other.cert !== cert;
  const start = () => updateState((s) => startExam(s, cert, pickMock(cert, bank.questions, s.qs), Date.now()));
  return (
    <section className="qz-intro" data-exam-intro={cert}>
      <dl className="qz-facts">
        <div>
          <dt className="mono">Questions</dt>
          <dd>{exam.questions}</dd>
        </div>
        <div>
          <dt className="mono">Minutes</dt>
          <dd>{exam.minutes}</dd>
        </div>
        <div>
          <dt className="mono">To pass</dt>
          <dd>
            {needed(exam.questions, exam.pass)}
            <span className="qz-facts-unit mono">{Math.round(exam.pass * 100)}%</span>
          </dd>
        </div>
      </dl>
      <p className="qz-intro-text">
        Like the real exam: {exam.questions} questions, {exam.minutes} minutes, pass with {Math.round(exam.pass * 100)}% ({needed(exam.questions, exam.pass)} of {exam.questions}).
        No explanations and no effects until you submit; then a result per domain and every question explained.
      </p>
      <h2 className="qz-label mono">Questions per domain</h2>
      <ul className="qz-domains" data-exam-split>
        {Object.entries(split).map(([d, n]) => (
          <li key={d} className="qz-domain" data-domain={d}>
            <span className="qz-domain-name">
              <span className="qz-domain-id mono">{d}</span> {DOMAINS[d]?.name}
            </span>
            <ScoreBar pct={exam.weights[d] ?? 0} />
            <span className="qz-domain-figs">
              <span className="qz-domain-big" data-count>
                {n}
              </span>
              <span className="mono">{exam.weights[d]}% weight</span>
            </span>
          </li>
        ))}
      </ul>
      {total < exam.questions && (
        <p className="qz-intro-note" data-exam-short>
          The course has questions for {total} of the {exam.questions} so far; the exam uses what there is.
        </p>
      )}
      {mocks.length > 0 && (
        <p className="qz-intro-note" data-exam-history>
          Earlier tries:{' '}
          {mocks
            .slice(-5)
            .map((m) => `${m.pct}%${passes(m.score, m.n, exam.pass) ? ' (passed)' : ''}`)
            .join(', ')}
          .
        </p>
      )}
      {busy ? (
        <p className="qz-notice" data-exam-busy>
          <span className="qz-notice-label mono">Running</span>
          <span>
            Your {other.cert.toUpperCase()} mock exam is still running. <a href={href.exam(other.cert)}>Continue it</a>, or drop it to start this one.
          </span>
          <button type="button" className="btn" disabled={!ready} onClick={() => updateState(dropExam)}>
            Drop it
          </button>
        </p>
      ) : total === 0 ? (
        <p className="qz-intro-text">There are no questions for this exam yet.</p>
      ) : (
        <p className="qz-intro-actions">
          <button type="button" className="btn btn-primary" disabled={!ready} onClick={start} data-start-exam>
            Start the mock exam
          </button>
          <span className="qz-intro-hint mono">The clock starts when you press Start</span>
        </p>
      )}
    </section>
  );
}

function ExamScreen({ exam, bank, now, ready }: { exam: ExamRun; bank: Bank; now: number; ready: boolean }) {
  const [confirm, setConfirm] = useState(false);
  const by = byId(bank);
  const i = Math.min(exam.i, exam.ids.length - 1);
  const id = exam.ids[i];
  const q = by.get(id);
  const mark = Object.hasOwn(exam.marks, id) ? exam.marks[id] : undefined;
  const left = exam.end - now;
  const over = left <= 0;
  const low = left < 10 * 60_000;
  const last = i >= exam.ids.length - 1;
  const answered = exam.ids.filter((x) => Object.hasOwn(exam.marks, x) && exam.marks[x].a.length > 0).length;
  const flagged = exam.ids.filter((x) => Object.hasOwn(exam.marks, x) && exam.marks[x].f).length;
  // Quiet: answering and moving save without any celebration or sound.
  const quiet = (fn: Parameters<typeof updateState>[0]) => updateState(fn, { quiet: true });
  const go = (to: number) =>
    quiet((s) => {
      if (s.exam && s.exam.t0 === exam.t0) s.exam.i = Math.max(0, Math.min(to, s.exam.ids.length - 1));
    });
  const pick = (k: number) => q && quiet((s) => markExam(s, id, { a: togglePick(mark?.a ?? [], k, q.a.length > 1) }, Date.now()));
  const flag = () => quiet((s) => markExam(s, id, { f: !mark?.f }, Date.now()));
  const submit = () => updateState((s) => s.exam && s.exam.t0 === exam.t0 && submitExam(s, by, Date.now(), false));

  return (
    <section className="qz qz-exam" data-exam-running={exam.cert} data-exam-t0={exam.t0}>
      <div className="qz-strip">
        <p className="qz-status mono">
          <span className="qz-strip-kind">{exam.cert.toUpperCase()} mock exam:</span> Question {i + 1} of {exam.ids.length}. {answered} answered, {flagged} flagged.
        </p>
        <div className="qz-clock" data-low={low ? 'true' : undefined}>
          <span className="qz-clock-label mono" aria-hidden="true">
            {over ? 'Time is up' : low ? 'Under 10 minutes' : 'Time left'}
          </span>
          <span className="qz-clock-time" role="timer" aria-label="Time left" data-clock>
            {over ? 'Time is up: submitting' : clock(left)}
          </span>
        </div>
      </div>
      <article className="qz-card">
        <header className="qz-qhead sticker-head">
          <p className="qz-qnum" aria-hidden="true">
            <span className="qz-qnum-n">{String(i + 1).padStart(2, '0')}</span>
            <span className="qz-qnum-of mono">of {exam.ids.length}</span>
          </p>
          <span className="sticker-rail" aria-hidden="true"></span>
          <button type="button" className="qz-flag mono" aria-pressed={!!mark?.f} onClick={flag} disabled={!ready || over || !q} data-flag>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3.5 15V1.5M3.5 2.5h9l-2.5 3.5 2.5 3.5h-9" />
            </svg>
            {mark?.f ? 'Flagged for review' : 'Flag for review'}
          </button>
        </header>
        <div className="qz-cardbody">
        {q ? (
          <QuestionView q={q} order={shownOrder(exam.ord[i], q.n)} picked={mark?.a ?? []} onPick={pick} disabled={!ready || over} feedback={false} name={`${exam.t0}-${id}`} />
        ) : (
          <p className="qz-missing">This question is no longer in the course. Skip it.</p>
        )}
        <nav className="qz-foot qz-examnav" aria-label="Exam">
          <button type="button" className="btn" onClick={() => go(i - 1)} disabled={!ready || i === 0}>
            Previous
          </button>
          <button type="button" className={last ? 'btn' : 'btn btn-primary'} onClick={() => go(i + 1)} disabled={!ready || last}>
            Next
          </button>
        </nav>
        </div>
      </article>
      <div className="qz-map" role="group" aria-label="Questions">
        {exam.ids.map((qid, k) => {
          const m = Object.hasOwn(exam.marks, qid) ? exam.marks[qid] : undefined;
          const done = !!m && m.a.length > 0;
          return (
            <button
              key={qid}
              type="button"
              className="q-square"
              data-tone={done ? 'answered' : 'open'}
              data-flagged={m?.f ? 'true' : undefined}
              aria-current={k === i ? 'true' : undefined}
              aria-label={`Question ${k + 1}: ${done ? 'answered' : 'not answered'}${m?.f ? ', flagged' : ''}`}
              onClick={() => go(k)}
              disabled={!ready}
            >
              {k + 1}
            </button>
          );
        })}
      </div>
      <div className="qz-legend">
        <span className="qz-keys" aria-hidden="true">
          <span className="qz-key mono" data-key="answered">
            Answered
          </span>
          <span className="qz-key mono" data-key="open">
            Open
          </span>
          <span className="qz-key mono" data-key="flagged">
            Flagged
          </span>
        </span>
        <button type="button" className={last ? 'btn btn-primary' : 'btn'} onClick={() => setConfirm(true)} disabled={!ready || over} data-submit-exam>
          Submit
        </button>
      </div>
      {confirm && !over && (
        <div className="qz-confirm" role="alertdialog" aria-label="Submit the exam" data-confirm-submit>
          <p className="qz-confirm-text">
            Submit now? {exam.ids.length - answered} of {exam.ids.length} questions are not answered{flagged ? ` and ${flagged} ${flagged === 1 ? 'is' : 'are'} flagged` : ''}.
          </p>
          <p className="qz-confirm-actions">
            <button type="button" className="btn btn-primary" onClick={submit} disabled={!ready} data-confirm-yes>
              Submit the exam
            </button>
            <button type="button" className="btn" onClick={() => setConfirm(false)}>
              Keep going
            </button>
          </p>
        </div>
      )}
    </section>
  );
}

function ExamResults({ exam, bank, record }: { exam: ExamRun; bank: Bank; record: MockRecord | undefined }) {
  const ready = useHydrated();
  const by = byId(bank);
  const info = EXAMS[exam.cert];
  const score = record?.score ?? 0;
  const n = record?.n ?? exam.ids.length;
  const pct = record?.pct ?? 0;
  const pass = passes(score, n, info.pass);
  return (
    <section className="qz-results" data-exam-results={pass ? 'pass' : 'fail'}>
      <div className="qz-board" data-pass={String(pass)}>
        <div className="qz-board-score" aria-hidden="true">
          <span className="qz-board-label mono">{exam.cert.toUpperCase()} score</span>
          <span className="qz-board-big">
            <Count to={pct} />%
          </span>
          <span className="qz-board-label mono">
            <Count to={score} /> / {n} right
          </span>
        </div>
        <div className="qz-board-main">
          <h2 className="qz-board-title" data-exam-score>
            {score} of {n} right ({pct}%): {pass ? 'passed' : 'not passed'}
          </h2>
          <p className="qz-stamp mono" data-pass={String(pass)} aria-hidden="true">
            <Mark right={pass} />
            {pass ? 'Passed' : 'Not passed'}
          </p>
          <ScoreBar pct={pct} mark={info.pass} />
          <p className="qz-board-scale mono" aria-hidden="true">
            Pass mark {Math.round(info.pass * 100)}%
          </p>
          <p className="qz-board-text">
            The pass mark is {Math.round(info.pass * 100)}% ({needed(n, info.pass)} of {n}). {exam.timeUp ? 'Time ran out; the exam was submitted for you. ' : ''}
            Time taken: {record?.mins ?? 0} minutes.
          </p>
          <div className="qz-board-actions">
            <button type="button" className="btn btn-primary" onClick={() => updateState(dropExam)} disabled={!ready} data-close-exam>
              Close the results
            </button>
            <a className="qz-link mono" href="#exam-review">
              Every question, explained
            </a>
          </div>
        </div>
      </div>
      <h3 className="qz-label mono">Result per domain</h3>
      <ul className="qz-domains" data-exam-domains>
        {Object.keys(info.weights).map((d) => {
          const r = record && Object.hasOwn(record.dom, d) ? record.dom[d] : [0, 0];
          const share = r[1] ? Math.round((r[0] / r[1]) * 100) : 0;
          return (
            <li key={d} className="qz-domain" data-domain={d}>
              <span className="qz-domain-name">
                <span className="qz-domain-id mono">{d}</span> {DOMAINS[d]?.name}
              </span>
              <ScoreBar pct={share} mark={info.pass} />
              <span className="qz-domain-figs">
                <span className="qz-domain-big">
                  <Count to={share} />%
                </span>
                <span className="mono" data-domain-score>
                  {r[0]} of {r[1]}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      <h3 className="qz-label mono" id="exam-review">
        Every question
      </h3>
      <ol className="qz-review" data-exam-review>
        {exam.ids.map((id, k) => {
          const q = by.get(id);
          if (!q) return null;
          const m = Object.hasOwn(exam.marks, id) ? exam.marks[id] : undefined;
          return (
            <li key={id} className="qz-review-item">
              <p className="qz-qnum">
                <span className="qz-qnum-n" aria-hidden="true">
                  {String(k + 1).padStart(2, '0')}
                </span>
                {!m?.a.length && <span className="qz-qnum-of mono">Not answered.</span>}
              </p>
              <QuestionView q={q} order={shownOrder(exam.ord[k], q.n)} picked={m?.a ?? []} onPick={() => undefined} disabled feedback name={`r-${exam.t0}-${id}`} />
            </li>
          );
        })}
      </ol>
    </section>
  );
}
