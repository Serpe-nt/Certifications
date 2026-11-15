// m02 step 4, traces and spans: Grafana's trace view of one checkout request, built from the root span
// down. Each child starts inside its parent's time; the long payment span turns red with an error icon,
// and a click opens its details. Span names are the shop's (lab/demo/src/checkout/main.go), shortened as
// the lessons shorten them.
import type { CSSProperties } from 'react';
import type { SceneProps } from '../registry.ts';
import { Stage } from '../kit/stage.tsx';
import type { Act } from '../kit/act.ts';
import { useSceneMotion } from '../motion.ts';
import '../grafana.css';
import './waterfall.css';

type S = { n: number; err: boolean; sel: boolean };
const START: S = { n: 0, err: false, sel: false };
const END: S = { n: 6, err: true, sel: true };

const TOTAL = 4; // seconds: the step's problem says the click took four seconds
const TRACE_ID = '4bf92f3577b34da6a3ce929d0e0e4736'; // the step's own example trace ID
const PAY = 4; // the payment span's row

interface Span {
  svc?: string;
  op?: string;
  depth: number;
  start: number;
  end: number;
  color: string;
  parent?: boolean;
  wipe: number; // ms the bar takes to grow
}

// Colours from Grafana's trace view palette, one per service.
const SPANS: Span[] = [
  { svc: 'frontend', op: 'POST /api/checkout', depth: 0, start: 0, end: 4, color: '#6ccadc', parent: true, wipe: 700 },
  { svc: 'checkout', op: 'PlaceOrder', depth: 1, start: 0.1, end: 3.95, color: '#f2c96d', parent: true, wipe: 700 },
  { svc: 'cart', op: 'GetCart', depth: 2, start: 0.2, end: 0.35, color: '#9ac48a', wipe: 260 },
  { svc: 'product-catalog', op: 'GetProduct', depth: 2, start: 0.4, end: 0.6, color: '#b877d9', wipe: 260 },
  { svc: 'payment', op: 'Charge', depth: 2, start: 0.75, end: 3.85, color: '#8ab8ff', wipe: 1600 },
  // Filler at the bottom edge: checkout empties the cart after the charge.
  { depth: 2, start: 3.87, end: 3.93, color: '#9ac48a', wipe: 200 },
];

const pct = (s: number) => `${(s / TOTAL) * 100}%`;
const dur = (s: number) => (s >= 1 ? `${+s.toFixed(2)}s` : `${Math.round(s * 1000)}ms`);
// Where Grafana puts a span's duration: after a bar that ends early, before one that starts late, else inside.
const side = (sp: Span) => (sp.end / TOTAL < 0.75 ? 'after' : sp.start / TOTAL > 0.3 ? 'before' : 'inside');

const script = async (a: Act<S>) => {
  await a.wait(400);
  for (let i = 0; i < SPANS.length; i++) {
    a.put({ n: i + 1 });
    await a.wait(i === PAY ? SPANS[i].wipe + 150 : SPANS[i].wipe + 250);
  }
  a.put({ err: true });
  await a.wait(700);
  await a.click({ at: 'pay-row', x: 0.85, y: 0.5 });
  a.put({ sel: true });
};

export default function Waterfall({ playing, still }: SceneProps) {
  const { animate, settled } = useSceneMotion(playing, still);
  return (
    <div className="wf gf" data-scene-animate={String(animate)} data-scene-settled={String(settled)}>
      <Stage<S>
        width={600}
        height={380}
        compact={{ below: 480, width: 358, height: 380 }}
        initial={START}
        poster={settled ? END : START}
        script={animate ? script : undefined}
        cursor={{ at: { wide: { x: 470, y: 322 }, compact: { x: 300, y: 322 } } }}
        play="once"
        fill
      >
        {(s) => (
          <div className="gf-panel wf-panel">
            <div className="wf-head">
              <div className="wf-title">
                frontend: POST /api/checkout <span className="wf-total">4s</span>
              </div>
              <div className="wf-meta">
                <span className="gf-tag">POST</span>
                <span className="wf-id">
                  {TRACE_ID.slice(0, 8)}
                  <span className="wf-id-rest">{TRACE_ID.slice(8)}</span>
                </span>
              </div>
            </div>

            <div className="wf-mini" aria-hidden="true">
              {['0μs', '1s', '2s', '3s', '4s'].map((t, i) => (
                <span key={t} className={i === 4 ? 'wf-mini-tick wf-end' : 'wf-mini-tick'} style={{ '--at': pct(i) } as CSSProperties}>
                  {t}
                </span>
              ))}
              {SPANS.map((sp, i) => (
                <span
                  key={i}
                  className="wf-mini-bar"
                  data-in={s.n > i || undefined}
                  data-err={(i === PAY && s.err) || undefined}
                  style={{ '--at': pct(sp.start), '--w': pct(sp.end - sp.start), '--c': sp.color, '--i': i, '--wipe': `${sp.wipe}ms` } as CSSProperties}
                />
              ))}
            </div>

            <div className="wf-cols">
              <span className="wf-col">
                Service<span className="wf-wide"> &amp; Operation</span>
              </span>
              <span className="wf-track">
                {['0μs', '1s', '2s', '3s', '4s'].map((t, i) => (
                  <span key={t} className="wf-tick" style={{ '--at': pct(i) } as CSSProperties}>
                    {t}
                  </span>
                ))}
              </span>
            </div>

            <div className="wf-rows">
              <span className="wf-grid" aria-hidden="true">
                {[1, 2, 3].map((t) => (
                  <span key={t} style={{ '--at': pct(t) } as CSSProperties} />
                ))}
              </span>
              {SPANS.map((sp, i) => {
                const err = i === PAY && s.err;
                const row = (
                  <div
                    key={i}
                    className="wf-row"
                    data-crop
                    data-target={i === PAY ? 'pay-row' : undefined}
                    data-cursor={i === PAY ? 'pointer' : undefined}
                    data-in={s.n > i || undefined}
                    data-err={err || undefined}
                    data-sel={(i === PAY && s.sel) || undefined}
                    style={{ '--depth': sp.depth, '--wipe': `${sp.wipe}ms`, '--c': sp.color } as CSSProperties}
                  >
                    <span className="wf-name">
                      <span className="wf-toggle">
                        {sp.parent && (
                          <svg viewBox="0 0 16 16" aria-hidden="true">
                            <path d="M4 6l4 4 4-4" />
                          </svg>
                        )}
                        {i === PAY && (
                          <svg className="wf-err" viewBox="0 0 16 16" aria-hidden="true">
                            <circle cx="8" cy="8" r="7" />
                            <path d="M8 4.5v4.5M8 11v.5" />
                          </svg>
                        )}
                      </span>
                      {sp.svc ? (
                        <>
                          <span className="wf-svc">{sp.svc}</span>
                          <span className="wf-op">
                            {sp.op}
                            <span className="wf-wide"> ({dur(sp.end - sp.start)})</span>
                          </span>
                        </>
                      ) : (
                        <span className="wf-filler" />
                      )}
                    </span>
                    <span className="wf-track">
                      <span className="wf-bar" data-side={side(sp)} style={{ '--at': pct(sp.start), '--w': pct(sp.end - sp.start) } as CSSProperties}>
                        {sp.svc && <span className="wf-dur">{dur(sp.end - sp.start)}</span>}
                      </span>
                    </span>
                  </div>
                );
                if (i !== PAY) return row;
                return [
                  row,
                  <div key="detail" className="wf-detail" data-open={s.sel || undefined}>
                    <div className="wf-detail-in">
                      <span className="wf-detail-op wf-wide">Charge</span>
                      <span className="wf-kv wf-wide">
                        <span>Service:</span> payment
                      </span>
                      <span className="wf-kv">
                        <span>Duration:</span> 3.1s
                      </span>
                      <span className="wf-kv wf-kv-err">
                        <span>Status:</span> error
                      </span>
                    </div>
                  </div>,
                ];
              })}
            </div>
          </div>
        )}
      </Stage>
    </div>
  );
}
