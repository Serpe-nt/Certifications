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

/**
 * One question with its options in the shuffled order. Question and option HTML is build-time
 * HTML from the course's own question files (bank.json, only <b> and <code>), never from state.
 */
export default function QuestionView({ q, order, picked, onPick, disabled, feedback, name }: Props) {
  const two = q.a.length > 1;
  return (
    <div data-qid={q.id}>
      <p className="mt-0 text-lg" dangerouslySetInnerHTML={{ __html: q.q }} />
      <fieldset className="m-0 border-0 p-0">
        <legend className="sr-only">{two ? 'Pick two answers' : 'Pick one answer'}</legend>
        {order.map((i) => {
          const o = q.o[i];
          if (!o) return null;
          const right = q.a.includes(i);
          const chosen = picked.includes(i);
          const tone = !feedback ? (chosen ? 'border-accent' : '') : right ? 'border-good' : chosen ? 'border-bad' : '';
          return (
            <label key={i} className={`mb-2 block rounded-md border border-line bg-surface p-3 ${tone}`} data-opt={i} data-picked={chosen ? 'true' : undefined}>
              <span className="flex items-start gap-2">
                <input type={two ? 'checkbox' : 'radio'} name={name} className="mt-1" checked={chosen} disabled={disabled} onChange={() => onPick(i)} />
                <span dangerouslySetInnerHTML={{ __html: o.t }} />
              </span>
              {feedback && (
                <span className="mt-2 block text-sm text-ink-2" data-why>
                  <strong>{right ? 'Right. ' : chosen ? 'Not this one. ' : ''}</strong>
                  <span dangerouslySetInnerHTML={{ __html: o.w }} />
                </span>
              )}
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
