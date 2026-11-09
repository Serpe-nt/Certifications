import { useEffect, useId, useState } from 'react';
import type { RenderedOption } from '../../lib/question-html.ts';
import { updateState, useHydrated, useStoreState } from '../../lib/use-store.ts';

interface Props {
  id: string;
  /** Build-time HTML from the course's own MDX, never from saved state. */
  stemHtml: string;
  options: RenderedOption[];
  answer: number;
}

/** The one knowledge-check question on a step card. Options are shuffled after hydration. */
export default function CardQuestion({ id, stemHtml, options, answer }: Props) {
  const state = useStoreState();
  const ready = useHydrated();
  const name = useId();
  const [order, setOrder] = useState(() => options.map((_, i) => i));
  const [picked, setPicked] = useState<number | null>(null);

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
      <div dangerouslySetInnerHTML={{ __html: stemHtml }} />
      <fieldset className="m-0 border-0 p-0">
        <legend className="sr-only">Pick one answer</legend>
        {order.map((i) => {
          const o = options[i];
          const right = i === answer;
          const tone = !answered ? '' : right ? 'border-good' : i === picked ? 'border-bad' : '';
          return (
            <label key={i} className={`mb-2 block rounded-md border border-line bg-surface p-3 ${tone}`} data-option={right && answered ? 'right' : undefined}>
              <span className="flex items-start gap-2">
                <input type="radio" name={name} disabled={answered || !ready} checked={picked === i} onChange={() => submit(i)} className="mt-1" />
                <span dangerouslySetInnerHTML={{ __html: o.html }} />
              </span>
              {answered && (
                <span className="mt-2 block text-sm text-ink-2">
                  <strong>{right ? 'Right. ' : i === picked ? 'Not this one. ' : ''}</strong>
                  <span dangerouslySetInnerHTML={{ __html: o.whyHtml }} />
                </span>
              )}
            </label>
          );
        })}
      </fieldset>
      <p className="text-sm text-ink-3" aria-live="polite" data-question-result>
        {answered ? (picked === answer ? 'Right.' : 'Not quite: the explanations are under each option.') : last ? `Last time: ${last.right ? 'right' : 'wrong'}.` : ''}
      </p>
    </div>
  );
}
