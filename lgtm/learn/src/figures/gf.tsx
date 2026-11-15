// Small parts the Grafana-look scenes share (grafana.css holds their styles).

/** An SVG path through values spread evenly across w, scaled between lo (bottom) and hi (top). */
export function linePath(values: number[], w: number, h: number, lo: number, hi: number): string {
  const step = w / (values.length - 1);
  return values.map((v, i) => `${i ? 'L' : 'M'}${(i * step).toFixed(1)} ${(h - ((v - lo) / (hi - lo)) * h).toFixed(1)}`).join(' ');
}

/** The small down caret at the end of a select. */
export function Caret() {
  return (
    <svg className="gf-caret" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M3 4.5l3 3 3-3" />
    </svg>
  );
}

/** A trace ID shown short, as the narrow screens of these scenes show it. */
export const TRACE_ID = '4bf92f3577b34da6a3ce929d0e0e4736'; // the example ID of m02 step 4
export const SHORT_ID = `${TRACE_ID.slice(0, 8)}…`;
