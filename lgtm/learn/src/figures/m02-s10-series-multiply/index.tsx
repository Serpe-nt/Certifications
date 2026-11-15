// m02 step 10, cardinality: one box per series of the request counter. method (4 values) splits one
// box into four, status_code (5 values) splits them into twenty, and user_id floods the frame while the
// memory gauge turns red. The counts are the step's own (4, 4 times 5 = 20); user_id has no ceiling.
import { useEffect, useState, type CSSProperties } from 'react';
import type { SceneProps } from '../registry.ts';
import { Stage } from '../kit/stage.tsx';
import type { Act } from '../kit/act.ts';
import { useSceneMotion } from '../motion.ts';
import '../grafana.css';
import './series-multiply.css';

type S = { phase: number };
const START: S = { phase: 0 };
const END: S = { phase: 3 };

const METHODS = ['GET', 'POST', 'PUT', 'DELETE'];
const LABELS = [
  { name: 'method', note: '× 4' },
  { name: 'status_code', note: '× 5' },
  { name: 'user_id', note: '× users' },
];
const SERIES = ['1', '4', '20', '20 × users'];
// The gauge's fill (share of the arc) and colour at each phase.
const GAUGE = [
  { f: 0.08, c: '#73bf69' },
  { f: 0.14, c: '#73bf69' },
  { f: 0.3, c: '#73bf69' },
  { f: 1, c: '#f2495c' },
];

const script = async (a: Act<S>) => {
  await a.wait(700);
  for (const p of [1, 2, 3]) {
    a.put({ phase: p });
    await a.wait(p === 3 ? 2600 : 1900);
  }
};

/** Where box i (method m = i / 5, status s = i % 5) sits in each phase, inside an area w by h. */
function boxAt(i: number, phase: number, w: number, h: number) {
  const g = 6;
  const m = Math.floor(i / 5);
  const s = i % 5;
  if (phase === 0) {
    const z = Math.min(w, h) * 0.42;
    return { x: (w - z) / 2, y: (h - z) / 2, z };
  }
  const col = (w - 3 * g) / 4;
  if (phase === 1) {
    const z = Math.min(col, h * 0.6);
    return { x: m * (col + g) + (col - z) / 2, y: (h - z) / 2, z };
  }
  const z = Math.min(col, (h - 4 * g) / 5);
  return { x: m * (col + g) + (col - z) / 2, y: s * (z + g) + (h - 5 * z - 4 * g) / 2, z };
}

// The flood of user_id series: small cells over the whole left of the frame, arriving outward from the grid.
const CELL = 12;
function flood(w: number, h: number, cx: number, cy: number) {
  const cells: { x: number; y: number; d: number }[] = [];
  for (let y = 0; y < h; y += CELL + 2) {
    for (let x = 0; x < w; x += CELL + 2) {
      const dist = Math.hypot(x - cx, y - cy);
      const jitter = ((x * 7 + y * 13) % 17) * 18;
      cells.push({ x, y, d: Math.round(dist * 5 + jitter) });
    }
  }
  return cells;
}

export default function SeriesMultiply({ playing, still }: SceneProps) {
  const { animate, settled } = useSceneMotion(playing, still);
  return (
    <div className="sm gf" data-scene-animate={String(animate)} data-scene-settled={String(settled)}>
      <Stage<S>
        width={600}
        height={320}
        compact={{ below: 480, width: 358, height: 400 }}
        initial={START}
        poster={settled ? END : START}
        script={animate ? script : undefined}
        play="once"
        fill
      >
        {(s, _rect, layout) => {
          const compact = layout === 'compact';
          const area = compact ? { w: 302, h: 196 } : { w: 352, h: 208 };
          const fw = compact ? 358 : 406;
          const fh = compact ? 400 : 320;
          const fy = compact ? 160 : 76;
          const g = GAUGE[s.phase];
          return (
            <>
              <div className="gf-panel sm-main">
                <div className="sm-title">Series of the request counter</div>
                {compact && (
                  <div className="sm-inline">
                    <Count text={SERIES[s.phase]} animate={animate} bad={s.phase === 3} />
                    <div className="sm-bar">
                      <span className="gf-dim">Memory</span>
                      <span className="sm-bar-track">
                        <span style={{ width: `${g.f * 100}%`, background: g.c }} />
                      </span>
                    </div>
                  </div>
                )}
                <div className="sm-labels">
                  {LABELS.map((l, i) => (
                    <span key={l.name} className="sm-chip" data-in={s.phase > i || undefined} data-bad={i === 2 || undefined}>
                      <span className="gf-code">{l.name}</span>
                      <span className="gf-dim">{l.note}</span>
                    </span>
                  ))}
                </div>
                <div className="sm-area" data-flooded={s.phase === 3 || undefined} style={{ width: area.w, height: area.h }}>
                  {METHODS.map((m, i) => {
                    const b = boxAt(i * 5, 2, area.w, area.h);
                    const b1 = boxAt(i * 5, 1, area.w, area.h);
                    const top = s.phase === 2 ? b.y - 18 : b1.y - 18;
                    return (
                      <span key={m} className="sm-head gf-code" data-in={s.phase === 1 || s.phase === 2 || undefined} style={{ left: b.x, width: b.z, top } as CSSProperties}>
                        {m}
                      </span>
                    );
                  })}
                  {Array.from({ length: 20 }, (_, i) => {
                    const b = boxAt(i, Math.min(s.phase, 2), area.w, area.h);
                    return <span key={i} className="sm-box" style={{ left: b.x, top: b.y, width: b.z, height: b.z, '--d': `${(i % 5) * 60}ms` } as CSSProperties} />;
                  })}
                </div>
              </div>

              <div className="sm-flood" data-in={s.phase === 3 || undefined} style={{ top: fy, width: fw, height: fh - fy } as CSSProperties} aria-hidden="true">
                {flood(fw, fh - fy, fw / 2, compact ? 150 : 170).map((c, i) => (
                  <span key={i} style={{ left: c.x, top: c.y, '--d': `${c.d}ms` } as CSSProperties} />
                ))}
              </div>

              {!compact && (
                <div className="gf-panel sm-stat">
                  <div className="sm-title">Series</div>
                  <Count text={SERIES[s.phase]} animate={animate} bad={s.phase === 3} />
                </div>
              )}

              {!compact && (
              <div className="gf-panel sm-gauge">
                <div className="sm-title">Memory</div>
                <svg viewBox="0 0 120 80" aria-hidden="true">
                  <path className="sm-arc-bg" d="M14 70 A48 48 0 1 1 106 70" pathLength={1} />
                  <path className="sm-arc" d="M14 70 A48 48 0 1 1 106 70" pathLength={1} style={{ strokeDasharray: `${g.f} 1`, stroke: g.c } as CSSProperties} />
                </svg>
                <div className="sm-gauge-note" data-bad={s.phase === 3 || undefined}>
                  Metrics store
                </div>
              </div>
              )}
            </>
          );
        }}
      </Stage>
    </div>
  );
}

/** The series count. A number counts up to the next one; the last value, a formula, fades in. */
function Count({ text, animate, bad }: { text: string; animate: boolean; bad: boolean }) {
  const target = Number(text);
  const [shown, setShown] = useState(text);
  useEffect(() => {
    if (!animate || Number.isNaN(target)) {
      setShown(text);
      return;
    }
    const from = Number(shown) || 0;
    const t0 = performance.now();
    let raf = 0;
    const tick = () => {
      const t = Math.min(1, (performance.now() - t0) / 700);
      setShown(String(Math.round(from + (target - from) * (1 - (1 - t) ** 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, animate]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="sm-count" data-bad={bad || undefined} key={Number.isNaN(target) ? 'formula' : 'number'}>
      {shown}
    </div>
  );
}
