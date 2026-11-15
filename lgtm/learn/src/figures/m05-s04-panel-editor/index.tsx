// m05 step 4, the first dashboard: Grafana's panel editor. The cursor types the step's query into the
// Queries tab and runs it; the preview draws the one line it returns (checkout has one server operation,
// a few hundredths of a request per second). Table view shows the raw numbers and goes off again; then
// the visualization picker opens its suggestions, Time series, Stat and Table, each with a small preview.
import type { SceneProps } from '../registry.ts';
import { Stage } from '../kit/stage.tsx';
import type { Act } from '../kit/act.ts';
import { useSceneMotion } from '../motion.ts';
import { Caret, linePath } from '../gf.tsx';
import '../grafana.css';
import './panel-editor.css';

type S = { q: string; ran: boolean; table: boolean; viz: boolean; hover: string };
const QUERY = 'sum by (span_name) (rate(traces_spanmetrics_calls_total{service_name="checkout", span_kind="SPAN_KIND_SERVER"}[$__rate_interval]))';
const START: S = { q: '', ran: false, table: false, viz: false, hover: '' };
const END: S = { q: QUERY, ran: true, table: false, viz: true, hover: '' };

// Requests per second of checkout's one server operation: a few hundredths, as the step says.
const RATE = [0.031, 0.034, 0.029, 0.033, 0.036, 0.03, 0.028, 0.032, 0.035, 0.031, 0.027, 0.033, 0.034, 0.03, 0.032, 0.029];
const ROWS = [
  ['12:44:30', '0.0320'],
  ['12:44:00', '0.0290'],
  ['12:43:30', '0.0300'],
  ['12:43:00', '0.0340'],
];
const SUGGESTIONS = [
  { id: 'sug-ts', name: 'Time series' },
  { id: 'sug-stat', name: 'Stat' },
  { id: 'sug-table', name: 'Table' },
];

const script = async (a: Act<S>) => {
  await a.wait(500);
  await a.click('editor');
  await a.type('q', QUERY, { interval: 22 });
  await a.wait(300);
  await a.click({ at: 'run', x: 0.8, y: 0.75 });
  a.put({ ran: true });
  await a.wait(1400);
  await a.click({ at: 'table-view', x: 0.12, y: 0.5 });
  a.put({ table: true });
  await a.wait(1500);
  await a.click({ at: 'table-view', x: 0.12, y: 0.5 });
  a.put({ table: false });
  await a.wait(700);
  await a.click('viz');
  a.put({ viz: true });
  await a.wait(600);
  for (const sg of SUGGESTIONS) {
    await a.move(sg.id);
    a.put({ hover: sg.id });
    await a.wait(700);
  }
  a.put({ hover: '' });
};

function Thumb({ kind }: { kind: string }) {
  if (kind === 'sug-stat') return <span className="pe-thumb-stat">0.032</span>;
  if (kind === 'sug-table')
    return (
      <span className="pe-thumb-table" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    );
  return (
    <svg className="gf-chart" viewBox="0 0 140 40" preserveAspectRatio="none" aria-hidden="true">
      <path className="line" d={linePath(RATE, 140, 40, 0, 0.045)} stroke="#73bf69" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function PanelEditor({ playing, still }: SceneProps) {
  const { animate, settled } = useSceneMotion(playing, still);
  return (
    <div className="pe gf" data-scene-animate={String(animate)} data-scene-settled={String(settled)}>
      <Stage<S>
        width={620}
        height={420}
        compact={{ below: 480, width: 358, height: 440 }}
        initial={START}
        poster={settled ? END : START}
        script={animate ? script : undefined}
        cursor={{ at: { wide: { x: 300, y: 395 }, compact: { x: 200, y: 415 } } }}
        play="once"
        fill
      >
        {(s) => (
          <div className="gf-panel pe-page">
            <div className="pe-bar">
              <span className="pe-title">Edit panel</span>
              <span className="gf-btn">Back to dashboard</span>
            </div>
            <div className="pe-body">
              <div className="pe-main">
                <div className="pe-tools">
                  <span className="pe-switch" data-target="table-view" data-cursor="pointer" data-on={s.table || undefined}>
                    <span className="pe-knob" />
                    Table view
                  </span>
                  <span className="gf-btn pe-time">Last 1 hour</span>
                </div>
                <div className="pe-preview">
                  <div className="gf-label">New panel</div>
                  <div className="pe-view" data-table={s.table || undefined}>
                    <div className="pe-graph" data-in={s.ran || undefined}>
                      <span className="gf-dim pe-y">0.04</span>
                      <span className="gf-dim pe-y pe-y0">0</span>
                      <svg className="gf-chart" viewBox="0 0 300 70" preserveAspectRatio="none" aria-hidden="true">
                        <line className="grid" x1={0} x2={300} y1={8} y2={8} vectorEffect="non-scaling-stroke" />
                        <line className="grid" x1={0} x2={300} y1={39} y2={39} vectorEffect="non-scaling-stroke" />
                        <line className="grid" x1={0} x2={300} y1={70} y2={70} vectorEffect="non-scaling-stroke" />
                        <path className="line pe-line" d={linePath(RATE, 300, 70, 0, 0.04)} stroke="#73bf69" pathLength={1} vectorEffect="non-scaling-stroke" />
                      </svg>
                      <span className="pe-legend gf-dim">oteldemo.CheckoutService/PlaceOrder</span>
                      <span className="gf-dim pe-empty" data-gone={s.ran || undefined}>
                        No data
                      </span>
                    </div>
                    <div className="pe-table">
                      <div className="pe-tr pe-th">
                        <span>Time</span>
                        <span>oteldemo.CheckoutService/PlaceOrder</span>
                      </div>
                      {ROWS.map(([t, v]) => (
                        <div key={t} className="pe-tr">
                          <span className="gf-code">{t}</span>
                          <span className="gf-code">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="pe-queries">
                  <div className="pe-tabs">
                    <span data-on>Queries</span>
                    <span>Transformations</span>
                    <span className="gf-field pe-ds">
                      Mimir
                      <Caret />
                    </span>
                  </div>
                  <div className="pe-qhead">
                    <span className="gf-label">A</span>
                    <span className="gf-radio">
                      <span>Builder</span>
                      <span data-on>Code</span>
                    </span>
                    <span className="gf-btn gf-btn-primary pe-run" data-target="run" data-cursor="pointer">
                      Run queries
                    </span>
                  </div>
                  <div className="gf-field gf-code pe-editor" data-target="editor" data-cursor="ibeam">
                    {s.q ? <span>{s.q}</span> : <span className="gf-dim">Enter a PromQL query</span>}
                  </div>
                </div>
              </div>

              <div className="pe-side" data-open={s.viz || undefined}>
                <div className="gf-label">Visualization</div>
                <span className="gf-field pe-viz" data-target="viz" data-cursor="pointer" data-open={s.viz || undefined}>
                  Time series
                  <Caret />
                </span>
                <span className="gf-field gf-dim pe-search">Search options</span>
                <div className="pe-swap">
                  <div className="pe-sections" data-gone={s.viz || undefined}>
                    {['Panel options', 'Tooltip', 'Legend', 'Axis'].map((n) => (
                      <div key={n} className="pe-section">
                        {n}
                      </div>
                    ))}
                  </div>
                  <div className="pe-sugs" data-in={s.viz || undefined}>
                    <div className="gf-dim pe-sub">Suggestions</div>
                    {SUGGESTIONS.map((sg, i) => (
                      <div key={sg.id} className="pe-sug" data-target={sg.id} data-cursor="pointer" data-on={s.hover === sg.id || undefined} style={{ transitionDelay: s.viz ? `${120 + i * 90}ms` : '0ms' }}>
                        <span className="pe-sug-name">{sg.name}</span>
                        <span className="pe-thumb">
                          <Thumb kind={sg.id} />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Stage>
    </div>
  );
}
