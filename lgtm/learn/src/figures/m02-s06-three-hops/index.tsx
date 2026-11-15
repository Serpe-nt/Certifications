// m02 step 6, one request in three signals: an exemplar on the Duration panel opens its trace, the
// checkout span's Related logs open its log lines in Loki, and one trace ID is marked on all three.
// Names are the lab's: the panel Duration of Shop / checkout (RED), the tooltip's traceID and its
// Query with Tempo link, services as opentelemetry-demo/<name>, checkout's own log messages
// (lab/demo/src/checkout/main.go), and the derived field trace_id with its Open trace link.
import type { CSSProperties } from 'react';
import type { SceneProps } from '../registry.ts';
import { Stage } from '../kit/stage.tsx';
import { Connector } from '../kit/Connector.tsx';
import type { Act } from '../kit/act.ts';
import { useSceneMotion } from '../motion.ts';
import { linePath, SHORT_ID } from '../gf.tsx';
import '../grafana.css';
import './three-hops.css';

type S = { tip: boolean; b: boolean; sel: boolean; c: boolean; exp: boolean; hl: boolean };
const START: S = { tip: false, b: false, sel: false, c: false, exp: false, hl: false };
const END: S = { tip: true, b: true, sel: true, c: true, exp: true, hl: true };

const H = 150;
const P50 = [22, 24, 21, 23, 25, 22, 24, 23, 26, 22, 23, 24];
const P95 = [48, 52, 47, 55, 50, 49, 58, 51, 62, 50, 53, 49];
const P99 = [70, 74, 68, 80, 72, 71, 84, 75, 92, 73, 77, 70];
// Exemplars: [point index, latency]; the fourth is the slow one the cursor picks.
const DIAMONDS: [number, number][] = [
  [1, 60],
  [3, 66],
  [6, 77],
  [8, 88],
  [10, 64],
];
// The lines keep to the top half of the plot, so the tooltip below them hides none.
const LO = -60;
const yOf = (v: number) => H - ((v - LO) / (100 - LO)) * H;

// The waterfall's colours and shape, as in m02-s04-waterfall.
const SPANS = [
  { svc: 'frontend', w: [0, 100], c: '#6ccadc' },
  { svc: 'checkout', w: [3, 96], c: '#f2c96d' },
  { svc: 'cart', w: [5, 9], c: '#9ac48a' },
  { svc: 'product-catalog', w: [10, 15], c: '#b877d9' },
  { svc: 'payment', w: [19, 96], c: '#8ab8ff' },
];

const LOGS = [
  { t: '12:41:07.482', msg: 'order placed' },
  { t: '12:41:07.391', msg: 'payment went through' },
  { t: '12:41:06.988', msg: '[PlaceOrder]' },
];

const script = async (a: Act<S>) => {
  await a.wait(500);
  await a.move('dia');
  a.put({ tip: true });
  await a.wait(1300);
  await a.click('tempo');
  a.put({ b: true });
  await a.wait(1500);
  await a.click('row-co');
  a.put({ sel: true });
  await a.wait(900);
  await a.click('rel');
  a.put({ c: true });
  await a.wait(1300);
  await a.click('log');
  a.put({ exp: true });
  await a.wait(600);
  a.put({ hl: true });
};

export default function ThreeHops({ playing, still }: SceneProps) {
  const { animate, settled } = useSceneMotion(playing, still);
  return (
    <div className="th gf" data-scene-animate={String(animate)} data-scene-settled={String(settled)}>
      <Stage<S>
        width={620}
        height={300}
        compact={{ below: 480, width: 358, height: 320 }}
        initial={START}
        poster={settled ? END : START}
        script={animate ? script : undefined}
        cursor={{ at: { wide: { x: 110, y: 270 }, compact: { x: 250, y: 290 } } }}
        play="once"
        fill
      >
        {(s, rect, layout) => {
          const compact = layout === 'compact';
          const W = compact ? 304 : 166;
          const PH = compact ? 96 : H;
          const ida = rect('id-a');
          const idb = rect('id-b');
          const rowco = rect('row-co');
          const logr = rect('log');
          return (
            <>
            <div className="th-row" data-at={s.c ? 2 : s.b ? 1 : 0}>
              {/* The metric: the Duration panel with its exemplars */}
              <div className="gf-panel th-card th-a" data-target="card-a" data-hl={s.hl || undefined}>
                <div className="th-title">Duration</div>
                <div className="th-plot">
                  <svg className="gf-chart" width={W} height={PH} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
                    {[0.25, 0.5, 0.75].map((f) => (
                      <line key={f} className="grid" x1={0} x2={W} y1={H * f} y2={H * f} vectorEffect="non-scaling-stroke" />
                    ))}
                    <path className="line" d={linePath(P50, W, H, LO, 100)} stroke="#73bf69" vectorEffect="non-scaling-stroke" />
                    <path className="line" d={linePath(P95, W, H, LO, 100)} stroke="#fade2a" vectorEffect="non-scaling-stroke" />
                    <path className="line" d={linePath(P99, W, H, LO, 100)} stroke="#5794f2" vectorEffect="non-scaling-stroke" />
                  </svg>
                  {DIAMONDS.map(([i, v], k) => (
                    <span
                      key={k}
                      className="th-dia"
                      data-target={k === 3 ? 'dia' : undefined}
                      data-on={(k === 3 && s.tip) || undefined}
                      style={{ left: (i * W) / (P50.length - 1), top: (yOf(v) * PH) / H } as CSSProperties}
                    />
                  ))}
                </div>
                <div className="th-legend">
                  <span style={{ '--c': '#73bf69' } as CSSProperties}>p50</span>
                  <span style={{ '--c': '#fade2a' } as CSSProperties}>p95</span>
                  <span style={{ '--c': '#5794f2' } as CSSProperties}>p99</span>
                </div>
                <div className="gf-pop th-tip" data-open={s.tip || undefined}>
                  <div className="th-kv">
                    <span className="gf-dim">traceID</span>
                    <span className="gf-code gf-mark" data-target="id-a">
                      {SHORT_ID}
                    </span>
                  </div>
                  <span className="gf-link" data-target="tempo" data-cursor="pointer">
                    Query with Tempo
                  </span>
                </div>
              </div>

              {/* The trace: Tempo's view of the same ID */}
              <div className="gf-panel th-card th-b" data-target="card-b" data-in={s.b || undefined} data-hl={s.hl || undefined}>
                <div className="th-fill">
                  <div className="th-title">POST /api/checkout</div>
                  <div className="th-kv th-head-id">
                    <span className="gf-code gf-mark" data-target="id-b">
                      {SHORT_ID}
                    </span>
                    <span className="gf-dim">Trace ID</span>
                  </div>
                  {SPANS.map((sp, i) => {
                    const co = sp.svc === 'checkout';
                    return (
                      <div key={sp.svc} className="th-span-wrap" style={{ '--i': i } as CSSProperties}>
                        <div
                          className="th-span"
                          data-target={co ? 'row-co' : undefined}
                          data-cursor={co ? 'pointer' : undefined}
                          data-sel={(co && s.sel) || undefined}
                        >
                          <span className="th-name">
                            opentelemetry-demo/<b>{sp.svc}</b>
                          </span>
                          <span className="th-track">
                            <span className="th-bar" style={{ left: `${sp.w[0]}%`, width: `${sp.w[1] - sp.w[0]}%`, background: sp.c }} />
                          </span>
                        </div>
                        {co && (
                          <div className="th-detail" data-open={s.sel || undefined}>
                            <div className="th-detail-in th-span-detail">
                              <span className="gf-link" data-target="rel" data-cursor="pointer">
                                Related logs
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* The logs: Loki's lines of that trace, one opened */}
              <div className="gf-panel th-card th-c" data-in={s.c || undefined} data-hl={s.hl || undefined}>
                <div className="th-fill">
                  <div className="th-query gf-code">
                    {'{service_name="checkout"} | trace_id="'}
                    <span className="gf-dim">{'…'}</span>
                    {'"'}
                  </div>
                  {LOGS.map((l, i) => {
                    const open = i === LOGS.length - 1;
                    return (
                      <div key={l.t} className="th-log-wrap" style={{ '--i': i } as CSSProperties}>
                        <div className="th-log" data-target={open ? 'log' : undefined} data-cursor={open ? 'pointer' : undefined} data-sel={(open && s.exp) || undefined}>
                          <span className="gf-dim gf-code">{l.t}</span>
                          <span className="th-msg">{l.msg}</span>
                        </div>
                        {open && (
                          <div className="th-detail" data-open={s.exp || undefined}>
                            <div className="th-detail-in th-fields">
                              <div className="th-sub gf-dim">Fields</div>
                              <div className="th-kv">
                                <span className="gf-dim">service_name</span>
                                <span>checkout</span>
                              </div>
                              <div className="th-kv">
                                <span className="gf-dim">trace_id</span>
                                <span className="gf-code gf-mark" data-target="id-c">
                                  {SHORT_ID}
                                </span>
                              </div>
                              <div className="th-sub gf-dim">Links</div>
                              <div className="th-kv">
                                <span className="gf-dim">trace_id</span>
                                <span className="gf-link">Open trace</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
              {!compact && ida.width > 0 && idb.width > 0 && (
                <Connector
                  show={s.b}
                  arrow
                  route="step"
                  from={{ x: ida.x + ida.width + 4, y: ida.y + ida.height / 2 }}
                  to={{ x: idb.x - 4, y: idb.y + idb.height / 2 }}
                />
              )}
              {!compact && rowco.width > 0 && logr.width > 0 && (
                <Connector
                  show={s.exp}
                  arrow
                  route="step"
                  from={{ x: rowco.x + rowco.width + 2, y: rowco.y + rowco.height / 2 }}
                  to={{ x: logr.x - 4, y: logr.y + logr.height / 2 }}
                />
              )}
            </>
          );
        }}
      </Stage>
    </div>
  );
}
