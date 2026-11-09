// The course as the pages see it: modules in order, each with its steps in order, and the
// address of every page. Which card is on screen lives in the URL, never in saved state.
import { getCollection, type CollectionEntry } from 'astro:content';

export interface StepLink {
  id: string;
  title: string;
  href: string;
  minutes: number;
}

export interface ModuleOutline {
  id: string;
  title: string;
  goal: string;
  quiz: boolean;
  href: string;
  endHref: string;
  steps: StepLink[];
}

const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;

export const href = {
  home: base,
  settings: `${base}settings/`,
  module: (m: string) => `${base}m/${m}/`,
  step: (stepId: string) => {
    const [m, s] = stepId.split('-');
    return `${base}m/${m}/${s}/`;
  },
  end: (m: string) => `${base}m/${m}/done/`,
};

export async function loadCourse(): Promise<{ modules: ModuleOutline[]; steps: CollectionEntry<'steps'>[] }> {
  const modules = (await getCollection('modules')).sort((a, b) => a.data.order - b.data.order || a.data.id.localeCompare(b.data.id));
  const steps = (await getCollection('steps')).sort((a, b) => a.data.order - b.data.order || a.data.id.localeCompare(b.data.id));
  return {
    steps,
    modules: modules.map((m) => ({
      id: m.data.id,
      title: m.data.title,
      goal: m.data.goal,
      quiz: m.data.quiz,
      href: href.module(m.data.id),
      endHref: href.end(m.data.id),
      steps: steps
        .filter((s) => s.data.id.startsWith(`${m.data.id}-`))
        .map((s) => ({ id: s.data.id, title: s.data.title, href: href.step(s.data.id), minutes: s.data.minutes })),
    })),
  };
}
