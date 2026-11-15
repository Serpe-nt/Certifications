// Test harness for the six lesson scenes. It only exists in the sample build, whose fixture content
// cannot ask for the real figure ids: it shows every scene of src/figures, passing the island's props on.
import type { SceneProps } from '../../../../src/figures/registry.ts';
import Waterfall from '../../../../src/figures/m02-s04-waterfall/index.tsx';
import ThreeHops from '../../../../src/figures/m02-s06-three-hops/index.tsx';
import SeriesMultiply from '../../../../src/figures/m02-s10-series-multiply/index.tsx';
import Explore from '../../../../src/figures/m05-s02-explore/index.tsx';
import PanelEditor from '../../../../src/figures/m05-s04-panel-editor/index.tsx';
import VariableEditor from '../../../../src/figures/m05-s06-variable-editor/index.tsx';

const SCENES = {
  'm02-s04-waterfall': Waterfall,
  'm02-s06-three-hops': ThreeHops,
  'm02-s10-series-multiply': SeriesMultiply,
  'm05-s02-explore': Explore,
  'm05-s04-panel-editor': PanelEditor,
  'm05-s06-variable-editor': VariableEditor,
};

export default function AllScenes(props: SceneProps) {
  return (
    // Three to a row, so the whole figure is short enough to count as on screen in a small window.
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
      {Object.entries(SCENES).map(([id, Scene]) => (
        <div key={id} data-test-lesson-scene={id}>
          <Scene {...props} />
        </div>
      ))}
    </div>
  );
}
