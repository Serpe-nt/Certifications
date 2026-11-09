// Test scene for the figure registry. It only exists in the sample build.
import type { SceneProps } from '../../../../src/figures/registry.ts';

export default function TestScene({ playing, still }: SceneProps) {
  return (
    <div className="p-4" data-test-scene data-scene-playing={String(playing)} data-scene-still={String(still)}>
      <div className="h-2 rounded-sm bg-line">
        <div className={`h-2 w-1/4 rounded-sm bg-accent ${playing ? 'animate-pulse' : ''}`} />
      </div>
      <p className="m-0 mt-2 text-sm text-ink-2">{still ? 'Still frame' : playing ? 'Playing' : 'Paused'}</p>
    </div>
  );
}
