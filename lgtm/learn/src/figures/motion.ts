// Whether a scene may animate, and whether it should show its finished frame.
// A scene animates only while its figure is on screen (playing), the device does not ask for reduced
// motion (still), and Effects is not switched off in Settings (data-motion="off" on <html>, see DESIGN.md, Motion).
import { useEffect, useState } from 'react';

function effectsOff() {
  return typeof document !== 'undefined' && document.documentElement.getAttribute('data-motion') === 'off';
}

export function useSceneMotion(playing: boolean, still: boolean): { animate: boolean; settled: boolean } {
  const [off, setOff] = useState(effectsOff);
  useEffect(() => {
    const mo = new MutationObserver(() => setOff(effectsOff()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
    setOff(effectsOff());
    return () => mo.disconnect();
  }, []);
  const settled = still || off;
  return { animate: playing && !settled, settled };
}
