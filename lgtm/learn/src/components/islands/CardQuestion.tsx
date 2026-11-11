import { useEffect, useId, useState } from 'react';
import type { RenderedOption } from '../../lib/question-html.ts';
import { Mark } from './QuestionView.tsx';
import { updateState, useHydrated, useStoreState } from '../../lib/use-store.ts';

interface Props {
  id: string;
  /** Build-time HTML from the course's own MDX, never from saved state. */
  stemHtml: string;
  options: RenderedOption[];
  answer: number;
}

/** An explanation that opens with its own "Right." or "Wrong." (after an optional <p>) loses it: the row prints one. */
const ownVerdictOff = (html: string) => html.replace(/^(\s*<p>)?\s*(?:Correct|Right|Wrong|Incorrect)\.\s*/, '$1');

/** The one knowledge-check question on a step. Options are shuffled after hydration; a pick is graded only on Submit. */
export default function CardQuestion({ id, stemHtml, options, answer }: Props) {
  const state = useStoreState();
  const ready = useHydrated();
  const name = useId();
  const [order, setOrder] = useState(() => options.map((_, i) => i));
  const [picked, setPicked] = useState<number | null>(null);
  // The option the learner has selected but not yet checked.
  const [choice, setChoice] = useState<number | null>(null);

  useEffect(() => {
    const o = options.map((_, i) => i);
    for (let i = o.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [o[i], o[j]] = [o[j], o[i]];
    }
    setOrder(o);
  }, [options]);

  const last = state.answers[id];
  const answered = picked !== null;

  const submit = (i: number) => {
    if (answered) return;
    setPicked(i);
    updateState((s) => {
      const prev = s.answers[id];
      s.answers[id] = { right: i === answer, n: (prev?.n ?? 0) + 1, at: Date.now() };
    });
  };

  return (
    <div data-question={id}>
      <div className="qv-text" dangerouslySetInnerHTML={{ __html: stemHtml }} />
      <fieldset className="qv-opts">
        <legend className="qv-legend mono">Pick one answer</legend>
        {order.map((i, k) => {
          const o = options[i];
          const right = i === answer;
          const chosen = (answered ? picked : choice) === i;
          const state = !answered ? (chosen ? 'picked' : 'open') : right ? 'right' : i === picked ? 'wrong' : 'other';
          return (
            <label key={i} className="qopt" data-state={state} data-option={right && answered ? 'right' : undefined}>
              <input type="radio" name={name} className="qopt-input" disabled={answered || !ready} checked={chosen} onChange={() => setChoice(i)} />
              <span className="qopt-key" aria-hidden="true">
                {'ABCDEF'[k] ?? k + 1}
              </span>
              <span className="qopt-body">
                <span className="qopt-text" dangerouslySetInnerHTML={{ __html: o.html }} />
                {answered && (right || i === picked) && (
                  <span className="qopt-tag mono">
                    <Mark right={right} />
                    {right ? (i === picked ? 'Your pick, right' : 'The right answer') : 'Your pick, wrong'}
                  </span>
                )}
                {answered && (
                  <span className="qopt-why">
                    <strong>{right ? 'Right.' : 'Wrong.'}</strong> <span dangerouslySetInnerHTML={{ __html: ownVerdictOff(o.whyHtml) }} />
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </fieldset>
      <div className="card-actions">
        {!answered && (
          <button type="button" className="btn btn-primary" disabled={choice === null || !ready} onClick={() => choice !== null && submit(choice)} data-check-answer-card>
            Submit
            <span className="qz-charge" aria-hidden="true" />
          </button>
        )}
        <p className="card-result mono" aria-live="polite" data-question-result data-verdict={answered ? (picked === answer ? 'right' : 'wrong') : undefined}>
          {answered && <Mark right={picked === answer} />}
          {answered ? (picked === answer ? 'Correct' : 'Wrong') : last ? `Last time: ${last.right ? 'right' : 'wrong'}` : ''}
        </p>
      </div>
    </div>
  );
}
