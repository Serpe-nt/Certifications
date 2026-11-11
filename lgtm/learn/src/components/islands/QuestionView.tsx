import type { FullQuestion } from '../../lib/bank.ts';

interface Props {
  q: FullQuestion;
  /** order[k] is the file index of the option shown k-th. */
  order: number[];
  picked: readonly number[];
  onPick: (fileIndex: number) => void;
  disabled: boolean;
  /** After answering (or on a results screen): right and wrong marks and every option's explanation. */
  feedback: boolean;
  /** Unique per question on screen, for the radio group. */
  name: string;
}

const KEYS = 'ABCDEF';

/** Some pools still open an explanation with its own verdict; the row prints "Right." or "Wrong." itself. */
const OWN_VERDICT = /^\s*(?:Correct|Right|Wrong|Incorrect)\.\s*/;
export const whyText = (html: string) => html.replace(OWN_VERDICT, '');

/** A check or a cross, drawn: the right and wrong marks never rely on colour alone. */
export function Mark({ right }: { right: boolean }) {
  return (
    <svg className="qz-mark" viewBox="0 0 16 16" aria-hidden="true">
      {right ? <path d="M2.5 8.5 6.5 12.5 13.5 3.5" /> : <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />}
    </svg>
  );
}

/**
 * One question with its options in the shuffled order. Question and option HTML is build-time
 * HTML from the course's own question files (bank.json, only <b> and <code>), never from state.
 * Each option is a full-width row: the lettered key on the left is the radio or checkbox itself.
 */
export default function QuestionView({ q, order, picked, onPick, disabled, feedback, name }: Props) {
  const two = q.a.length > 1;
  return (
    <div className="qv" data-qid={q.id}>
      <p className="qv-text" dangerouslySetInnerHTML={{ __html: q.q }} />
      <fieldset className="qv-opts">
        <legend className="qv-legend mono">{two ? 'Pick two answers' : 'Pick one answer'}</legend>
        {order.map((i, k) => {
          const o = q.o[i];
          if (!o) return null;
          const right = q.a.includes(i);
          const chosen = picked.includes(i);
          const state = !feedback ? (chosen ? 'picked' : 'open') : right ? 'right' : chosen ? 'wrong' : 'other';
          return (
            <label key={i} className="qopt" data-opt={i} data-picked={chosen ? 'true' : undefined} data-state={state}>
              <input type={two ? 'checkbox' : 'radio'} name={name} className="qopt-input" checked={chosen} disabled={disabled} onChange={() => onPick(i)} />
              <span className="qopt-key" aria-hidden="true">
                {KEYS[k] ?? k + 1}
              </span>
              <span className="qopt-body">
                <span className="qopt-text" dangerouslySetInnerHTML={{ __html: o.t }} />
                {feedback && (right || chosen) && (
                  <span className="qopt-tag mono">
                    <Mark right={right} />
                    {right ? (chosen ? 'Your pick, right' : 'The right answer') : 'Your pick, wrong'}
                  </span>
                )}
                {feedback && (
                  <span className="qopt-why" data-why>
                    <strong>{right ? 'Right.' : 'Wrong.'}</strong> <span dangerouslySetInnerHTML={{ __html: whyText(o.w) }} />
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </fieldset>
    </div>
  );
}

/** The order to show a question's options in: the run's order when it fits the question, else file order. */
export function shownOrder(order: number[] | undefined, n: number): number[] {
  if (order && order.length === n && new Set(order).size === n && order.every((i) => i >= 0 && i < n)) return order;
  return Array.from({ length: n }, (_, i) => i);
}

/** Toggles a pick: one answer replaces the pick, two answers keep at most two. */
export function togglePick(picked: readonly number[], i: number, two: boolean): number[] {
  if (!two) return [i];
  if (picked.includes(i)) return picked.filter((x) => x !== i);
  return [...picked, i].slice(-2);
}
