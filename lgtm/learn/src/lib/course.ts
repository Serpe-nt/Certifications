// The course as the pages see it: modules in order, each with its steps in order, and the
// address of every page. Which card is on screen lives in the URL, never in saved state.
import { getCollection, type CollectionEntry } from 'astro:content';
import { href } from './links.ts';

export interface StepLink {
  id: string;
  title: string;
  href: string;
  minutes: number;
  tags: string[];
}

export interface ModuleOutline {
  id: string;
  title: string;
  goal: string;
  quiz: boolean;
  exams: ('otca' | 'pca')[];
  href: string;
  endHref: string;
  steps: StepLink[];
}

export { href };

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
      exams: m.data.exams,
      href: href.module(m.data.id),
      endHref: href.end(m.data.id),
      steps: steps
        .filter((s) => s.data.id.startsWith(`${m.data.id}-`))
        .map((s) => ({ id: s.data.id, title: s.data.title, href: href.step(s.data.id), minutes: s.data.minutes, tags: s.data.tags })),
    })),
  };
}
