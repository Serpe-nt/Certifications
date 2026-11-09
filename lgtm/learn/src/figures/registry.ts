// Figure registry. A lesson asks for a figure with <Figure id="m05-s03-explore" alt="..." brief="...">.
// When a scene exists at src/figures/<id>/index.tsx it is shown as a lazy React island;
// otherwise the card shows a labelled placeholder with the alt text (src/components/mdx/Figure.astro).
//
// A scene is a React component that takes SceneProps:
// - playing: false while the figure is off screen or the tab is hidden; stop every animation then.
// - still: true under prefers-reduced-motion; show one meaningful frame, with no motion at all.
// Scenes are built later with the Stageshow skill (card FG). They use the site's tokens, not their own colours.
import type { ComponentType } from 'react';

export interface SceneProps {
  playing: boolean;
  still: boolean;
}

type SceneModule = { default: ComponentType<SceneProps> };
type Loader = () => Promise<SceneModule>;

const own = import.meta.glob<SceneModule>('./*/index.tsx');
// The sample build also registers the test scene in tests/fixtures/figures; a production build never does.
const sample: Record<string, Loader> = import.meta.env.LGTM_SAMPLE ? import.meta.glob<SceneModule>('/tests/fixtures/figures/*/index.tsx') : {};

export const scenes: Record<string, Loader> = Object.create(null);
for (const [file, load] of Object.entries({ ...own, ...sample })) {
  const id = /\/([a-z0-9-]+)\/index\.tsx$/.exec(file)?.[1];
  if (id) scenes[id] = load;
}

export function hasScene(id: string): boolean {
  return id in scenes;
}
