// m05 step 2, Explore: the cursor picks the data source Prometheus, switches the editor to Code, types
// count(kube_node_info) and runs it; then sets the query Type from Both to Instant, so the graph goes and
// Raw holds one number; then Split opens a second pane on Mimir (tenant prom) with the same answer.
// Data source names are the lab's (lab/helm/grafana/values.yaml); the lab has 5 nodes since version 3.
import type { SceneProps } from '../registry.ts';
import { Stage } from '../kit/stage.tsx';
import type { Act } from '../kit/act.ts';
import { useSceneMotion } from '../motion.ts';
import { Caret } from '../gf.tsx';
import '../grafana.css';
import './explore.css';

type S = {
  menu: boolean;
  ds: string;
  code: boolean;
  q: string;
  ran: number; // 0 nothing yet, 1 Both, 2 Instant
  opts: boolean;
  instant: boolean;
  split: boolean;
};
const QUERY = 'count(kube_node_info)';
const NODES = '5';
const START: S = { menu: false, ds: 'Mimir', code: false, q: '', ran: 0, opts: false, instant: false, split: false };
const END: S = { menu: false, ds: 'Prometheus', code: true, q: QUERY, ran: 2, opts: true, instant: true, split: true };
const SOURCES = ['Loki', 'Mimir', 'Mimir (tenant prom)', 'Prometheus', 'Tempo'];

const script = async (a: Act<S>) => {
  await a.wait(500);
  await a.click('ds');
  a.put({ menu: true });
  await a.wait(500);
  await a.move('ds-prometheus');
  await a.wait(250);
  await a.click('ds-prometheus');
  a.put({ menu: false, ds: 'Prometheus' });
  await a.wait(400);
  await a.click('code');
  a.put({ code: true });
  await a.wait(300);
  await a.click('editor');
  await a.type('q', QUERY, { interval: 45 });
  await a.wait(300);
  await a.click({ at: 'run', x: 0.85, y: 0.75 });
  a.put({ ran: 1 });
  await a.wait(1300);
  await a.click('options');
  a.put({ opts: true });
  await a.wait(500);
  await a.click('instant');
  a.put({ instant: true });
  await a.wait(300);
  await a.click({ at: 'run', x: 0.85, y: 0.75 });
  a.put({ ran: 2 });
  await a.wait(1200);
  await a.click('split');
  a.put({ split: true });
};

function Pane({ s, second }: { s: S; second?: boolean }) {
  const ds = second ? 'Mimir (tenant prom)' : s.ds;
  const t = (name: string) => (second ? undefined : name);
  const q = second ? QUERY : s.q;
  const ran = second ? 2 : s.ran;
  return (
    <div className="ex-pane-in">
      <div className="ex-row">
        <span className="gf-field ex-ds" data-target={t('ds')} data-cursor={t('pointer')} data-open={(!second && s.menu) || undefined}>
          {ds}
          <Caret />
        </span>
      </div>
      <div className="ex-query">
        <div className="ex-qhead">
          <span className="gf-label">A</span>
          <span className="gf-dim ex-qds">({ds})</span>
          <span className="gf-radio">
            <span data-on={(!second && !s.code) || undefined}>Builder</span>
            <span data-target={t('code')} data-cursor={t('pointer')} data-on={(second || s.code) || undefined}>
              Code
            </span>
          </span>
        </div>
        <div className="gf-field gf-code ex-editor" data-target={t('editor')} data-cursor={t('ibeam')}>
          {q ? <span>{q}</span> : <span className="gf-dim">Enter a PromQL query</span>}
        </div>
        <div className="ex-opts">
          <span className="ex-opts-head" data-target={t('options')} data-cursor={t('pointer')}>
            <svg className="ex-chev" data-open={(second || s.opts) || undefined} viewBox="0 0 12 12" aria-hidden="true">
              <path d="M4.5 3l3 3-3 3" />
            </svg>
            Options
          </span>
          <span className="ex-swap" data-open={(second || s.opts) || undefined}>
            <span className="gf-dim ex-sum">Type: {second || s.instant ? 'Instant' : 'Both'}</span>
            <span className="ex-type">
              <span className="gf-dim">Type</span>
              <span className="gf-radio">
                <span data-on={(!second && !s.instant) || undefined}>Both</span>
                <span>Range</span>
                <span data-target={t('instant')} data-cursor={t('pointer')} data-on={(second || s.instant) || undefined}>
                  Instant
                </span>
              </span>
            </span>
          </span>
        </div>
      </div>
      <div className="ex-collapse" data-open={ran === 1 || undefined}>
        <div className="ex-collapse-in ex-graph">
          <div className="gf-label">Graph</div>
          <svg className="gf-chart" viewBox="0 0 240 44" preserveAspectRatio="none" aria-hidden="true">
            <line className="grid" x1={0} x2={240} y1={10} y2={10} vectorEffect="non-scaling-stroke" />
            <line className="grid" x1={0} x2={240} y1={38} y2={38} vectorEffect="non-scaling-stroke" />
            <path className="line" d="M0 10 L240 10" stroke="#73bf69" vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="gf-dim ex-axis">{NODES}</span>
        </div>
      </div>
      <div className="ex-raw" data-in={ran > 0 || undefined} key={ran}>
        <div className="gf-label">Raw</div>
        <div className="ex-table">
          <span className="gf-dim">Value</span>
          <span className="ex-val">{NODES}</span>
        </div>
      </div>
    </div>
  );
}

export default function Explore({ playing, still }: SceneProps) {
  const { animate, settled } = useSceneMotion(playing, still);
  return (
    <div className="ex gf" data-scene-animate={String(animate)} data-scene-settled={String(settled)}>
      <Stage<S>
        width={620}
        height={420}
        compact={{ below: 480, width: 358, height: 430 }}
        initial={START}
        poster={settled ? END : START}
        script={animate ? script : undefined}
        cursor={{ at: { wide: { x: 470, y: 390 }, compact: { x: 280, y: 400 } } }}
        play="once"
        fill
      >
        {(s) => (
          <div className="gf-panel ex-page" data-split={s.split || undefined}>
            <div className="ex-bar">
              <span className="ex-title">Explore</span>
              <span className="gf-btn" data-target="split" data-cursor="pointer" data-on={s.split || undefined}>
                Split
              </span>
              <span className="gf-btn ex-time">Last 1 hour</span>
              <span className="gf-btn gf-btn-primary" data-target="run" data-cursor="pointer">
                Run query
              </span>
            </div>
            <div className="ex-panes">
              <div className="ex-pane">
                <Pane s={s} />
              </div>
              <div className="ex-pane ex-pane-2" aria-hidden={!s.split || undefined}>
                <Pane s={s} second />
              </div>
            </div>
            <div className="gf-pop gf-menu ex-menu" data-open={s.menu || undefined}>
              {SOURCES.map((n) => (
                <div key={n} data-target={n === 'Prometheus' ? 'ds-prometheus' : undefined} data-cursor="pointer" data-on={n === s.ds || undefined}>
                  {n}
                </div>
              ))}
            </div>
          </div>
        )}
      </Stage>
    </div>
  );
}

