import { useEffect, useRef, useState, type ComponentType } from 'react';
import { scenes, type SceneProps } from '../../figures/registry.ts';

interface Props {
  id: string;
  alt: string;
}

/** Loads a registered scene lazily, pauses it off screen, and shows a still under reduced motion. */
export default function FigureIsland({ id, alt }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [Scene, setScene] = useState<ComponentType<SceneProps> | null>(null);
  const [visible, setVisible] = useState(false);
  const [still, setStill] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);

  useEffect(() => {
    let alive = true;
    scenes[id]?.().then((m) => alive && setScene(() => m.default));
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotion = () => setStill(mq.matches);
    onMotion();
    mq.addEventListener('change', onMotion);
    const onVis = () => setPageVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVis);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.1 });
    if (ref.current) io.observe(ref.current);
    return () => {
      mq.removeEventListener('change', onMotion);
      document.removeEventListener('visibilitychange', onVis);
      io.disconnect();
    };
  }, []);

  const playing = visible && pageVisible && !still;
  return (
    <div ref={ref} role="img" aria-label={alt} data-figure-scene={id} data-playing={String(playing)} data-still={String(still)}>
      {Scene ? <Scene playing={playing} still={still} /> : <p className="m-0 p-4 text-sm text-ink-3">Loading the figure.</p>}
    </div>
  );
}
