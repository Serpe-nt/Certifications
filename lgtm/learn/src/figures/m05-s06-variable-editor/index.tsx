// m05 step 6, variables: the variable editor builds the query variable service (Mimir, Label values,
// label service_name on traces_spanmetrics_calls_total), its preview fills with the shop's services,
// then the dashboard Shop service (m05) shows the Service drop-down, and picking payment redraws the
// panels Requests per second and Error share. Names are the step's own.
import type { SceneProps } from '../registry.ts';
import { Stage } from '../kit/stage.tsx';
import type { Act } from '../kit/act.ts';
import { useSceneMotion } from '../motion.ts';
import { Caret, linePath } from '../gf.tsx';
import '../grafana.css';
import './variable-editor.css';

type S = { name: string; menu: string; qt: boolean; label: boolean; metric: boolean; ran: boolean; dash: boolean; svc: string };
const START: S = { name: '', menu: '', qt: false, label: false, metric: false, ran: false, dash: false, svc: 'checkout' };
const END: S = { name: 'service', menu: '', qt: true, label: true, metric: true, ran: true, dash: true, svc: 'payment' };

const MENUS: Record<string, { items: string[]; pick: string }> = {
  qt: { items: ['Label names', 'Label values', 'Metrics', 'Query result', 'Series query'], pick: 'Label values' },
  label: { items: ['service', 'service_name', 'span_kind', 'span_name', 'status_code'], pick: 'service_name' },
  metric: { items: ['traces_spanmetrics_calls_total', 'traces_spanmetrics_latency_bucket', 'traces_spanmetrics_latency_count'], pick: 'traces_spanmetrics_calls_total' },
  svc: { items: ['cart', 'checkout', 'frontend', 'payment', 'product-catalog'], pick: 'payment' },
};
const PREVIEW = ['ad', 'beacon', 'cart', 'checkout'];
const LINES: Record<string, { rate: number[]; err: number[] }> = {
  checkout: { rate: [0.031, 0.034, 0.029, 0.033, 0.036, 0.03, 0.028, 0.032, 0.035, 0.031, 0.027, 0.033], err: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  payment: { rate: [0.026, 0.022, 0.028, 0.025, 0.021, 0.027, 0.03, 0.024, 0.022, 0.029, 0.025, 0.023], err: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
};

const pickFrom = async (a: Act<S>, field: string, menu: string, patch: Partial<S>) => {
  await a.click(field);
  a.put({ menu });
  await a.wait(450);
  const item = `${menu}-pick`;
  await a.move(item);
  await a.wait(200);
  await a.click(item);
  a.put({ menu: '', ...patch });
  await a.wait(400);
};

const script = async (a: Act<S>) => {
  await a.wait(500);
  await a.click('name');
  await a.type('name', 'service', { interval: 70 });
  await a.wait(300);
  await pickFrom(a, 'qt', 'qt', { qt: true });
  await pickFrom(a, 'label', 'label', { label: true });
  await pickFrom(a, 'metric', 'metric', { metric: true });
  await a.click('run');
  a.put({ ran: true });
  await a.wait(1300);
  await a.click('apply');
  a.put({ dash: true });
  await a.wait(1100);
  await pickFrom(a, 'svc', 'svc', { svc: 'payment' });
};

function Select({ id, value, open, s, dim }: { id: string; value: string; open: boolean; s: S; dim?: boolean }) {
  const m = MENUS[id];
  return (
    <span className="ve-select">
      <span className="gf-field" data-target={id} data-cursor="pointer" data-open={open || undefined}>
        <span className={dim ? 'gf-dim ve-val' : 've-val'}>{value}</span>
        <Caret />
      </span>
      {m && (
        <span className="gf-pop gf-menu ve-menu" data-open={(s.menu === id) || undefined}>
          {m.items.map((it) => (
            <div key={it} data-target={it === m.pick ? `${id}-pick` : undefined} data-cursor="pointer">
              {it}
            </div>
          ))}
        </span>
      )}
    </span>
  );
}

export default function VariableEditor({ playing, still }: SceneProps) {
  const { animate, settled } = useSceneMotion(playing, still);
  return (
    <div className="ve gf" data-scene-animate={String(animate)} data-scene-settled={String(settled)}>
      <Stage<S>
        width={620}
        height={420}
        compact={{ below: 480, width: 358, height: 440 }}
        initial={START}
        poster={settled ? END : START}
        script={animate ? script : undefined}
        cursor={{ at: { wide: { x: 470, y: 390 }, compact: { x: 280, y: 410 } } }}
        play="once"
        fill
      >
        {(s) => (
          <div className="gf-panel ve-page">
            {/* The variable editor */}
            <div className="ve-screen ve-editor" data-gone={s.dash || undefined}>
              <div className="ve-head">
                <span className="ve-title">Query variable{s.name ? `: ${s.name}` : ''}</span>
                <span className="gf-btn gf-btn-primary" data-target="apply" data-cursor="pointer">
                  Apply
                </span>
              </div>
              <div className="ve-form">
                <span className="gf-label">Name</span>
                <span className="gf-field" data-target="name" data-cursor="ibeam">
                  {s.name || <span className="gf-dim">Variable name</span>}
                </span>
                <span className="gf-label">Data source</span>
                <Select id="ds" value="Mimir" open={false} s={s} />
                <span className="gf-label">Query type</span>
                <Select id="qt" value={s.qt ? 'Label values' : 'Classic query'} open={s.menu === 'qt'} s={s} dim={!s.qt} />
                <span className="ve-more" data-open={s.qt || undefined}>
                  <span className="ve-more-in">
                    <span className="gf-label">Label</span>
                    <Select id="label" value={s.label ? 'service_name' : 'Select label'} open={s.menu === 'label'} s={s} dim={!s.label} />
                    <span className="gf-label">Metric</span>
                    <Select id="metric" value={s.metric ? 'traces_spanmetrics_calls_total' : 'Select metric'} open={s.menu === 'metric'} s={s} dim={!s.metric} />
                  </span>
                </span>
                <span className="gf-label">Sort</span>
                <Select id="sort" value="Alphabetical (asc)" open={false} s={s} />
              </div>
              <div className="ve-run">
                <span className="gf-btn" data-target="run" data-cursor="pointer">
                  Run query
                </span>
              </div>
              <div className="ve-preview" data-in={s.ran || undefined}>
                <div className="gf-label">Preview of values</div>
                <div className="ve-chips">
                  {PREVIEW.map((v, i) => (
                    <span key={v} className="ve-chip" style={{ transitionDelay: s.ran ? `${i * 90}ms` : '0ms' }}>
                      {v}
                    </span>
                  ))}
                  <span className="gf-link ve-chip-more" style={{ transitionDelay: s.ran ? '400ms' : '0ms' }}>
                    Show more
                  </span>
                </div>
              </div>
            </div>

            {/* The dashboard the variable drives */}
            <div className="ve-screen ve-dash" data-in={s.dash || undefined}>
              <div className="ve-head">
                <span className="ve-title">Shop service (m05)</span>
              </div>
              <div className="ve-vars">
                <span className="ve-var-label">Service</span>
                <Select id="svc" value={s.svc} open={s.menu === 'svc'} s={s} />
              </div>
              <div className="ve-panels">
                {[
                  { title: 'Requests per second', data: LINES[s.svc].rate, max: 0.045, c: '#73bf69' },
                  { title: 'Error share', data: LINES[s.svc].err, max: 1, c: '#f2495c' },
                ].map((p) => (
                  <div key={p.title} className="ve-panel">
                    <div className="gf-label ve-ptitle">
                      {p.title}: <span key={s.svc} className="ve-svc">{s.svc}</span>
                    </div>
                    <svg className="gf-chart" viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden="true">
                      <line className="grid" x1={0} x2={200} y1={10} y2={10} vectorEffect="non-scaling-stroke" />
                      <line className="grid" x1={0} x2={200} y1={35} y2={35} vectorEffect="non-scaling-stroke" />
                      <line className="grid" x1={0} x2={200} y1={59} y2={59} vectorEffect="non-scaling-stroke" />
                      <path key={s.svc} className="line ve-line" d={linePath(p.data, 200, 58, 0, p.max)} stroke={p.c} vectorEffect="non-scaling-stroke" />
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Stage>
    </div>
  );
}
