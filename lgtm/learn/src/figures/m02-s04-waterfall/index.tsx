// m02 step 4, traces and spans: a trace waterfall of one checkout request that builds from the root span
// down. Each child starts inside its parent's time; the long payment span turns red with an error mark.
// Span names are the shop's (lab/demo/src/checkout/main.go), shortened as the lessons shorten them.
import type { CSSProperties } from 'react';
import type { SceneProps } from '../registry.ts';
import { Stage } from '../kit/stage.tsx';
import type { Act } from '../kit/act.ts';
import { useSceneMotion } from '../motion.ts';
import './waterfall.css';

type S = { n: number; err: boolean; sel: boolean };
const START: S = { n: 0, err: false, sel: false };
const END: S = { n: 6, err: true, sel: true };

const TOTAL = 4; // seconds: the step's problem says the click took four seconds
const TRACE_ID = '4bf92f3577b34da6a3ce929d0e0e4736'; // the step's own example trace ID

interface Span {
  svc?: string;
  op?: string;
  depth: number;
  start: number;
  end: number;
  parent?: number;
  err?: boolean;
  wipe: number; // ms the bar takes to draw
}

const SPANS: Span[] = [
  { svc: 'frontend', op: 'POST /api/checkout', depth: 0, start: 0, end: 4, wipe: 700 },
  { svc: 'checkout', op: 'PlaceOrder', depth: 1, start: 0.1, end: 3.95, parent: 0, wipe: 700 },
  { svc: 'cart', op: 'GetCart', depth: 2, start: 0.2, end: 0.35, parent: 1, wipe: 260 },
  { svc: 'product-catalog', op: 'GetProduct', depth: 2, start: 0.4, end: 0.6, parent: 1, wipe: 260 },
  { svc: 'payment', op: 'Charge', depth: 2, start: 0.75, end: 3.85, parent: 1, err: true, wipe: 1600 },
  // Filler, run off the bottom edge: checkout empties the cart after the charge.
  { depth: 2, start: 3.87, end: 3.93, wipe: 200 },
];

const pct = (s: number) => `${(s / TOTAL) * 100}%`;

const script = async (a: Act<S>) => {
  await a.wait(400);
  for (let i = 0; i < SPANS.length; i++) {
    a.put({ n: i + 1 });
    await a.wait(i === 4 ? SPANS[i].wipe + 150 : SPANS[i].wipe + 300);
  }
  a.put({ err: true });
  await a.wait(900);
  a.put({ sel: true });
};

export default function Waterfall({ playing, still }: SceneProps) {
  const { animate, settled } = useSceneMotion(playing, still);
  return (
    <div className="wf" data-scene-animate={String(animate)} data-scene-settled={String(settled)}>
      <Stage<S>
        width={600}
        height={300}
        compact={{ below: 480, width: 358, height: 300 }}
        initial={START}
        poster={settled ? END : START}
        script={animate ? script : undefined}
        play="once"
        fill
      >
        {(s) => (
          <div className="wf-panel">
            <div className="wf-head">
              <span className="wf-label">Trace</span>
              <span className="wf-id">
                {TRACE_ID.slice(0, 8)}
                <span className="wf-id-rest">{TRACE_ID.slice(8)}</span>
              </span>
              <span className="wf-total">4.0 s</span>
            </div>
            <div className="wf-ruler">
              <span className="wf-col">
                Service<span className="wf-op-head"> and operation</span>
              </span>
              <span className="wf-track">
                {[0, 1, 2, 3, 4].map((t) => (
                  <span key={t} className="wf-tick" style={{ '--at': pct(t) } as CSSProperties}>
                    {t === 0 ? '0' : `${t} s`}
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
                const shown = s.n > i;
                const err = sp.err && s.err;
                const reach = sp.parent === undefined ? 0 : i - sp.parent;
                return (
                  <div
                    key={i}
                    className="wf-row"
                    data-in={shown || undefined}
                    data-err={err || undefined}
                    data-sel={(sp.err && s.sel) || undefined}
                    style={{ '--depth': sp.depth, '--wipe': `${sp.wipe}ms`, '--reach': reach } as CSSProperties}
                  >
                    <span className="wf-name">
                      {sp.svc ? (
                        <>
                          <span className="wf-svc">{sp.svc}</span>
                          <span className="wf-op">{sp.op}</span>
                        </>
                      ) : (
                        <span className="wf-filler" />
                      )}
                      {sp.err && (
                        <span className="wf-chip">
                          <svg viewBox="0 0 10 10" aria-hidden="true">
                            <path d="M2 2l6 6M8 2l-6 6" />
                          </svg>
                          error
                        </span>
                      )}
                    </span>
                    <span className="wf-track">
                      {reach > 0 && <span className="wf-guide" style={{ '--at': pct(sp.start) } as CSSProperties} />}
                      <span className="wf-bar" style={{ '--at': pct(sp.start), '--w': pct(sp.end - sp.start) } as CSSProperties}>
                        {sp.err && <span className="wf-dur">3.1 s</span>}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Stage>
    </div>
  );
}
