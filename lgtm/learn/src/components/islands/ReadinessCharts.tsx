// The overview's readiness charts, drawn as SVG with attributes only (the CSP allows no inline
// styles): a gauge for the exam, a radar of its domains, the exam's domain weights, a small bar per
// table cell and a shaped mark per verdict. Colours come from classes in src/styles/home.css.
import { READY_BANDS, READY_MIN, type Band, type DomainReadiness } from '../../lib/quiz.ts';

const r1 = (n: number) => Math.round(n * 10) / 10;

/** A 270-degree ring: the overall share right, with ticks at the close and ready marks. */
export function Gauge({ value }: { value: number | null }) {
  const c = 80;
  const r = 62;
  const at = (v: number, rad: number) => {
    const a = ((135 + 270 * v) * Math.PI) / 180;
    return [r1(c + rad * Math.cos(a)), r1(c + rad * Math.sin(a))];
  };
  const ticks = Array.from({ length: 11 }, (_, i) => i / 10);
  return (
    <svg className="rc-gauge" viewBox="0 0 160 160" aria-hidden="true">
      <circle className="rc-orbit" cx={c} cy={c} r={r - 14} strokeDasharray="2 6 18 6" />
      <circle className="rc-track" cx={c} cy={c} r={r} pathLength={100} strokeDasharray="75 100" transform={`rotate(135 ${c} ${c})`} />
      {value !== null && value > 0 && (
        <circle className="rc-arc" cx={c} cy={c} r={r} pathLength={100} strokeDasharray={`${r1(75 * value)} 100`} transform={`rotate(135 ${c} ${c})`} />
      )}
      {ticks.map((t) => {
        const [x1, y1] = at(t, r + 9);
        const [x2, y2] = at(t, Math.round(t * 10) % 5 === 0 ? r + 17 : r + 13);
        return <line key={t} className="rc-tick" x1={x1} y1={y1} x2={x2} y2={y2} />;
      })}
      {[READY_BANDS.close, READY_BANDS.ready].map((t) => {
        const [x1, y1] = at(t, r - 10);
        const [x2, y2] = at(t, r + 18);
        return <line key={t} className="rc-mark" x1={x1} y1={y1} x2={x2} y2={y2} />;
      })}
      <text className="rc-gauge-value" x={c} y={c + 8} textAnchor="middle">
        {value === null ? '--' : `${Math.round(value * 100)}`}
      </text>
      <text className="rc-gauge-unit" x={c} y={c + 30} textAnchor="middle">
        {value === null ? 'not measured' : '% right'}
      </text>
      <text className="rc-gauge-unit" x={at(0, r)[0] + 6} y={150} textAnchor="middle">
        0
      </text>
      <text className="rc-gauge-unit" x={at(1, r)[0] - 6} y={150} textAnchor="middle">
        100
      </text>
    </svg>
  );
}

/** One axis per domain: the share right (filled) and how far each domain is to a verdict (dashed). */
export function Radar({ domains }: { domains: DomainReadiness[] }) {
  const c = 110;
  const R = 78;
  const n = Math.max(3, domains.length);
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return [r1(c + R * v * Math.cos(a)), r1(c + R * v * Math.sin(a))];
  };
  const poly = (vals: number[]) => vals.map((v, i) => pt(i, v).join(',')).join(' ');
  const acc = domains.map((d) => (d.met ? d.acc : 0));
  const reach = domains.map((d) => Math.min(1, d.met / READY_MIN));
  return (
    <svg className="rc-radar" viewBox="0 0 220 220" aria-hidden="true">
      {[0.25, 0.5, 0.75, 1].map((v) => (
        <polygon key={v} className="rc-ring" points={poly(domains.map(() => v))} />
      ))}
      <polygon className="rc-ring rc-ring-mark" points={poly(domains.map(() => READY_BANDS.ready))} />
      {domains.map((d, i) => {
        const [x, y] = pt(i, 1);
        return <line key={d.domain} className="rc-spoke" x1={c} y1={c} x2={x} y2={y} />;
      })}
      <line className="rc-beam" x1={c} y1={c} x2={c} y2={c - R} />
      <polygon className="rc-reach" points={poly(reach)} />
      <polygon className="rc-acc" points={poly(acc)} />
      {domains.map((d, i) => {
        const [x, y] = pt(i, acc[i]);
        return <rect key={d.domain} className="rc-dot" x={x - 3} y={y - 3} width={6} height={6} transform={`rotate(45 ${x} ${y})`} />;
      })}
      {domains.map((d, i) => {
        const [x, y] = pt(i, 1.2);
        return (
          <text key={d.domain} className="rc-axis" x={x} y={y + 4} textAnchor="middle">
            {d.domain}
          </text>
        );
      })}
    </svg>
  );
}

/** The exam's own split: one segment per domain, as wide as its weight. */
export function Blueprint({ weights }: { weights: Readonly<Record<string, number>> }) {
  const entries = Object.entries(weights);
  const sum = entries.reduce((n, [, w]) => n + w, 0);
  const W = 320;
  let x = 0;
  return (
    <svg className="rc-blueprint" viewBox={`0 0 ${W} 30`} aria-hidden="true">
      {entries.map(([d, w], i) => {
        const width = (W * w) / sum;
        const seg = (
          <g key={d}>
            <rect className={i % 2 ? 'rc-seg rc-seg-alt' : 'rc-seg'} x={r1(x + 1)} y={2} width={r1(width - 2)} height={26} />
            <text className="rc-seg-text" x={r1(x + width / 2)} y={19.5} textAnchor="middle">
              {width >= 56 ? `${d} ${Math.round((100 * w) / sum)}%` : d}
            </text>
          </g>
        );
        x += width;
        return seg;
      })}
    </svg>
  );
}

/** A thin bar from 0 to 1, optionally with the close and ready marks. */
export function CellBar({ value, marks = false }: { value: number; marks?: boolean }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <svg className="rc-bar" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true">
      <rect className="rc-bar-track" x={0} y={2} width={100} height={4} />
      {v > 0 && <rect className="rc-bar-fill" x={0} y={1} width={r1(v * 100)} height={6} />}
      {marks && [READY_BANDS.close, READY_BANDS.ready].map((t) => <line key={t} className="rc-bar-mark" x1={t * 100} y1={0} x2={t * 100} y2={8} />)}
    </svg>
  );
}

/** A shaped verdict: a lit octagon when ready, half lit when close, crossed when not yet, dashed before. */
export function VerdictMark({ band }: { band: Band }) {
  const oct = '5,1 11,1 15,5 15,11 11,15 5,15 1,11 1,5';
  return (
    <svg className="rc-verdict" viewBox="0 0 16 16" data-band={band} aria-hidden="true">
      <polygon className="rc-verdict-shape" points={oct} />
      {band === 'close' && <polygon className="rc-verdict-half" points="1,8 15,8 15,11 11,15 5,15 1,11" />}
      {band === 'not-yet' && <path className="rc-verdict-x" d="M5.5 5.5l5 5M10.5 5.5l-5 5" />}
    </svg>
  );
}
